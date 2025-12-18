const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const OpenAI = require('openai');
const axios = require('axios');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed'), false);
    }
  }
});

// Database connection (CockroachDB)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Wolfram Alpha configuration
const WOLFRAM_APP_ID = process.env.WOLFRAM_APP_ID;

// Database initialization
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS problems (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) REFERENCES users(email),
        problem_text TEXT NOT NULL,
        user_solution TEXT,
        correct_solution TEXT,
        wolfram_solution TEXT,
        error_type VARCHAR(100),
        error_description TEXT,
        confidence_score DECIMAL(3,2),
        topic VARCHAR(100),
        difficulty_level VARCHAR(20),
        time_spent INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_analytics (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) REFERENCES users(email),
        topic VARCHAR(100),
        total_problems INTEGER DEFAULT 0,
        correct_problems INTEGER DEFAULT 0,
        conceptual_errors INTEGER DEFAULT 0,
        computational_errors INTEGER DEFAULT 0,
        avg_confidence DECIMAL(3,2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Helper function to query Wolfram Alpha
async function queryWolframAlpha(query) {
  try {
    const url = `http://api.wolframalpha.com/v2/query?input=${encodeURIComponent(query)}&format=plaintext&output=JSON&appid=${WOLFRAM_APP_ID}`;
    const response = await axios.get(url);
    
    if (response.data.queryresult && response.data.queryresult.pods) {
      const pods = response.data.queryresult.pods;
      const solutionPod = pods.find(pod => 
        pod.title.includes('Solution') || 
        pod.title.includes('Result') || 
        pod.title.includes('Answer')
      );
      
      if (solutionPod && solutionPod.subpods) {
        return solutionPod.subpods[0].plaintext;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Wolfram Alpha API error:', error);
    return null;
  }
}

// Helper function to parse and separate problem from solution
async function parseHomeworkContent(rawText) {
  try {
    const parsePrompt = `
    You are an AI that helps separate math homework content into distinct parts.
    
    Given this text from a student's homework image: "${rawText}"
    
    Please identify and separate:
    1. The original problem/question being asked
    2. The student's solution/work (if any)
    3. Any given information or constraints
    
    Look for common indicators like:
    - Problem indicators: "Problem:", "Question:", numbers like "1.", "2.", etc.
    - Solution indicators: "Solution:", "Answer:", "Work:", or mathematical work/calculations
    - Given information: "Given:", "Let", initial conditions
    
    Respond in JSON format:
    {
      "originalProblem": "The math problem or question being asked",
      "studentSolution": "The student's work/solution attempt (if present)",
      "givenInformation": "Any given information or constraints",
      "confidence": 0.95,
      "notes": "Any additional observations about the content structure"
    }
    
    If you cannot clearly distinguish between problem and solution, put everything in originalProblem and leave studentSolution empty.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: parsePrompt }],
      temperature: 0.2
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Content parsing error:', error);
    return {
      originalProblem: rawText,
      studentSolution: '',
      givenInformation: '',
      confidence: 0,
      notes: 'Failed to parse content structure'
    };
  }
}

// Helper function to analyze problem with ChatGPT
async function analyzeWithChatGPT(originalProblem, studentSolution, correctSolution, givenInfo) {
  try {
    const prompt = `
    You are an expert math tutor analyzing a student's homework submission.

    ORIGINAL PROBLEM: ${originalProblem}
    GIVEN INFORMATION: ${givenInfo || 'None specified'}
    STUDENT'S SOLUTION: ${studentSolution || 'No solution provided - student may need help getting started'}
    CORRECT SOLUTION: ${correctSolution || 'Not available from Wolfram Alpha'}

    Please provide a comprehensive analysis:

    1. If no student solution is provided, focus on helping them get started
    2. If a solution is provided, analyze it for errors and correctness
    3. Identify the specific mathematical concepts involved
    4. Determine if errors are conceptual (misunderstanding) or computational (calculation mistakes)

    Respond in JSON format:
    {
      "errorType": "conceptual|computational|no_error|no_solution_provided",
      "errorDescription": "Detailed explanation of what went wrong or what help is needed",
      "topic": "algebra|calculus|geometry|trigonometry|statistics|etc",
      "subtopic": "specific area like 'quadratic equations', 'derivatives', etc",
      "difficultyLevel": "beginner|intermediate|advanced",
      "confidenceScore": 0.95,
      "explanation": "Clear, helpful explanation for the student",
      "hints": "Specific hints to help the student improve",
      "correctApproach": "Brief description of the correct method/approach"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('ChatGPT analysis error:', error);
    return {
      errorType: 'unknown',
      errorDescription: 'Analysis failed',
      topic: 'unknown',
      subtopic: 'unknown',
      difficultyLevel: 'unknown',
      confidenceScore: 0,
      explanation: 'Unable to analyze at this time',
      hints: 'Please try uploading the image again',
      correctApproach: 'Analysis unavailable'
    };
  }
}

// Routes

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!', 
    timestamp: new Date().toISOString(),
    env: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasWolfram: !!process.env.WOLFRAM_APP_ID,
      hasDatabase: !!process.env.DATABASE_URL
    }
  });
});

// File upload endpoint for PDFs and images
app.post('/api/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let extractedText = '';
    const fileType = req.file.mimetype;

    if (fileType === 'application/pdf') {
      // Extract text from PDF
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
    } else if (fileType.startsWith('image/')) {
      // For images, we'll let the frontend handle OCR with Tesseract.js
      // This endpoint just confirms the upload was successful
      extractedText = 'Image uploaded successfully - process with OCR on frontend';
    }

    res.json({
      success: true,
      fileType: fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      extractedText: extractedText,
      message: fileType === 'application/pdf' ? 'PDF text extracted successfully' : 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

// Analyze problem endpoint
app.post('/api/analyze-problem', async (req, res) => {
  try {
    const { userEmail, problemText } = req.body;

    console.log('=== ANALYZE PROBLEM REQUEST ===');
    console.log('User Email:', userEmail);
    console.log('Problem Text:', problemText);
    console.log('Request Body:', req.body);

    // Step 1: Parse the content to separate problem from solution
    const parsedContent = await parseHomeworkContent(problemText);
    console.log('Parsed content:', parsedContent);

    // Step 2: Get Wolfram Alpha solution for the original problem
    const wolframSolution = await queryWolframAlpha(parsedContent.originalProblem);
    console.log('Wolfram solution:', wolframSolution);

    // Step 3: Analyze with ChatGPT using separated components
    const analysis = await analyzeWithChatGPT(
      parsedContent.originalProblem,
      parsedContent.studentSolution,
      wolframSolution,
      parsedContent.givenInformation
    );
    console.log('Analysis result:', analysis);

    // Step 4: Save to database with enhanced structure (skip if DB not available)
    let recordId = null;
    try {
      const result = await pool.query(`
        INSERT INTO problems (user_email, problem_text, user_solution, wolfram_solution, 
                             error_type, error_description, confidence_score, topic, difficulty_level)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        userEmail, 
        parsedContent.originalProblem, 
        parsedContent.studentSolution, 
        wolframSolution,
        analysis.errorType, 
        analysis.errorDescription, 
        analysis.confidenceScore,
        analysis.topic, 
        analysis.difficultyLevel
      ]);
      recordId = result.rows[0].id;

      // Step 5: Update user analytics
      await updateUserAnalytics(userEmail, analysis);
    } catch (dbError) {
      console.warn('Database save failed, continuing without saving:', dbError.message);
    }

    // Step 6: Return comprehensive response
    res.json({
      id: recordId,
      parsedContent,
      wolframSolution,
      analysis,
      success: true,
      note: recordId ? 'Analysis saved to database' : 'Analysis completed (database unavailable)'
    });

  } catch (error) {
    console.error('=== PROBLEM ANALYSIS ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to analyze problem',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get user dashboard data
app.get('/api/dashboard/:email', async (req, res) => {
  try {
    const { email } = req.params;

    // Get recent problems
    const problemsResult = await pool.query(`
      SELECT * FROM problems 
      WHERE user_email = $1 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [email]);

    // Get analytics
    const analyticsResult = await pool.query(`
      SELECT * FROM user_analytics 
      WHERE user_email = $1
    `, [email]);

    // Calculate overall stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_problems,
        SUM(CASE WHEN error_type = 'conceptual' THEN 1 ELSE 0 END) as conceptual_errors,
        SUM(CASE WHEN error_type = 'computational' THEN 1 ELSE 0 END) as computational_errors,
        SUM(CASE WHEN error_type = 'no_error' THEN 1 ELSE 0 END) as correct_solutions,
        AVG(confidence_score) as avg_confidence
      FROM problems 
      WHERE user_email = $1
    `, [email]);

    res.json({
      problems: problemsResult.rows,
      analytics: analyticsResult.rows,
      stats: statsResult.rows[0]
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Update user analytics
async function updateUserAnalytics(userEmail, analysis) {
  try {
    const { topic, errorType } = analysis;
    
    await pool.query(`
      INSERT INTO user_analytics (user_email, topic, total_problems, conceptual_errors, computational_errors)
      VALUES ($1, $2, 1, $3, $4)
      ON CONFLICT (user_email, topic) 
      DO UPDATE SET 
        total_problems = user_analytics.total_problems + 1,
        conceptual_errors = user_analytics.conceptual_errors + $3,
        computational_errors = user_analytics.computational_errors + $4,
        last_updated = NOW()
    `, [
      userEmail, 
      topic, 
      errorType === 'conceptual' ? 1 : 0,
      errorType === 'computational' ? 1 : 0
    ]);
  } catch (error) {
    console.error('Analytics update error:', error);
  }
}

// Legacy endpoints for compatibility
app.get('/userFeedback/:email/', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query(`
      SELECT 
        problem_text as problemstatement,
        error_type as errortype,
        created_at as timerecorded
      FROM problems 
      WHERE user_email = $1 
      ORDER BY created_at DESC
    `, [email]);

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN error_type = 'conceptual' THEN 1 ELSE 0 END) as conceptual,
        SUM(CASE WHEN error_type = 'computational' THEN 1 ELSE 0 END) as computational
      FROM problems 
      WHERE user_email = $1
    `, [email]);

    const total = parseInt(stats.rows[0].total) || 0;
    const conceptual = parseInt(stats.rows[0].conceptual) || 0;
    const computational = parseInt(stats.rows[0].computational) || 0;

    res.json({
      results: result.rows,
      numConceptual: conceptual,
      numComputational: computational,
      percentConceptual: total > 0 ? (conceptual / total) * 100 : 0,
      percentComputational: total > 0 ? (computational / total) * 100 : 0
    });
  } catch (error) {
    console.error('Legacy endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch user feedback' });
  }
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});
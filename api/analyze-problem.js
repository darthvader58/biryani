const OpenAI = require('openai');
const { Pool } = require('pg');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Save problem to database
async function saveProblemToDatabase(userEmail, analysis) {
  try {
    if (!userEmail || !pool) return null;
    
    const result = await pool.query(`
      INSERT INTO problems (user_email, problem_text, user_solution, error_type, 
                           error_description, confidence_score, topic, difficulty_level, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id
    `, [
      userEmail,
      analysis.originalProblem,
      analysis.studentSolution,
      analysis.errorType,
      analysis.explanation,
      analysis.confidenceScore,
      analysis.topic,
      analysis.difficultyLevel
    ]);
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Database save error:', error);
    return null;
  }
}

// Enhanced analysis function
async function analyzeWithChatGPT(problemText) {
  try {
    const prompt = `Analyze this math problem and solution: ${problemText}. 
    
    Determine:
    1. What is the original problem?
    2. What is the student's solution (if any)?
    3. Is there an error? If so, what type (conceptual, computational, or no error)?
    4. Provide helpful feedback.
    5. Rate your confidence in this analysis (0.0 to 1.0)
    
    Respond in JSON format:
    {
      "originalProblem": "the math problem",
      "studentSolution": "student's work",
      "errorType": "conceptual|computational|no_error|no_solution_provided",
      "explanation": "detailed explanation",
      "hints": "helpful hints",
      "confidenceScore": 0.95,
      "topic": "algebra|calculus|geometry|etc",
      "difficultyLevel": "beginner|intermediate|advanced"
    }`;
    
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4",
      temperature: 0.1
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    // Ensure confidence score is reasonable
    if (!result.confidenceScore || result.confidenceScore > 1) {
      result.confidenceScore = 0.75; // Default reasonable confidence
    }
    
    return result;
    
  } catch (error) {
    console.error('ChatGPT analysis error:', error);
    return {
      originalProblem: problemText,
      studentSolution: "",
      errorType: 'unknown',
      explanation: 'Unable to analyze at this time - please check your input and try again',
      hints: 'Make sure your problem is clearly written with both the question and your solution',
      confidenceScore: 0.1,
      topic: 'unknown',
      difficultyLevel: 'unknown'
    };
  }
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail, problemText } = req.body;

    if (!problemText) {
      return res.status(400).json({ error: 'Problem text is required' });
    }

    // Analyze with ChatGPT
    const analysis = await analyzeWithChatGPT(problemText);

    // Save to database
    const recordId = await saveProblemToDatabase(userEmail, analysis);

    // Return response in expected format
    const response = {
      success: true,
      id: recordId,
      parsedContent: {
        originalProblem: analysis.originalProblem,
        studentSolution: analysis.studentSolution,
        givenInformation: ""
      },
      wolframSolution: "Solution steps would appear here",
      analysis: {
        errorType: analysis.errorType,
        errorDescription: analysis.explanation,
        explanation: analysis.explanation,
        topic: analysis.topic || "algebra",
        difficultyLevel: analysis.difficultyLevel || "intermediate",
        confidenceScore: analysis.confidenceScore,
        hints: analysis.hints,
        correctApproach: "Follow step-by-step approach"
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze problem',
      details: error.message
    });
  }
};
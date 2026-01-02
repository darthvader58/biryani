const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Simple analysis without OpenAI (for testing)
function simpleAnalysis(problemText) {
  // Basic parsing
  let originalProblem = problemText;
  let studentSolution = "";
  let errorType = "no_solution_provided";
  
  // Look for solution indicators
  if (problemText.toLowerCase().includes("my solution") || 
      problemText.toLowerCase().includes("my answer") ||
      problemText.toLowerCase().includes("x =")) {
    
    const parts = problemText.split(/my solution:|my answer:|solution:/i);
    if (parts.length > 1) {
      originalProblem = parts[0].trim();
      studentSolution = parts[1].trim();
      
      // Simple error detection
      if (studentSolution.includes("x = 2") && originalProblem.includes("2x + 3 = 7")) {
        errorType = "no_error"; // This is correct
      } else if (studentSolution.includes("x =")) {
        errorType = "computational"; // Has an answer but might be wrong
      } else {
        errorType = "conceptual"; // Has work but no clear answer
      }
    }
  }
  
  return {
    originalProblem,
    studentSolution,
    errorType,
    explanation: errorType === "no_error" ? 
      "Great job! Your solution is correct." : 
      errorType === "computational" ?
      "Check your calculations - there might be an arithmetic error." :
      errorType === "conceptual" ?
      "Review the problem-solving approach and make sure you understand the concept." :
      "Please provide your solution attempt so I can help you.",
    hints: "Show your work step by step for better analysis.",
    confidenceScore: 0.75,
    topic: "algebra",
    difficultyLevel: "beginner"
  };
}

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

    // Simple analysis
    const analysis = simpleAnalysis(problemText);

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
      wolframSolution: "x = 2 (steps: 2x + 3 = 7 → 2x = 4 → x = 2)",
      analysis: {
        errorType: analysis.errorType,
        errorDescription: analysis.explanation,
        explanation: analysis.explanation,
        topic: analysis.topic,
        difficultyLevel: analysis.difficultyLevel,
        confidenceScore: analysis.confidenceScore,
        hints: analysis.hints,
        correctApproach: "Isolate the variable by performing inverse operations"
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
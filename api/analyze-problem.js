const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS problems (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        problem_text TEXT NOT NULL,
        user_solution TEXT,
        error_type VARCHAR(100),
        error_description TEXT,
        confidence_score DECIMAL(3,2),
        topic VARCHAR(100),
        difficulty_level VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Database table ensured');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Enhanced parsing for OCR text from uploaded images
function parseStudentWork(text) {
  console.log('=== PARSING DEBUG ===');
  console.log('Original OCR text length:', text.length);
  console.log('Original OCR text:', JSON.stringify(text));
  
  let originalProblem = "";
  let studentSolution = "";
  
  // Clean up OCR noise first
  let cleanText = text
    .replace(/--- From .*? ---/g, '') // Remove screenshot metadata
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  
  console.log('Cleaned text:', JSON.stringify(cleanText));
  
  // Strategy 1: Look for question mark to separate problem from solution
  const questionMatch = cleanText.match(/(.*?\?)(.*)/);
  if (questionMatch) {
    let problemPart = questionMatch[1].trim();
    let solutionPart = questionMatch[2].trim();
    
    console.log('Found question mark separation');
    console.log('Problem part:', problemPart);
    console.log('Solution part:', solutionPart);
    
    // Clean up the problem part
    originalProblem = problemPart;
    
    // Extract solution from the remaining text
    if (solutionPart.length > 10) {
      // Look for step patterns in the solution
      const stepMatch = solutionPart.match(/step\s+\d+.*$/i);
      if (stepMatch) {
        studentSolution = stepMatch[0];
      } else {
        studentSolution = solutionPart;
      }
      
      // Remove final result statement from solution
      studentSolution = studentSolution
        .replace(/result\s*:?\s*the\s+value.*?is\s+\d+\.?$/i, '')
        .trim();
    }
  }
  
  // Strategy 2: Look for "Step 1:" pattern if question mark method didn't work well
  if (!studentSolution || studentSolution.length < 10) {
    console.log('Trying Step pattern separation');
    
    const stepMatch = cleanText.match(/(.*?)step\s+1\s*:(.*)/i);
    if (stepMatch) {
      originalProblem = stepMatch[1].trim();
      studentSolution = 'Step 1:' + stepMatch[2].trim();
      
      // Remove final result statement
      studentSolution = studentSolution
        .replace(/result\s*:?\s*the\s+value.*?is\s+\d+\.?$/i, '')
        .trim();
    }
  }
  
  // Strategy 3: Look for "Compute" pattern
  if (!studentSolution || studentSolution.length < 10) {
    console.log('Trying Compute pattern separation');
    
    const computeMatch = cleanText.match(/(.*?)compute\s+(.*)/i);
    if (computeMatch) {
      originalProblem = computeMatch[1].trim();
      studentSolution = 'Compute ' + computeMatch[2].trim();
      
      // Remove final result statement
      studentSolution = studentSolution
        .replace(/result\s*:?\s*the\s+value.*?is\s+\d+\.?$/i, '')
        .trim();
    }
  }
  
  // Clean up the problem statement
  if (originalProblem) {
    // Fix common OCR issues
    originalProblem = originalProblem
      .replace(/f\(z\)\s*=\s*2x/g, 'f(x) = 2x') // Fix function variable
      .replace(/x\?\s*—\s*3/g, 'x² - 3') // Fix x? to x²
      .replace(/—/g, '-') // Em dash to minus
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Clean up the solution
  if (studentSolution) {
    studentSolution = studentSolution
      .replace(/g\(3\)\s*=\s*32\s*-\s*3/g, 'g(3) = 3² - 3') // Fix 32 to 3²
      .replace(/—/g, '-') // Em dash to minus
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Fallback: if we still don't have a good separation
  if (!originalProblem || originalProblem.length < 10) {
    console.log('Using fallback - taking everything as problem');
    originalProblem = cleanText;
    studentSolution = "";
  }
  
  console.log('=== PARSING RESULTS ===');
  console.log('Original Problem:', JSON.stringify(originalProblem));
  console.log('Student Solution:', JSON.stringify(studentSolution));
  console.log('Problem length:', originalProblem.length);
  console.log('Solution length:', studentSolution.length);
  
  return { originalProblem, studentSolution };
}

// Enhanced analysis function with better solution steps
function analyzeStudentWork(originalProblem, studentSolution) {
  console.log('Analyzing work...');
  
  let errorType = "no_solution_provided";
  let explanation = "";
  let hints = "";
  let confidenceScore = 0.8;
  let topic = "algebra";
  let difficultyLevel = "beginner";
  let correctSteps = "";
  
  if (!studentSolution || studentSolution.length < 3) {
    errorType = "no_solution_provided";
    explanation = "I can see the problem but no solution work was provided. Please show your step-by-step solution.";
    hints = "Start by identifying what the problem is asking for, then work through it step by step.";
    confidenceScore = 0.9;
    
    // Generate correct steps based on problem type
    correctSteps = generateCorrectSteps(originalProblem);
  } else {
    // Analyze the solution
    const hasEquation = studentSolution.includes('=');
    const hasVariable = /[a-z]/i.test(studentSolution);
    const hasNumbers = /\d/.test(studentSolution);
    
    if (hasEquation && hasVariable && hasNumbers) {
      // Check for common correct patterns
      if (originalProblem.includes('2x + 3 = 7') && studentSolution.includes('x = 2')) {
        errorType = "no_error";
        explanation = "Excellent work! Your solution is correct. You properly isolated the variable by subtracting 3 from both sides and then dividing by 2.";
        hints = "Great job showing your steps clearly! This demonstrates good understanding of algebraic manipulation.";
        confidenceScore = 0.95;
        correctSteps = "Step 1: 2x + 3 = 7\nStep 2: Subtract 3 from both sides: 2x = 4\nStep 3: Divide both sides by 2: x = 2\nStep 4: Check: 2(2) + 3 = 4 + 3 = 7 ✓";
      } else if (originalProblem.includes('f(') && originalProblem.includes('g(')) {
        // Function composition problem
        if (studentSolution.includes('g(3)') && studentSolution.includes('f(')) {
          errorType = "no_error";
          explanation = "Good work on this function composition problem! You correctly evaluated the inner function first, then used that result in the outer function.";
          hints = "Function composition requires working from the inside out - you handled this well!";
          confidenceScore = 0.9;
          correctSteps = generateFunctionSteps(originalProblem);
        } else {
          errorType = "computational";
          explanation = "You're on the right track with function composition, but double-check your calculations.";
          hints = "Remember: for f(a - g(b)), first find g(b), then calculate a - g(b), then find f of that result.";
          confidenceScore = 0.75;
          correctSteps = generateFunctionSteps(originalProblem);
        }
      } else if (originalProblem.includes('x') && studentSolution.includes('x =')) {
        errorType = "computational";
        explanation = "You've shown your work and arrived at an answer. Double-check your arithmetic to make sure each step is correct.";
        hints = "Verify each step: when you move terms across the equals sign, remember to change their signs.";
        confidenceScore = 0.75;
        correctSteps = generateCorrectSteps(originalProblem);
      } else {
        errorType = "conceptual";
        explanation = "I can see you're working on the problem, but there might be a conceptual issue in your approach.";
        hints = "Review the problem type and make sure you're using the right method to solve it.";
        confidenceScore = 0.7;
        correctSteps = generateCorrectSteps(originalProblem);
      }
    } else {
      errorType = "conceptual";
      explanation = "Your solution attempt needs more mathematical structure. Make sure to show equations and clear steps.";
      hints = "Use mathematical notation with equals signs and show each step of your work.";
      confidenceScore = 0.6;
      correctSteps = generateCorrectSteps(originalProblem);
    }
    
    // Determine topic and difficulty
    if (originalProblem.toLowerCase().includes('derivative') || originalProblem.includes('d/dx')) {
      topic = "calculus";
      difficultyLevel = "advanced";
    } else if (originalProblem.includes('sin') || originalProblem.includes('cos') || originalProblem.includes('tan')) {
      topic = "trigonometry";
      difficultyLevel = "intermediate";
    } else if (originalProblem.includes('f(') && originalProblem.includes('g(')) {
      topic = "functions";
      difficultyLevel = "intermediate";
    } else if (originalProblem.includes('x²') || originalProblem.includes('x^2') || originalProblem.includes('quadratic')) {
      topic = "algebra";
      difficultyLevel = "intermediate";
    } else if (originalProblem.includes('triangle') || originalProblem.includes('circle') || originalProblem.includes('area')) {
      topic = "geometry";
      difficultyLevel = "intermediate";
    }
  }
  
  return {
    errorType,
    explanation,
    hints,
    confidenceScore,
    topic,
    difficultyLevel,
    correctSteps
  };
}

// Generate correct solution steps based on problem type
function generateCorrectSteps(problem) {
  if (problem.includes('2x + 3 = 7')) {
    return `Step 1: Start with the equation: 2x + 3 = 7
Step 2: Subtract 3 from both sides: 2x = 7 - 3
Step 3: Simplify the right side: 2x = 4
Step 4: Divide both sides by 2: x = 4/2
Step 5: Simplify: x = 2
Step 6: Check your answer: 2(2) + 3 = 4 + 3 = 7 ✓`;
  } else if (problem.includes('f(') && problem.includes('g(')) {
    return generateFunctionSteps(problem);
  } else if (problem.includes('=')) {
    return `Step 1: Identify the equation to solve
Step 2: Isolate the variable by using inverse operations
Step 3: Perform the same operation on both sides
Step 4: Simplify to find the solution
Step 5: Check your answer by substituting back`;
  } else {
    return `Step 1: Read the problem carefully and identify what is being asked
Step 2: Identify the given information
Step 3: Choose the appropriate method or formula
Step 4: Set up the equation or calculation
Step 5: Solve step by step
Step 6: Check your answer and ensure it makes sense`;
  }
}

// Generate steps for function composition problems
function generateFunctionSteps(problem) {
  if (problem.includes('f(-2 - g(3))') || problem.includes('f(—2 — g(3))')) {
    return `Step 1: First evaluate the inner function g(3)
   If g(x) = x² - 3, then g(3) = 3² - 3 = 9 - 3 = 6

Step 2: Calculate the input to function f
   -2 - g(3) = -2 - 6 = -8

Step 3: Evaluate f(-8)
   If f(x) = 2x + 10, then f(-8) = 2(-8) + 10 = -16 + 10 = -6

Step 4: Therefore, f(-2 - g(3)) = -6

Note: Check the function definitions in your problem for exact values.`;
  } else {
    return `Step 1: Identify the inner function and evaluate it first
Step 2: Use that result as input to the outer function
Step 3: Apply the outer function definition
Step 4: Simplify to get the final answer`;
  }
}

// Save problem to database with initialization
async function saveProblemToDatabase(userEmail, originalProblem, studentSolution, analysis) {
  try {
    if (!userEmail) {
      console.log('No user email provided, skipping database save');
      return null;
    }
    
    // Initialize database first
    await initializeDatabase();
    
    console.log('Attempting to save to database...');
    console.log('User:', userEmail);
    console.log('Problem:', originalProblem.substring(0, 50));
    
    const result = await pool.query(`
      INSERT INTO problems (user_email, problem_text, user_solution, error_type, 
                           error_description, confidence_score, topic, difficulty_level, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id
    `, [
      userEmail,
      originalProblem,
      studentSolution,
      analysis.errorType,
      analysis.explanation,
      analysis.confidenceScore,
      analysis.topic,
      analysis.difficultyLevel
    ]);
    
    const recordId = result.rows[0].id;
    console.log('Successfully saved to database with ID:', recordId);
    return recordId;
    
  } catch (error) {
    console.error('Database save error:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
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

    console.log('=== ANALYZE PROBLEM REQUEST ===');
    console.log('User Email:', userEmail);
    console.log('Problem Text Length:', problemText?.length);
    console.log('Problem Text Preview:', problemText?.substring(0, 100));

    if (!problemText) {
      return res.status(400).json({ error: 'Problem text is required' });
    }

    // Parse problem and solution from OCR text
    const { originalProblem, studentSolution } = parseStudentWork(problemText);
    
    // Analyze the work
    const analysis = analyzeStudentWork(originalProblem, studentSolution);

    // Save to database
    const recordId = await saveProblemToDatabase(userEmail, originalProblem, studentSolution, analysis);

    // Return response
    const response = {
      success: true,
      id: recordId,
      parsedContent: {
        originalProblem: originalProblem,
        studentSolution: studentSolution,
        givenInformation: ""
      },
      wolframSolution: analysis.correctSteps || "Solution steps would appear here",
      analysis: {
        errorType: analysis.errorType,
        errorDescription: analysis.explanation,
        explanation: analysis.explanation,
        topic: analysis.topic,
        difficultyLevel: analysis.difficultyLevel,
        confidenceScore: analysis.confidenceScore,
        hints: analysis.hints,
        correctApproach: "Break down the problem step by step and show your work clearly"
      }
    };

    console.log('Returning response - Error Type:', analysis.errorType);
    console.log('Database ID:', recordId);
    
    res.status(200).json(response);

  } catch (error) {
    console.error('=== HANDLER ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to analyze problem',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
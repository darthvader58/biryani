// Debug endpoint to test parsing without saving to database
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

module.exports = async function handler(req, res) {
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
    const { problemText } = req.body;

    if (!problemText) {
      return res.status(400).json({ error: 'Problem text is required' });
    }

    // Parse the text
    const { originalProblem, studentSolution } = parseStudentWork(problemText);

    // Return detailed debug info
    res.status(200).json({
      success: true,
      debug: {
        inputText: problemText,
        inputLength: problemText.length,
        inputLines: problemText.split('\n'),
        parsedProblem: originalProblem,
        parsedSolution: studentSolution,
        problemLength: originalProblem.length,
        solutionLength: studentSolution.length
      }
    });

  } catch (error) {
    console.error('Debug parse error:', error);
    res.status(500).json({ 
      error: 'Failed to parse text',
      details: error.message
    });
  }
};
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, type } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    console.log('Extracting text with OpenAI Vision for type:', type);

    // Create appropriate prompt based on type
    let prompt;
    if (type === 'problem') {
      prompt = `Extract the mathematical problem statement from this image. Focus on:
- The main question being asked
- Any given information or constraints
- Mathematical expressions, equations, or formulas
- Ignore any solution work or answers

Return only the problem statement as clean, readable text. Use proper mathematical notation where possible (like x², √, ∫, etc.).`;
    } else if (type === 'solution') {
      prompt = `Extract the student's solution work from this image. Focus on:
- Step-by-step calculations
- Mathematical work and reasoning
- Equations and algebraic manipulations
- Final answers
- Ignore the original problem statement

Return the solution work as clean, readable text with clear steps. Use proper mathematical notation where possible.`;
    } else {
      // Combined (original behavior)
      prompt = `Extract all mathematical content from this image, including:
- The problem statement or question
- Any solution work or steps shown
- Mathematical expressions, equations, and formulas
- Preserve the structure and separate problem from solution if both are present

Return clean, readable text using proper mathematical notation where possible (like x², √, ∫, etc.).`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const extractedText = response.choices[0].message.content.trim();
    
    console.log('OpenAI Vision extracted text:', extractedText.substring(0, 100) + '...');

    res.status(200).json({
      success: true,
      extractedText: extractedText,
      type: type
    });

  } catch (error) {
    console.error('OpenAI Vision error:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 429) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again in a moment.'
      });
    } else if (error.status === 400) {
      res.status(400).json({
        success: false,
        error: 'Invalid image format or content.'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to extract text from image',
        details: error.message
      });
    }
  }
};
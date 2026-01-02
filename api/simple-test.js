export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { problemText } = req.body;
    
    res.status(200).json({
      success: true,
      message: 'Simple test working',
      receivedText: problemText,
      env: {
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasWolfram: !!process.env.WOLFRAM_APP_ID
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
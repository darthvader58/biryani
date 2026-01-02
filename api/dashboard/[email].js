const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get recent problems
    const problemsResult = await pool.query(`
      SELECT id, problem_text as problemstatement, user_solution, error_type as errortype, 
             confidence_score, topic, difficulty_level, created_at as timerecorded
      FROM problems 
      WHERE user_email = $1 
      ORDER BY created_at DESC 
      LIMIT 20
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

    const stats = statsResult.rows[0] || {
      total_problems: 0,
      conceptual_errors: 0,
      computational_errors: 0,
      correct_solutions: 0,
      avg_confidence: 0
    };

    res.status(200).json({
      problems: problemsResult.rows,
      analytics: [], // Can be enhanced later
      stats: {
        total_problems: parseInt(stats.total_problems) || 0,
        conceptual_errors: parseInt(stats.conceptual_errors) || 0,
        computational_errors: parseInt(stats.computational_errors) || 0,
        correct_solutions: parseInt(stats.correct_solutions) || 0,
        avg_confidence: parseFloat(stats.avg_confidence) || 0
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    
    // Fallback to empty data if database fails
    res.status(200).json({
      problems: [],
      analytics: [],
      stats: {
        total_problems: 0,
        conceptual_errors: 0,
        computational_errors: 0,
        correct_solutions: 0,
        avg_confidence: 0
      }
    });
  }
};
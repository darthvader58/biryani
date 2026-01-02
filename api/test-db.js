const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('Testing database connection...');
    console.log('Has DATABASE_URL:', !!process.env.DATABASE_URL);
    
    // Test connection
    const client = await pool.connect();
    console.log('Connected to database');
    
    // Test table creation
    await client.query(`
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
    console.log('Table created/verified');
    
    // Test insert
    const result = await client.query(`
      INSERT INTO problems (user_email, problem_text, user_solution, error_type, 
                           error_description, confidence_score, topic, difficulty_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      'test@example.com',
      'Test problem',
      'Test solution',
      'no_error',
      'Test description',
      0.95,
      'algebra',
      'beginner'
    ]);
    
    const insertedId = result.rows[0].id;
    console.log('Test record inserted with ID:', insertedId);
    
    // Test select
    const selectResult = await client.query('SELECT COUNT(*) as count FROM problems WHERE user_email = $1', ['test@example.com']);
    const count = selectResult.rows[0].count;
    
    client.release();
    
    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      insertedId: insertedId,
      totalRecords: count,
      hasEnvVar: !!process.env.DATABASE_URL
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      hasEnvVar: !!process.env.DATABASE_URL
    });
  }
};
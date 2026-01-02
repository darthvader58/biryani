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
    const client = await pool.connect();
    
    // Create users table first
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Drop and recreate problems table without foreign key constraint
    await client.query(`DROP TABLE IF EXISTS problems`);
    
    await client.query(`
      CREATE TABLE problems (
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
    
    console.log('Tables recreated successfully');
    
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
    
    client.release();
    
    res.status(200).json({
      success: true,
      message: 'Database fixed and test record inserted',
      insertedId: insertedId
    });
    
  } catch (error) {
    console.error('Database fix error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
};
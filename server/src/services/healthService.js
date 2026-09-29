import pool from '../config/database.js';

export async function getHealthStatus() {
  let dbStatus = 'ok';
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  return {
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  };
}
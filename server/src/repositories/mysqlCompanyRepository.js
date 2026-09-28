import pool from '../config/database.js';

export async function findAll() {
  const [rows] = await pool.execute(`
    SELECT id, name
    FROM companies
    ORDER BY name ASC
  `);

  return rows;
}

export async function findByName(name) {
  const [rows] = await pool.execute(
    `SELECT id, name
     FROM companies
     WHERE name = ?
     LIMIT 1`,
    [name]
  );

  return rows[0] || null;
}

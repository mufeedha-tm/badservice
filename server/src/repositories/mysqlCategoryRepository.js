import pool from '../config/database.js';

export async function findAll() {
  const [rows] = await pool.execute(`
    SELECT name
    FROM categories
    ORDER BY name ASC
  `);

  return rows.map((row) => row.name);
}

export async function findByName(name) {
  const [rows] = await pool.execute(
    `SELECT id
     FROM categories
     WHERE name = ?
     LIMIT 1`,
    [name]
  );

  return rows[0] || null;
}

import pool from '../config/database.js';

let categoriesCache = null;
let categoriesCacheTime = 0;
const CATEGORIES_CACHE_TTL = 300000; // 5 minutes

export async function findAll() {
  const now = Date.now();
  if (categoriesCache && now - categoriesCacheTime < CATEGORIES_CACHE_TTL) {
    return categoriesCache;
  }

  const [rows] = await pool.execute(`
    SELECT
      id,
      name,
      slug,
      parent_id AS parentId,
      status
    FROM categories
    WHERE status = 'ACTIVE'
    ORDER BY name ASC
  `);

  categoriesCache = rows;
  categoriesCacheTime = Date.now();
  return rows;
}

export async function findAllNames() {
  const [rows] = await pool.execute(`
    SELECT name
    FROM categories
    WHERE status = 'ACTIVE' AND parent_id IS NULL
    ORDER BY name ASC
  `);

  return rows.map((row) => row.name);
}

export async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT id, name, slug, parent_id AS parentId, status
     FROM categories
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findBySlug(slug) {
  const [rows] = await pool.execute(
    `SELECT id, name, slug, parent_id AS parentId, status
     FROM categories
     WHERE LOWER(slug) = LOWER(?) OR LOWER(id) = LOWER(?)
     LIMIT 1`,
    [slug.trim(), slug.trim()]
  );
  return rows[0] || null;
}

export async function findByName(name) {
  const trimmed = name.trim();
  const [rows] = await pool.execute(
    `SELECT id, name, slug, parent_id AS parentId, status
     FROM categories
     WHERE LOWER(name) = LOWER(?) OR LOWER(slug) = LOWER(?) OR LOWER(id) = LOWER(?)
     LIMIT 1`,
    [trimmed, trimmed, trimmed]
  );

  return rows[0] || null;
}

export async function findChildrenOf(parentId) {
  const [rows] = await pool.execute(
    `SELECT id, name, slug, parent_id AS parentId, status
     FROM categories
     WHERE parent_id = ? AND status = 'ACTIVE'
     ORDER BY name ASC`,
    [parentId]
  );
  return rows;
}

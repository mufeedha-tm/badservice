import pool from '../config/database.js';

let companiesCache = null;
let companiesCacheTime = 0;
const COMPANIES_CACHE_TTL = 120000; // 2 minutes

export function invalidateCompaniesCache() {
  companiesCache = null;
  companiesCacheTime = 0;
}

export async function findAll() {
  const now = Date.now();
  if (companiesCache && now - companiesCacheTime < COMPANIES_CACHE_TTL) {
    return companiesCache;
  }

  const [rows] = await pool.execute(`
    SELECT
      c.id,
      c.name,
      c.slug,
      c.category_id AS categoryId,
      c.status,
      cat.name AS categoryName
    FROM companies c
    LEFT JOIN categories cat ON cat.id = c.category_id
    WHERE c.status = 'ACTIVE'
    ORDER BY c.name ASC
  `);

  companiesCache = rows;
  companiesCacheTime = Date.now();
  return rows;
}

export async function findAllAdmin() {
  const [rows] = await pool.execute(`
    SELECT
      c.id,
      c.name,
      c.slug,
      c.category_id AS categoryId,
      c.status,
      cat.name AS categoryName,
      c.created_at AS createdAt
    FROM companies c
    LEFT JOIN categories cat ON cat.id = c.category_id
    ORDER BY c.name ASC
  `);

  return rows;
}

export async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT
      c.id,
      c.name,
      c.slug,
      c.category_id AS categoryId,
      c.status,
      cat.name AS categoryName
     FROM companies c
     LEFT JOIN categories cat ON cat.id = c.category_id
     WHERE c.id = ? OR c.slug = ?
     LIMIT 1`,
    [id, id]
  );

  return rows[0] || null;
}

export async function findByName(name) {
  const trimmed = name.trim();
  const [rows] = await pool.execute(
    `SELECT
      c.id,
      c.name,
      c.slug,
      c.category_id AS categoryId,
      c.status,
      cat.name AS categoryName
     FROM companies c
     LEFT JOIN categories cat ON cat.id = c.category_id
     WHERE LOWER(c.name) = LOWER(?) OR LOWER(c.slug) = LOWER(?) OR LOWER(c.id) = LOWER(?)
     LIMIT 1`,
    [trimmed, trimmed, trimmed]
  );

  return rows[0] || null;
}

export async function createCompany({ name, categoryId = null, status = 'ACTIVE' }) {
  const trimmed = name.trim();
  let baseSlug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!baseSlug) baseSlug = `company-${Date.now()}`;
  let slug = baseSlug;
  let attempt = 0;

  while (true) {
    try {
      await pool.execute(
        `INSERT INTO companies (id, name, slug, category_id, status)
         VALUES (?, ?, ?, ?, ?)`,
        [slug, trimmed, slug, categoryId, status]
      );
      return findById(slug);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const existing = await findByName(trimmed);
        if (existing) return existing;
        attempt += 1;
        slug = `${baseSlug}-${attempt}`;
      } else {
        throw err;
      }
    }
  }
}

export async function updateStatus(id, status) {
  await pool.execute(
    `UPDATE companies SET status = ? WHERE id = ?`,
    [status, id]
  );
  return findById(id);
}

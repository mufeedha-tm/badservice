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

const CATEGORY_ALIASES = {
  'mobiles & smartphones': 'mobiles',
  'mobile & smartphones': 'mobiles',
  'mobiles': 'mobiles',
  'mobile': 'mobiles',
  'smartphones': 'mobiles',
  'smartphone': 'mobiles',
  'phone': 'mobiles',
  'phones': 'mobiles',
  'computers & laptops': 'computers',
  'computer & laptops': 'computers',
  'computers': 'computers',
  'computer': 'computers',
  'laptops': 'laptops',
  'laptop': 'laptops',
  'tv & electronics': 'tv-electronics',
  'electronics': 'tv-electronics',
  'home & kitchen appliances': 'tv-electronics',
  'appliance repair & service': 'tv-electronics',
  'audio & accessories': 'tv-electronics',
  'other products': 'tv-electronics',
  'fashion & apparel': 'fashion',
  'fashion': 'fashion',
  'apparel': 'fashion',
  'vehicles & automotive': 'vehicles-automotive',
  'vehicle service & repair': 'vehicles-automotive',
  'cars': 'cars',
  'car': 'cars',
  'two wheeler': 'two-wheeler',
  'hospital & healthcare': 'hospital-healthcare',
  'hospitals': 'hospitals',
  'hospital': 'hospitals',
  'hotel, resort & stay': 'hotel-travel',
  'hotel & stays': 'hotel-travel',
  'hotel & travel': 'hotel-travel',
  'hotels': 'hotels',
  'hotel': 'hotels',
  'flights & trains': 'flights-trains',
  'flights': 'flights',
  'flight': 'flights',
  'restaurants & food': 'restaurants-food',
  'banking & finance': 'banking',
  'banking': 'banking',
  'telecom & internet': 'telecom',
  'telecom': 'telecom',
  'education & coaching': 'service-centers',
  'courier & delivery': 'service-centers',
  'other professional services': 'service-centers',
};

export async function findByName(name) {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim().toLowerCase();
  const aliasId = CATEGORY_ALIASES[trimmed] || trimmed;

  const [rows] = await pool.execute(
    `SELECT id, name, slug, parent_id AS parentId, status
     FROM categories
     WHERE LOWER(name) = ? OR LOWER(slug) = ? OR LOWER(id) = ?
     LIMIT 1`,
    [aliasId, aliasId, aliasId]
  );

  if (rows[0]) return rows[0];

  // Secondary match: check if original trimmed string matches
  const [origRows] = await pool.execute(
    `SELECT id, name, slug, parent_id AS parentId, status
     FROM categories
     WHERE LOWER(name) = ? OR LOWER(slug) = ? OR LOWER(id) = ?
     LIMIT 1`,
    [trimmed, trimmed, trimmed]
  );

  if (origRows[0]) return origRows[0];

  // Fallback: LIKE substring match
  const [likeRows] = await pool.execute(
    `SELECT id, name, slug, parent_id AS parentId, status
     FROM categories
     WHERE LOWER(name) LIKE ? OR ? LIKE CONCAT('%', LOWER(name), '%')
     ORDER BY parent_id IS NULL DESC
     LIMIT 1`,
    [`%${trimmed}%`, trimmed]
  );

  return likeRows[0] || null;
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

import pool from '../config/database.js';

function mapComplaint(row) {
  const createdAt = row.createdAt
    ? new Date(row.createdAt).toISOString()
    : null;
  const createdAtLabel = formatCreatedAtLabel(createdAt);

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    company: row.companyName,
    category: row.categoryName,
    subcategory: row.subcategory ?? '',
    location: row.location ?? '',
    createdAt,
    createdAtLabel,
    metadata: [
      row.companyName,
      row.categoryName,
      row.location,
      createdAtLabel,
    ].filter(Boolean),
    badge: row.badgeLabel
      ? {
          label: row.badgeLabel,
          tone: row.badgeTone ?? '',
        }
      : null,
    similarComplaintCount: row.similarComplaintCount || 0,
    actionLabel: row.actionLabel || 'View Details',
  };
}

function formatCreatedAtLabel(createdAt) {
  if (!createdAt) return '';

  const ageMinutes = Math.max(0, (Date.now() - Date.parse(createdAt)) / 60000);

  if (ageMinutes < 1) return 'Just now';
  if (ageMinutes < 60) {
    return formatRelativeTime(Math.floor(ageMinutes), 'minute');
  }

  const ageHours = ageMinutes / 60;
  if (ageHours < 24) {
    return formatRelativeTime(Math.floor(ageHours), 'hour');
  }

  const ageDays = ageHours / 24;
  return formatRelativeTime(Math.floor(ageDays), 'day');
}

function formatRelativeTime(value, unit) {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

const baseQuery = `
  SELECT
    c.id,
    c.title,
    c.description,
    c.subcategory,
    c.location,
    c.created_at AS createdAt,
    c.similar_complaint_count AS similarComplaintCount,
    c.badge_label AS badgeLabel,
    c.badge_tone AS badgeTone,
    c.action_label AS actionLabel,
    co.name AS companyName,
    ca.name AS categoryName
  FROM complaints c
  LEFT JOIN companies co ON co.id = c.company_id
  LEFT JOIN categories ca ON ca.id = c.category_id
`;

const ageSecondsSql = 'GREATEST(0, TIMESTAMPDIFF(SECOND, c.created_at, UTC_TIMESTAMP()))';
const relativeCreatedAtLabelSql = `
  CASE
    WHEN c.created_at IS NULL THEN NULL
    WHEN ${ageSecondsSql} < 60 THEN 'Just now'
    WHEN ${ageSecondsSql} < 3600 THEN CONCAT(
      FLOOR(${ageSecondsSql} / 60),
      IF(FLOOR(${ageSecondsSql} / 60) = 1, ' minute ago', ' minutes ago')
    )
    WHEN ${ageSecondsSql} < 86400 THEN CONCAT(
      FLOOR(${ageSecondsSql} / 3600),
      IF(FLOOR(${ageSecondsSql} / 3600) = 1, ' hour ago', ' hours ago')
    )
    ELSE CONCAT(
      FLOOR(${ageSecondsSql} / 86400),
      IF(FLOOR(${ageSecondsSql} / 86400) = 1, ' day ago', ' days ago')
    )
  END
`;

const searchableComplaintSql = `
  CONCAT_WS(
    ' ',
    NULLIF(c.title, ''),
    NULLIF(c.description, ''),
    NULLIF(co.name, ''),
    NULLIF(ca.name, ''),
    NULLIF(c.subcategory, ''),
    NULLIF(c.location, ''),
    ${relativeCreatedAtLabelSql},
    NULLIF(co.name, ''),
    NULLIF(ca.name, ''),
    NULLIF(c.location, ''),
    ${relativeCreatedAtLabelSql},
    NULLIF(c.badge_label, '')
  )
`;

export async function findAll() {
  const [rows] = await pool.execute(`
    ${baseQuery}
    ORDER BY c.created_at DESC
  `);

  return rows.map(mapComplaint);
}

export async function findById(id) {
  const [rows] = await pool.execute(`
    ${baseQuery}
    WHERE c.id = ?
    LIMIT 1
  `, [id]);

  return rows[0] ? mapComplaint(rows[0]) : null;
}

export async function search({
  q = '',
  category = '',
  company = '',
  period = '',
  sort = '',
} = {}) {
  const normalizedQuery = q.trim().toLocaleLowerCase();
  const normalizedCategory = category.trim().toLocaleLowerCase();
  const normalizedCompany = company.trim().toLocaleLowerCase();
  const conditions = [];
  const parameters = [];

  if (normalizedQuery) {
    conditions.push(`LOWER(${searchableComplaintSql}) LIKE ?`);
    parameters.push(`%${escapeLike(normalizedQuery)}%`);
  }

  if (normalizedCategory && normalizedCategory !== 'all categories') {
    conditions.push('LOWER(ca.name) = ?');
    parameters.push(normalizedCategory);
  }

  if (normalizedCompany) {
    conditions.push('LOWER(co.name) = ?');
    parameters.push(normalizedCompany);
  }

  if (period === 'today') {
    conditions.push('c.created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)');
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = sort === 'most-complained'
    ? 'c.similar_complaint_count DESC, c.created_at DESC'
    : 'c.created_at DESC';

  const [rows] = await pool.execute(`
    ${baseQuery}
    ${whereClause}
    ORDER BY ${orderBy}
  `, parameters);

  return rows.map(mapComplaint);
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function create(complaint) {
  const [companyRows] = await pool.execute(
    `SELECT id FROM companies WHERE name = ? LIMIT 1`,
    [complaint.companyId]
  );

  const [categoryRows] = await pool.execute(
    `SELECT id FROM categories WHERE name = ? LIMIT 1`,
    [complaint.categoryId]
  );

  if (!companyRows[0]) {
    throw new Error(`Company not found: ${complaint.companyId}`);
  }

  if (!categoryRows[0]) {
    throw new Error(`Category not found: ${complaint.categoryId}`);
  }

  await pool.execute(
    `
      INSERT INTO complaints
        (
          id,
          title,
          description,
          company_id,
          category_id,
          subcategory,
          location,
          created_at,
          similar_complaint_count,
          badge_label,
          badge_tone,
          action_label
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      complaint.id,
      complaint.title,
      complaint.description || null,
      companyRows[0].id,
      categoryRows[0].id,
      complaint.subcategory || null,
      complaint.location || null,
      complaint.createdAt,
      complaint.similarComplaintCount || 0,
      complaint.badge?.label || null,
      complaint.badge?.tone || null,
      complaint.actionLabel || 'View Details',
    ]
  );

  return findById(complaint.id);
}

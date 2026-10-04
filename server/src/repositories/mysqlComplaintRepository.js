import pool from '../config/database.js';
import * as companyRepository from './mysqlCompanyRepository.js';
import * as categoryRepository from './mysqlCategoryRepository.js';
import { ApiError } from '../utils/ApiError.js';

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
    companyId: row.companyId,
    category: row.categoryName,
    categoryId: row.categoryId,
    type: row.complaintType || 'Product',
    subcategory: row.subcategory ?? '',
    model: row.productModel ?? '',
    seller: row.sellerName ?? '',
    location: row.location ?? '',
    complainantName: row.complainantName ?? '',
    complainantCity: row.complainantCity ?? '',
    phoneVerified: Boolean(row.phoneVerified),
    productImageUrl: row.productImageUrl ?? null,
    productImageName: row.productImageName ?? null,
    billImageUrl: row.billImageUrl ?? null,
    billImageName: row.billImageName ?? null,
    productVideoUrl: row.productVideoUrl ?? null,
    productVideoName: row.productVideoName ?? null,
    proofUrl: row.proofUrl ?? null,
    proofName: row.proofName ?? null,
    userId: row.userId ?? null,
    status: row.status || 'PENDING',
    createdAt,
    createdAtLabel,
    metadata: [
      row.companyName,
      row.categoryName,
      row.subcategory,
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
    c.complaint_type AS complaintType,
    c.subcategory,
    c.product_model AS productModel,
    c.seller_name AS sellerName,
    c.location,
    c.complainant_name AS complainantName,
    c.complainant_city AS complainantCity,
    c.phone_verified AS phoneVerified,
    c.product_image_url AS productImageUrl,
    c.product_image_name AS productImageName,
    c.bill_image_url AS billImageUrl,
    c.bill_image_name AS billImageName,
    c.product_video_url AS productVideoUrl,
    c.product_video_name AS productVideoName,
    c.proof_url AS proofUrl,
    c.proof_name AS proofName,
    c.user_id AS userId,
    c.status AS status,
    c.created_at AS createdAt,
    c.similar_complaint_count AS similarComplaintCount,
    c.badge_label AS badgeLabel,
    c.badge_tone AS badgeTone,
    c.action_label AS actionLabel,
    c.company_id AS companyId,
    c.category_id AS categoryId,
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
    NULLIF(c.product_model, ''),
    NULLIF(c.seller_name, ''),
    NULLIF(c.location, ''),
    NULLIF(c.complainant_city, ''),
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

export async function findByUserId(userId) {
  const [rows] = await pool.execute(`
    ${baseQuery}
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `, [userId]);

  return rows.map(mapComplaint);
}

export async function search({
  q = '',
  category = '',
  subcategory = '',
  company = '',
  status = '',
  period = '',
  date = '',
  sort = '',
  page = 1,
  limit = 100,
} = {}) {
  const normalizedQuery = q.trim().toLocaleLowerCase();
  const normalizedCategory = category.trim().toLocaleLowerCase();
  const normalizedSubcategory = subcategory.trim().toLocaleLowerCase();
  const normalizedCompany = company.trim().toLocaleLowerCase();
  const normalizedStatus = status.trim().toUpperCase();
  const conditions = [];
  const parameters = [];

  if (normalizedQuery) {
    conditions.push(`LOWER(${searchableComplaintSql}) LIKE ?`);
    parameters.push(`%${escapeLike(normalizedQuery)}%`);
  }

  if (normalizedSubcategory) {
    conditions.push('LOWER(c.subcategory) = ?');
    parameters.push(normalizedSubcategory);
  }

  if (normalizedCategory && normalizedCategory !== 'all categories') {
    if (['two-wheeler', 'two wheeler'].includes(normalizedCategory)) {
      conditions.push('LOWER(c.subcategory) = "two wheeler"');
    } else if (['cars', 'car'].includes(normalizedCategory)) {
      conditions.push('LOWER(c.subcategory) = "cars"');
    } else if (['laptops', 'laptop'].includes(normalizedCategory)) {
      conditions.push('LOWER(c.subcategory) = "laptops"');
    } else if (['hospitals', 'hospital'].includes(normalizedCategory)) {
      conditions.push('LOWER(c.subcategory) = "healthcare"');
    } else if (['hotels', 'hotel'].includes(normalizedCategory)) {
      conditions.push('LOWER(c.subcategory) = "hotels"');
    } else if (['flights', 'flight'].includes(normalizedCategory)) {
      conditions.push('LOWER(c.subcategory) = "flights"');
    } else {
      conditions.push(`(
        LOWER(ca.name) = ?
        OR LOWER(ca.slug) = ?
        OR LOWER(ca.id) = ?
        OR ca.parent_id = ?
      )`);
      parameters.push(normalizedCategory, normalizedCategory, normalizedCategory, normalizedCategory);
    }
  }

  if (normalizedCompany) {
    conditions.push('(LOWER(co.name) = ? OR LOWER(co.slug) = ? OR LOWER(c.company_id) = ?)');
    parameters.push(normalizedCompany, normalizedCompany, normalizedCompany);
  }

  if (normalizedStatus) {
    conditions.push('c.status = ?');
    parameters.push(normalizedStatus);
  }

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    conditions.push('DATE(c.created_at) = ?');
    parameters.push(date.trim());
  } else if (period === 'today') {
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

export async function findRankings() {
  const [companyRows] = await pool.execute(`
    SELECT
      co.id,
      co.name,
      co.slug,
      ca.name AS categoryName,
      ca.slug AS categorySlug,
      COUNT(*) AS complaintCount,
      MAX(c.created_at) AS latestAt
    FROM complaints c
    INNER JOIN companies co ON co.id = c.company_id
    LEFT JOIN categories ca ON ca.id = c.category_id
    GROUP BY co.id, co.name, co.slug, ca.name, ca.slug
    ORDER BY complaintCount DESC, latestAt DESC
    LIMIT 12
  `);

  const [productRows] = await pool.execute(`
    SELECT
      COALESCE(NULLIF(c.product_model, ''), co.name) AS productName,
      co.name AS companyName,
      co.id AS companyId,
      ca.name AS categoryName,
      COUNT(*) AS complaintCount,
      MAX(c.created_at) AS latestAt
    FROM complaints c
    INNER JOIN companies co ON co.id = c.company_id
    LEFT JOIN categories ca ON ca.id = c.category_id
    GROUP BY COALESCE(NULLIF(c.product_model, ''), co.name), co.name, co.id, ca.name
    ORDER BY complaintCount DESC, latestAt DESC
    LIMIT 12
  `);

  const [categoryRows] = await pool.execute(`
    SELECT
      COALESCE(parent.id, ca.id) AS id,
      COALESCE(parent.name, ca.name) AS name,
      COALESCE(parent.slug, ca.slug) AS slug,
      COUNT(*) AS complaintCount
    FROM complaints c
    INNER JOIN categories ca ON ca.id = c.category_id
    LEFT JOIN categories parent ON parent.id = ca.parent_id
    GROUP BY COALESCE(parent.id, ca.id), COALESCE(parent.name, ca.name), COALESCE(parent.slug, ca.slug)
    ORDER BY complaintCount DESC, name ASC
  `);

  const companies = [];
  for (const row of companyRows) {
    const latest = await findLatestForCompany(row.id);
    companies.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.categoryName || '',
      categorySlug: row.categorySlug || '',
      count: Number(row.complaintCount) || 0,
      latestComplaint: latest,
    });
  }

  const products = [];
  for (const row of productRows) {
    const latest = await findLatestForProduct(row.companyId, row.productName);
    products.push({
      name: row.productName,
      company: row.companyName,
      companyId: row.companyId,
      category: row.categoryName || '',
      count: Number(row.complaintCount) || 0,
      latestComplaint: latest,
    });
  }

  return {
    companies,
    products,
    categories: categoryRows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      count: Number(row.complaintCount) || 0,
    })),
  };
}

async function findLatestForCompany(companyId) {
  const [rows] = await pool.execute(`
    ${baseQuery}
    WHERE c.company_id = ?
    ORDER BY c.created_at DESC
    LIMIT 1
  `, [companyId]);
  return rows[0] ? mapComplaint(rows[0]) : null;
}

async function findLatestForProduct(companyId, productName) {
  const [rows] = await pool.execute(`
    ${baseQuery}
    WHERE c.company_id = ? AND COALESCE(NULLIF(c.product_model, ''), co.name) = ?
    ORDER BY c.created_at DESC
    LIMIT 1
  `, [companyId, productName]);
  return rows[0] ? mapComplaint(rows[0]) : null;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function create(complaint) {
  // Validate company must already exist in database
  const company = await companyRepository.findByName(complaint.company);
  if (!company) {
    throw new ApiError(400, `Company '${complaint.company}' is not registered. Please request to add this company first.`, 'COMPANY_NOT_FOUND');
  }

  const category = await categoryRepository.findByName(complaint.category);
  if (!category) {
    throw new ApiError(400, `Category '${complaint.category}' is not valid.`, 'INVALID_CATEGORY');
  }

  const createdAt = complaint.createdAt ? new Date(complaint.createdAt) : new Date();

  await pool.execute(
    `
      INSERT INTO complaints
        (
          id,
          title,
          description,
          complaint_type,
          company_id,
          category_id,
          subcategory,
          product_model,
          seller_name,
          location,
          product_image_url,
          product_image_name,
          bill_image_url,
          bill_image_name,
          product_video_url,
          product_video_name,
          proof_url,
          proof_name,
          user_id,
          complainant_name,
          complainant_phone,
          complainant_email,
          complainant_city,
          complainant_address,
          phone_verified,
          otp_verified_at,
          status,
          created_at,
          similar_complaint_count,
          badge_label,
          badge_tone,
          action_label
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      complaint.id,
      complaint.title,
      complaint.description || null,
      complaint.type || 'Product',
      company.id,
      category.id,
      complaint.subcategory || null,
      complaint.model || null,
      complaint.seller || null,
      complaint.location || null,
      complaint.productImageUrl || null,
      complaint.productImageName || null,
      complaint.billImageUrl || null,
      complaint.billImageName || null,
      complaint.productVideoUrl || null,
      complaint.productVideoName || null,
      complaint.proofUrl || null,
      complaint.proofName || null,
      complaint.userId || null,
      complaint.complainantName || null,
      complaint.complainantPhone || null,
      complaint.complainantEmail || null,
      complaint.complainantCity || null,
      complaint.complainantAddress || null,
      complaint.phoneVerified ? 1 : 0,
      complaint.otpVerifiedAt ? new Date(complaint.otpVerifiedAt) : null,
      complaint.status || 'PENDING',
      createdAt,
      complaint.similarComplaintCount || 0,
      complaint.badge?.label || null,
      complaint.badge?.tone || null,
      complaint.actionLabel || 'View Details',
    ]
  );

  return findById(complaint.id);
}

export async function updateStatus(id, status) {
  const allowedStatuses = ['PENDING', 'UNDER_REVIEW', 'COMPANY_RESPONDED', 'RESOLVED', 'REJECTED'];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`, 'INVALID_STATUS');
  }

  const [result] = await pool.execute(
    `UPDATE complaints SET status = ? WHERE id = ?`,
    [status, id]
  );

  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Complaint not found.', 'COMPLAINT_NOT_FOUND');
  }

  return findById(id);
}

export async function remove(id) {
  const [result] = await pool.execute(
    `DELETE FROM complaints WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

export async function getStats() {
  const [[complaintsCount]] = await pool.execute(`SELECT COUNT(*) AS total FROM complaints`);
  const [[pendingComplaints]] = await pool.execute(`SELECT COUNT(*) AS pending FROM complaints WHERE status = 'PENDING'`);
  const [[resolvedComplaints]] = await pool.execute(`SELECT COUNT(*) AS resolved FROM complaints WHERE status = 'RESOLVED'`);
  const [[companiesCount]] = await pool.execute(`SELECT COUNT(*) AS total FROM companies WHERE status = 'ACTIVE'`);
  const [[usersCount]] = await pool.execute(`SELECT COUNT(*) AS total FROM users`);
  const [[pendingRequestsCount]] = await pool.execute(`SELECT COUNT(*) AS total FROM company_requests WHERE status = 'PENDING'`);

  return {
    totalComplaints: complaintsCount.total,
    pendingComplaints: pendingComplaints.pending,
    resolvedComplaints: resolvedComplaints.resolved,
    totalCompanies: companiesCount.total,
    totalUsers: usersCount.total,
    pendingCompanyRequests: pendingRequestsCount.total,
  };
}

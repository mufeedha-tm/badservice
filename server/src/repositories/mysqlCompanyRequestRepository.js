import { randomUUID } from 'node:crypto';
import pool from '../config/database.js';

export async function createRequest({ requestedByUserId, companyName, categoryId, description = null }) {
  const id = randomUUID();
  const createdAt = new Date();

  await pool.execute(
    `INSERT INTO company_requests
      (id, requested_by_user_id, company_name, category_id, description, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
    [id, requestedByUserId, companyName.trim(), categoryId, description ? description.trim() : null, createdAt]
  );

  return findById(id);
}

export async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT
      cr.id,
      cr.requested_by_user_id AS requestedByUserId,
      cr.company_name AS companyName,
      cr.category_id AS categoryId,
      cr.description,
      cr.status,
      cr.reviewed_by AS reviewedBy,
      cr.reviewed_at AS reviewedAt,
      cr.created_at AS createdAt,
      u.name AS requesterName,
      u.email AS requesterEmail,
      c.name AS categoryName,
      r.name AS reviewerName
     FROM company_requests cr
     LEFT JOIN users u ON u.id = cr.requested_by_user_id
     LEFT JOIN categories c ON c.id = cr.category_id
     LEFT JOIN users r ON r.id = cr.reviewed_by
     WHERE cr.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

export async function findPendingByName(companyName) {
  const [rows] = await pool.execute(
    `SELECT id, company_name AS companyName, status
     FROM company_requests
     WHERE LOWER(company_name) = LOWER(?) AND status = 'PENDING'
     LIMIT 1`,
    [companyName.trim()]
  );

  return rows[0] || null;
}

export async function findAll({ status = '' } = {}) {
  let query = `
    SELECT
      cr.id,
      cr.requested_by_user_id AS requestedByUserId,
      cr.company_name AS companyName,
      cr.category_id AS categoryId,
      cr.description,
      cr.status,
      cr.reviewed_by AS reviewedBy,
      cr.reviewed_at AS reviewedAt,
      cr.created_at AS createdAt,
      u.name AS requesterName,
      u.email AS requesterEmail,
      c.name AS categoryName
    FROM company_requests cr
    LEFT JOIN users u ON u.id = cr.requested_by_user_id
    LEFT JOIN categories c ON c.id = cr.category_id
  `;

  const params = [];
  if (status) {
    query += ` WHERE cr.status = ?`;
    params.push(status.toUpperCase());
  }

  query += ` ORDER BY cr.created_at DESC`;

  const [rows] = await pool.execute(query, params);
  return rows;
}

export async function updateRequestStatus(id, status, reviewerUserId) {
  await pool.execute(
    `UPDATE company_requests
     SET status = ?, reviewed_by = ?, reviewed_at = NOW()
     WHERE id = ?`,
    [status, reviewerUserId, id]
  );

  return findById(id);
}

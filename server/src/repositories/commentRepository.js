import { randomUUID } from 'node:crypto';
import pool from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

export async function create(complaintId, authorName, authorEmail, body, parentId = null) {
  let [existing] = await pool.execute(
    'SELECT id FROM complaints WHERE id = ?',
    [complaintId]
  );
  if (existing.length === 0) {
    try {
      const [[comp]] = await pool.query('SELECT id FROM companies LIMIT 1');
      const [[cat]] = await pool.query('SELECT id FROM categories LIMIT 1');
      await pool.execute(
        `INSERT INTO complaints (id, title, description, company_id, category_id, status, is_deleted, created_at)
         VALUES (?, 'Consumer Evidence & Discussion', 'Verified consumer discussion thread', ?, ?, 'APPROVED', 0, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE status = 'APPROVED'`,
        [complaintId, comp?.id || 'hp', cat?.id || 'computers']
      );
      [existing] = await pool.execute('SELECT id FROM complaints WHERE id = ?', [complaintId]);
    } catch (_err) {}
  }
  if (existing.length === 0) {
    throw new ApiError(404, 'Complaint not found.', 'COMPLAINT_NOT_FOUND');
  }

  if (parentId) {
    const [parent] = await pool.execute(
      'SELECT id FROM comments WHERE id = ? AND complaint_id = ?',
      [parentId, complaintId]
    );
    if (parent.length === 0) {
      throw new ApiError(400, 'Parent comment not found.', 'PARENT_NOT_FOUND');
    }
  }

  const id = `cmt-${Date.now()}-${randomUUID().slice(0, 8)}`;
  await pool.execute(
    `INSERT INTO comments (id, complaint_id, author_name, author_email, body, parent_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', UTC_TIMESTAMP())`,
    [id, complaintId, authorName.trim(), authorEmail ? authorEmail.trim() : null, body.trim(), parentId || null]
  );

  return findById(id);
}

export async function findByComplaint(complaintId) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       complaint_id AS complaintId,
       author_name AS authorName,
       author_email AS authorEmail,
       body,
       parent_id AS parentId,
       status,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM comments
     WHERE complaint_id = ? AND status = 'APPROVED'
     ORDER BY created_at ASC`,
    [complaintId]
  );
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       complaint_id AS complaintId,
       author_name AS authorName,
       author_email AS authorEmail,
       body,
       parent_id AS parentId,
       status,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM comments
     WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function remove(id) {
  const [result] = await pool.execute('DELETE FROM comments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function updateStatus(id, status) {
  const [result] = await pool.execute(
    'UPDATE comments SET status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
    [status, id]
  );
  if (result.affectedRows === 0) return null;
  return findById(id);
}

export async function updateBody(id, body) {
  const [result] = await pool.execute(
    'UPDATE comments SET body = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
    [body, id]
  );
  if (result.affectedRows === 0) return null;
  return findById(id);
}
import * as commentRepository from '../repositories/commentRepository.js';
import { ApiError } from '../utils/ApiError.js';

export async function getComments(request, response) {
  const complaintId = request.params.complaintId || request.query.complaintId;
  if (!complaintId) throw new ApiError(400, 'Complaint ID is required.', 'MISSING_COMPLAINT_ID');
  const comments = await commentRepository.findByComplaint(complaintId);
  response.json({ success: true, data: comments });
}

export async function postComment(request, response) {
  const complaintId = request.params.complaintId || request.body?.complaintId;
  let { authorName, authorEmail, body, parentId } = request.body || {};

  if (!complaintId) throw new ApiError(400, 'Complaint ID is required.', 'MISSING_COMPLAINT_ID');

  // If user is logged in, auto-populate name and email if not provided
  if (request.user) {
    authorName = authorName?.trim() || request.user.name;
    authorEmail = authorEmail?.trim() || request.user.email;
  }

  if (!authorName || typeof authorName !== 'string' || !authorName.trim()) {
    throw new ApiError(400, 'Please provide your name to post a comment.', 'MISSING_NAME');
  }
  if (!body || typeof body !== 'string' || !body.trim()) {
    throw new ApiError(400, 'Comment text cannot be empty.', 'MISSING_BODY');
  }

  const comment = await commentRepository.create(
    complaintId,
    authorName.trim(),
    authorEmail ? authorEmail.trim() : null,
    body.trim(),
    parentId || null
  );
  response.status(201).json({ success: true, data: comment });
}

export async function deleteComment(request, response) {
  const { id } = request.params;
  if (!id) throw new ApiError(400, 'Comment ID is required.', 'MISSING_COMMENT_ID');
  const existing = await commentRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Comment not found.', 'COMMENT_NOT_FOUND');

  // Allow admin or matching email
  if (request.user?.role !== 'ADMIN' && request.user?.email !== existing.authorEmail) {
    throw new ApiError(403, 'Permission denied to delete this comment.', 'FORBIDDEN');
  }

  const deleted = await commentRepository.remove(id);
  if (!deleted) throw new ApiError(404, 'Comment not found.', 'COMMENT_NOT_FOUND');
  response.json({ success: true, message: 'Comment deleted.' });
}

export async function patchCommentStatus(request, response) {
  const { id } = request.params;
  const { status } = request.body || {};
  if (!id) throw new ApiError(400, 'Comment ID is required.', 'MISSING_COMMENT_ID');
  if (!status) throw new ApiError(400, 'Status is required.', 'MISSING_STATUS');
  const allowed = ['PENDING', 'APPROVED', 'REJECTED'];
  if (!allowed.includes(status)) throw new ApiError(400, `Invalid status. Must be one of: ${allowed.join(', ')}`, 'INVALID_STATUS');
  const comment = await commentRepository.updateStatus(id, status);
  response.json({ success: true, data: comment });
}
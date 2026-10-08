import { Router } from 'express';
import {
  getComments,
  postComment,
  deleteComment,
  patchCommentStatus,
} from '../controllers/commentController.js';
import { requireAuth, attachUser } from '../middleware/auth.js';

const commentRouter = Router();

// Comments are publicly readable and writeable, with automatic user attach
commentRouter.get('/complaints/:complaintId/comments', getComments);
commentRouter.post('/complaints/:complaintId/comments', attachUser, postComment);
commentRouter.delete('/comments/:id', attachUser, deleteComment);
commentRouter.patch('/comments/:id/status', requireAuth, patchCommentStatus);

export default commentRouter;
import { submitCompanyRequest } from '../services/companyService.js';
import { ApiError } from '../utils/ApiError.js';

export async function postCompanyRequest(request, response) {
  if (!request.user) {
    throw new ApiError(401, 'Please sign in to request a new company.', 'AUTH_REQUIRED');
  }

  const { companyName, categoryId, description } = request.body || {};
  const newRequest = await submitCompanyRequest({
    requestedByUserId: request.user.id,
    companyName,
    categoryId,
    description,
  });

  response.status(201).json({ success: true, data: newRequest });
}

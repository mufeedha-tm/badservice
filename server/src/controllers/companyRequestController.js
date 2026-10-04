import { submitCompanyRequest } from '../services/companyService.js';

export async function postCompanyRequest(request, response) {
  const { companyName, categoryId, description } = request.body || {};
  const newRequest = await submitCompanyRequest({
    requestedByUserId: request.user?.id || null,
    companyName,
    categoryId,
    description,
  });

  response.status(201).json({ success: true, data: newRequest });
}

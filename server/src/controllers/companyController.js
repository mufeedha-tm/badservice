import { listCompanies } from '../services/companyService.js';

export async function getCompanies(_request, response) {
  const companies = await listCompanies();
  response.json({ success: true, data: companies });
}
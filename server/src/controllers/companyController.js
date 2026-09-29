import { getCompany, listCompanies } from '../services/companyService.js';

export async function getCompanies(_request, response) {
  const companies = await listCompanies();
  response.json({ success: true, data: companies });
}

export async function getCompanyById(request, response) {
  const company = await getCompany(request.params.id);
  response.json({ success: true, data: company });
}
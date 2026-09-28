import * as companyRepository from '../repositories/mysqlCompanyRepository.js';

export function listCompanies() {
  return companyRepository.findAll();
}

export async function isValidCompany(company) {
  return Boolean(await companyRepository.findByName(company));
}

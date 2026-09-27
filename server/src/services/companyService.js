import * as companyRepository from '../repositories/inMemoryCompanyRepository.js';

export function listCompanies() {
  return companyRepository.findAll();
}
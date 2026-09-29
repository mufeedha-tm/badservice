import * as categoryRepository from '../repositories/mysqlCategoryRepository.js';

export function listCategories() {
  return categoryRepository.findAll();
}

export async function isValidCategory(category) {
  if (!category || typeof category !== 'string') return false;
  return Boolean(await categoryRepository.findByName(category));
}
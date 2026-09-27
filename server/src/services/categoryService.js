import * as categoryRepository from '../repositories/inMemoryCategoryRepository.js';

export function listCategories() {
  return categoryRepository.findAll();
}
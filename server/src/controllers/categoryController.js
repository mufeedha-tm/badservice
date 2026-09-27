import { listCategories } from '../services/categoryService.js';

export async function getCategories(_request, response) {
  const categories = await listCategories();
  response.json({ success: true, data: categories });
}
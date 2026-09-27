import { readFile } from 'node:fs/promises';

const categoriesFile = new URL('../data/categories.json', import.meta.url);

export async function findAll() {
  const json = await readFile(categoriesFile, 'utf8');
  return JSON.parse(json);
}
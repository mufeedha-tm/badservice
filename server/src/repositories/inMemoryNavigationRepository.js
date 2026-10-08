import { readFile } from 'node:fs/promises';

const navigationFile = new URL('../data/navigation.json', import.meta.url);
let cachedNavigation = null;

export async function findNavigation() {
  if (cachedNavigation) return cachedNavigation;
  const json = await readFile(navigationFile, 'utf8');
  cachedNavigation = JSON.parse(json);
  return cachedNavigation;
}
import { readFile } from 'node:fs/promises';
import { readComplaints } from '../models/complaintModel.js';

const companiesFile = new URL('../data/companies.json', import.meta.url);

export async function findAll() {
  const json = await readFile(companiesFile, 'utf8');
  const companies = JSON.parse(json);
  const knownNames = new Set(companies.map((company) => company.name.toLocaleLowerCase()));
  const complaints = await readComplaints();

  for (const complaint of complaints) {
    const normalizedName = complaint.company.toLocaleLowerCase();
    if (knownNames.has(normalizedName)) continue;

    companies.push({
      id: normalizedName.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: complaint.company,
    });
    knownNames.add(normalizedName);
  }

  return companies;
}
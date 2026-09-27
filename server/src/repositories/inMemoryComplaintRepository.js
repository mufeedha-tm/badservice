import { readComplaints, writeComplaints } from '../models/complaintModel.js';

let writeQueue = Promise.resolve();

export async function findAll() {
  return readComplaints();
}

export async function findById(id) {
  const complaints = await readComplaints();
  return complaints.find((complaint) => complaint.id === id) || null;
}

export async function search({ q = '', category = '', company = '', period = '', sort = '' } = {}) {
  const complaints = await readComplaints();
  const normalizedQuery = q.trim().toLocaleLowerCase();
  const normalizedCategory = category.trim().toLocaleLowerCase();
  const normalizedCompany = company.trim().toLocaleLowerCase();

  const results = complaints.filter((complaint) => {
    const searchableText = [
      complaint.title,
      complaint.description,
      complaint.company,
      complaint.category,
      complaint.subcategory,
      complaint.location,
      complaint.createdAtLabel,
      ...complaint.metadata,
      complaint.badge?.label,
    ].filter(Boolean).join(' ').toLocaleLowerCase();
    const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
    const matchesCategory = !normalizedCategory
      || normalizedCategory === 'all categories'
      || complaint.category.toLocaleLowerCase() === normalizedCategory;
    const matchesCompany = !normalizedCompany
      || complaint.company.toLocaleLowerCase() === normalizedCompany;
    const matchesPeriod = period !== 'today' || getAgeMinutes(complaint) < 24 * 60;

    return matchesQuery && matchesCategory && matchesCompany && matchesPeriod;
  });

  if (sort === 'most-complained') {
    results.sort((left, right) => (right.similarComplaintCount || 0) - (left.similarComplaintCount || 0)
      || getAgeMinutes(left) - getAgeMinutes(right));
  } else if (sort === 'latest') {
    results.sort((left, right) => getAgeMinutes(left) - getAgeMinutes(right));
  }

  return results;
}

function getAgeMinutes(complaint) {
  if (complaint.createdAt) {
    const createdAt = Date.parse(complaint.createdAt);
    if (Number.isFinite(createdAt)) return Math.max(0, (Date.now() - createdAt) / 60000);
  }

  if (complaint.createdAtLabel?.toLocaleLowerCase() === 'just now') return 0;
  const age = complaint.createdAtLabel?.match(/(\d+)\s+(minute|hour|day)s?\s+ago/i);
  if (!age) return Number.POSITIVE_INFINITY;

  const multiplier = { minute: 1, hour: 60, day: 1440 }[age[2].toLocaleLowerCase()];
  return Number(age[1]) * multiplier;
}

export function create(complaint) {
  const pendingWrite = writeQueue.then(async () => {
    const complaints = await readComplaints();
    complaints.unshift(complaint);
    await writeComplaints(complaints);
    return complaint;
  });

  writeQueue = pendingWrite.catch(() => {});
  return pendingWrite;
}
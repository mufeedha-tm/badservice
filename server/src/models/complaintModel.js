import { readFile, rename, unlink, writeFile } from 'node:fs/promises';

const complaintsFile = new URL('../data/complaints.json', import.meta.url);

export async function readComplaints() {
  const json = await readFile(complaintsFile, 'utf8');
  return JSON.parse(json);
}

export async function writeComplaints(complaints) {
  const temporaryFile = new URL(`../data/complaints.${process.pid}.tmp`, import.meta.url);

  try {
    await writeFile(temporaryFile, `${JSON.stringify(complaints, null, 2)}\n`, 'utf8');
    await rename(temporaryFile, complaintsFile);
  } catch (error) {
    await unlink(temporaryFile).catch(() => {});
    throw error;
  }
}
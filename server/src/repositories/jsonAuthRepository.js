import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const usersFile = fileURLToPath(new URL('../data/users.json', import.meta.url));
const sessionsFile = fileURLToPath(new URL('../data/sessions.json', import.meta.url));
let writeQueue = Promise.resolve();

async function readRecords(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function updateRecords(file, update) {
  const pendingWrite = writeQueue.then(async () => {
    const records = await readRecords(file);
    const { result, records: nextRecords } = update(records);
    const temporaryFile = `${file}.${process.pid}.tmp`;

    try {
      await writeFile(temporaryFile, `${JSON.stringify(nextRecords, null, 2)}\n`, 'utf8');
      await rename(temporaryFile, file);
    } catch (error) {
      await unlink(temporaryFile).catch(() => {});
      throw error;
    }

    return result;
  });

  writeQueue = pendingWrite.catch(() => {});
  return pendingWrite;
}

export async function findUserByEmail(email) {
  const users = await readRecords(usersFile);
  return users.find((user) => user.email === email) || null;
}

export async function findUserById(id) {
  const users = await readRecords(usersFile);
  return users.find((user) => user.id === id) || null;
}

export function insertUser(user) {
  return updateRecords(usersFile, (users) => {
    if (users.some((existing) => existing.email === user.email)) {
      return { result: null, records: users };
    }

    users.push(user);
    return { result: user, records: users };
  });
}

export function insertSession(session) {
  return updateRecords(sessionsFile, (sessions) => {
    sessions.push(session);
    return { result: session, records: sessions };
  });
}

export async function findSessionByTokenHash(tokenHash) {
  const sessions = await readRecords(sessionsFile);
  const session = sessions.find((record) => record.tokenHash === tokenHash) || null;
  if (!session || Date.parse(session.expiresAt) > Date.now()) return session;

  await removeSession(tokenHash);
  return null;
}

export function removeSession(tokenHash) {
  return updateRecords(sessionsFile, (sessions) => ({
    result: undefined,
    records: sessions.filter((session) => session.tokenHash !== tokenHash),
  }));
}
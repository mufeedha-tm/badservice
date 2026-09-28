import pool from '../config/database.js';

export async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      name,
      email,
      password_salt AS passwordSalt,
      password_hash AS passwordHash,
      created_at AS createdAt
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      name,
      email,
      password_salt AS passwordSalt,
      password_hash AS passwordHash,
      created_at AS createdAt
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

export async function insertUser(user) {
  try {
    await pool.execute(
      `INSERT INTO users
        (id, name, email, password_salt, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email,
        user.passwordSalt,
        user.passwordHash,
        user.createdAt,
      ]
    );

    return user;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return null;
    }

    throw error;
  }
}

export async function insertSession(session) {
  const id = session.id ?? null;

  await pool.execute(
    `INSERT INTO sessions
      (id, token_hash, user_id, expires_at)
     VALUES (?, ?, ?, ?)`,
    [
      id,
      session.tokenHash,
      session.userId,
      session.expiresAt,
    ]
  );

  return session;
}

export async function findSessionByTokenHash(tokenHash) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      token_hash AS tokenHash,
      user_id AS userId,
      expires_at AS expiresAt
     FROM sessions
     WHERE token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );

  const session = rows[0] || null;

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await removeSession(tokenHash);
    return null;
  }

  return session;
}

export async function removeSession(tokenHash) {
  await pool.execute(
    `DELETE FROM sessions
     WHERE token_hash = ?`,
    [tokenHash]
  );
}
import pool from '../config/database.js';

export async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      name,
      email,
      phone,
      role,
      status,
      password_salt AS passwordSalt,
      password_hash AS passwordHash,
      created_at AS createdAt
     FROM users
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`,
    [email.trim()]
  );

  return rows[0] || null;
}

export async function findUserByPhone(phone) {
  if (!phone) return null;
  const [rows] = await pool.execute(
    `SELECT
      id,
      name,
      email,
      phone,
      role,
      status,
      password_salt AS passwordSalt,
      password_hash AS passwordHash,
      created_at AS createdAt
     FROM users
     WHERE phone = ?
     LIMIT 1`,
    [phone.trim()]
  );

  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      name,
      email,
      phone,
      role,
      status,
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
    const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
    const role = user.role || 'USER';
    const status = user.status || 'ACTIVE';
    const phone = user.phone || null;

    await pool.execute(
      `INSERT INTO users
        (id, name, email, phone, password_salt, password_hash, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email.toLowerCase().trim(),
        phone,
        user.passwordSalt,
        user.passwordHash,
        role,
        status,
        createdAt,
      ]
    );

    return { ...user, phone, role, status };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return null;
    }

    throw error;
  }
}

export async function findAllUsers() {
  const [rows] = await pool.execute(`
    SELECT
      id,
      name,
      email,
      phone,
      role,
      status,
      created_at AS createdAt
    FROM users
    ORDER BY created_at DESC
  `);
  return rows;
}

export async function updateUserStatus(userId, status) {
  await pool.execute(
    `UPDATE users SET status = ? WHERE id = ?`,
    [status, userId]
  );
  return findUserById(userId);
}

export async function updateUserRole(userId, role) {
  await pool.execute(
    `UPDATE users SET role = ? WHERE id = ?`,
    [role, userId]
  );
  return findUserById(userId);
}

export async function insertSession(session) {
  const expiresAt = session.expiresAt ? new Date(session.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.execute(
    `INSERT INTO sessions
      (token_hash, user_id, expires_at)
     VALUES (?, ?, ?)`,
    [
      session.tokenHash,
      session.userId,
      expiresAt,
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
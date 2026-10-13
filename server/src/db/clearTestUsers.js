import { randomUUID } from 'node:crypto';
import pool from '../config/database.js';
import { env } from '../config/env.js';

export async function clearTestUsers() {
  const connection = await pool.getConnection();
  let removedUsers = 0;

  try {
    await connection.beginTransaction();
    const [[before]] = await connection.query('SELECT COUNT(*) AS total FROM users');
    const [configuredAdmin] = await connection.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [env.adminEmail],
    );

    let adminId = configuredAdmin[0]?.id;
    if (adminId) {
      await connection.query(
        "UPDATE users SET name = 'BadService Admin', role = 'ADMIN', status = 'ACTIVE' WHERE id = ?",
        [adminId],
      );
    } else {
      const [existingAdmin] = await connection.query(
        "SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at ASC, id ASC LIMIT 1",
      );

      if (existingAdmin[0]?.id) {
        adminId = existingAdmin[0].id;
        await connection.query(
          "UPDATE users SET name = 'BadService Admin', email = ?, role = 'ADMIN', status = 'ACTIVE' WHERE id = ?",
          [env.adminEmail, adminId],
        );
      } else {
        adminId = randomUUID();
        await connection.query(
          `INSERT INTO users (id, name, email, password_salt, password_hash, role, status, created_at)
           VALUES (?, 'BadService Admin', ?, '0000000000000000', 'admin', 'ADMIN', 'ACTIVE', UTC_TIMESTAMP())`,
          [adminId, env.adminEmail],
        );
      }
    }

    await connection.query('DELETE FROM users WHERE id <> ?', [adminId]);
    removedUsers = Number(before.total) - 1;
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  console.log(`Removed ${removedUsers} test user account(s). Retained the active administrator: ${env.adminEmail}.`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('src/db/clearTestUsers.js')) {
  clearTestUsers()
    .then(() => pool.end())
    .catch(async (error) => {
      console.error('Test-user cleanup failed:', error.message);
      await pool.end();
      process.exitCode = 1;
    });
}

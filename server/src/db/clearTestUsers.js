import pool from '../config/database.js';

export async function clearTestUsers() {
  const connection = await pool.getConnection();
  let softDeletedUsers = 0;

  try {
    await connection.beginTransaction();
    const [[before]] = await connection.query(
      "SELECT COUNT(*) AS total FROM users WHERE role <> 'ADMIN' AND is_deleted = 0",
    );

    // Keep all administrator records. Non-admin users remain retained in MySQL
    // for audit purposes, but are disabled, hidden from the website, and cannot
    // authenticate with existing sessions.
    await connection.query(
      "UPDATE users SET is_deleted = 1, deleted_at = UTC_TIMESTAMP(), status = 'DISABLED' WHERE role <> 'ADMIN' AND is_deleted = 0",
    );
    await connection.query(`
      DELETE s FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE u.role <> 'ADMIN' AND u.is_deleted = 1
    `);
    softDeletedUsers = Number(before.total);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  console.log(`Soft-deleted ${softDeletedUsers} non-admin user account(s). All administrator accounts were retained.`);
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

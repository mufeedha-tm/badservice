import pool from '../config/database.js';

export async function insertChallenge(challenge) {
  await pool.execute(
    `
      INSERT INTO otp_challenges
        (id, phone, code_hash, expires_at, attempt_count, created_at)
      VALUES (?, ?, ?, ?, 0, UTC_TIMESTAMP())
    `,
    [challenge.id, challenge.phone, challenge.codeHash, challenge.expiresAt]
  );
}

export async function findLatestByPhone(phone) {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        phone,
        code_hash AS codeHash,
        expires_at AS expiresAt,
        verified_at AS verifiedAt,
        attempt_count AS attemptCount,
        verification_token_hash AS verificationTokenHash,
        token_expires_at AS tokenExpiresAt,
        consumed_at AS consumedAt,
        created_at AS createdAt
      FROM otp_challenges
      WHERE phone = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [phone]
  );

  return rows[0] || null;
}

export async function findByVerificationTokenHash(tokenHash) {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        phone,
        code_hash AS codeHash,
        expires_at AS expiresAt,
        verified_at AS verifiedAt,
        attempt_count AS attemptCount,
        verification_token_hash AS verificationTokenHash,
        token_expires_at AS tokenExpiresAt,
        consumed_at AS consumedAt,
        created_at AS createdAt
      FROM otp_challenges
      WHERE verification_token_hash = ?
      LIMIT 1
    `,
    [tokenHash]
  );

  return rows[0] || null;
}

export async function incrementAttempts(id) {
  await pool.execute(
    `UPDATE otp_challenges SET attempt_count = attempt_count + 1 WHERE id = ?`,
    [id]
  );
}

export async function markVerified(id, tokenHash, tokenExpiresAt) {
  await pool.execute(
    `
      UPDATE otp_challenges
      SET verified_at = UTC_TIMESTAMP(),
          verification_token_hash = ?,
          token_expires_at = ?
      WHERE id = ?
    `,
    [tokenHash, tokenExpiresAt, id]
  );
}

export async function markConsumed(id) {
  await pool.execute(
    `UPDATE otp_challenges SET consumed_at = UTC_TIMESTAMP() WHERE id = ?`,
    [id]
  );
}

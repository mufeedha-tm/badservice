import 'dotenv/config';
import pool from '../config/database.js';

import 'dotenv/config';

import mysql from 'mysql2/promise';

export async function runMigrations() {

  console.log('--- Starting Database Migrations ---');

  // 1. users table columns: role, status, updated_at

  console.log('Migrating users table...');

  await pool.query(`

    CREATE TABLE IF NOT EXISTS users (

      id CHAR(36) PRIMARY KEY,

      name VARCHAR(80) NOT NULL,

      email VARCHAR(254) NOT NULL UNIQUE,

      password_salt VARCHAR(64) NOT NULL,

      password_hash VARCHAR(128) NOT NULL,

      role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',

      status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',

      created_at DATETIME NOT NULL,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  `);

  await addColumnIfNotExists('users', 'role', "ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER'");

  await addColumnIfNotExists('users', 'status', "ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE'");

  await addColumnIfNotExists('users', 'phone', 'VARCHAR(20) NULL');

  await addColumnIfNotExists('users', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // 2. categories table

  console.log('Migrating categories table...');

  await pool.query(`

    CREATE TABLE IF NOT EXISTS categories (

      id VARCHAR(100) PRIMARY KEY,

      name VARCHAR(100) NOT NULL UNIQUE,

      slug VARCHAR(100) UNIQUE NULL,

      parent_id VARCHAR(100) NULL,

      status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL

    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  `);

  await addColumnIfNotExists('categories', 'slug', 'VARCHAR(100) UNIQUE NULL');

  await addColumnIfNotExists('categories', 'parent_id', 'VARCHAR(100) NULL');

  await addColumnIfNotExists('categories', 'status', "ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE'");

  await addColumnIfNotExists('categories', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

  await addColumnIfNotExists('categories', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // 3. companies table

  console.log('Migrating companies table...');

  await pool.query(`

    CREATE TABLE IF NOT EXISTS companies (

      id VARCHAR(100) PRIMARY KEY,

      name VARCHAR(120) NOT NULL UNIQUE,

      slug VARCHAR(120) UNIQUE NULL,

      category_id VARCHAR(100) NULL,

      status ENUM('ACTIVE', 'PENDING', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL

    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  `);

  await addColumnIfNotExists('companies', 'slug', 'VARCHAR(120) UNIQUE NULL');

  await addColumnIfNotExists('companies', 'category_id', 'VARCHAR(100) NULL');

  await addColumnIfNotExists('companies', 'status', "ENUM('ACTIVE', 'PENDING', 'DISABLED') NOT NULL DEFAULT 'ACTIVE'");

  await addColumnIfNotExists('companies', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

  await addColumnIfNotExists('companies', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // 4. complaints table

  console.log('Migrating complaints table...');

  await pool.query(`

    CREATE TABLE IF NOT EXISTS complaints (

      id CHAR(36) PRIMARY KEY,

      title VARCHAR(160) NOT NULL,

      description TEXT NULL,

      company_id VARCHAR(100) NOT NULL,

      category_id VARCHAR(100) NOT NULL,

      subcategory VARCHAR(100) NULL,

      location VARCHAR(120) NULL,

      proof_url VARCHAR(500) NULL,

      proof_name VARCHAR(255) NULL,

      user_id CHAR(36) NULL,

      status ENUM('PENDING', 'UNDER_REVIEW', 'COMPANY_RESPONDED', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',

      created_at DATETIME NULL,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      similar_complaint_count INT UNSIGNED NOT NULL DEFAULT 0,

      badge_label VARCHAR(100) NULL,

      badge_tone VARCHAR(100) NULL,

      action_label VARCHAR(160) NOT NULL DEFAULT 'View Details',

      FOREIGN KEY (company_id) REFERENCES companies(id),

      FOREIGN KEY (category_id) REFERENCES categories(id),

      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL

    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  `);

  await addColumnIfNotExists('complaints', 'complaint_type', "VARCHAR(30) NOT NULL DEFAULT 'Product'");

  await addColumnIfNotExists('complaints', 'product_image_url', 'VARCHAR(500) NULL');

  await addColumnIfNotExists('complaints', 'product_image_name', 'VARCHAR(255) NULL');

  await addColumnIfNotExists('complaints', 'bill_image_url', 'VARCHAR(500) NULL');

  await addColumnIfNotExists('complaints', 'bill_image_name', 'VARCHAR(255) NULL');

  await addColumnIfNotExists('complaints', 'product_video_url', 'VARCHAR(500) NULL');

  await addColumnIfNotExists('complaints', 'product_video_name', 'VARCHAR(255) NULL');

  await addColumnIfNotExists('complaints', 'product_model', 'VARCHAR(150) NULL');

  await addColumnIfNotExists('complaints', 'seller_name', 'VARCHAR(150) NULL');

  await addColumnIfNotExists('complaints', 'complainant_name', 'VARCHAR(80) NULL');

  await addColumnIfNotExists('complaints', 'complainant_phone', 'VARCHAR(20) NULL');

  await addColumnIfNotExists('complaints', 'complainant_email', 'VARCHAR(254) NULL');

  await addColumnIfNotExists('complaints', 'complainant_city', 'VARCHAR(120) NULL');

  await addColumnIfNotExists('complaints', 'complainant_address', 'VARCHAR(500) NULL');

  await addColumnIfNotExists('complaints', 'phone_verified', 'TINYINT(1) NOT NULL DEFAULT 0');

  await addColumnIfNotExists('complaints', 'otp_verified_at', 'DATETIME NULL');

  await addColumnIfNotExists('complaints', 'status', "ENUM('PENDING', 'UNDER_REVIEW', 'COMPANY_RESPONDED', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'PENDING'");

  await addColumnIfNotExists('complaints', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  console.log('Migrating otp_challenges table...');

  await pool.query(`

    CREATE TABLE IF NOT EXISTS otp_challenges (

      id CHAR(36) PRIMARY KEY,

      phone VARCHAR(20) NOT NULL,

      email VARCHAR(254) NULL,

      code_hash CHAR(64) NOT NULL,

      expires_at DATETIME NOT NULL,

      verified_at DATETIME NULL,

      attempt_count INT UNSIGNED NOT NULL DEFAULT 0,

      verification_token_hash CHAR(64) NULL,

      token_expires_at DATETIME NULL,

      consumed_at DATETIME NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_otp_phone (phone),

      INDEX idx_otp_token (verification_token_hash)

    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  `);

  await addColumnIfNotExists('otp_challenges', 'email', 'VARCHAR(254) NULL');

  // 5. company_requests table

  console.log('Migrating company_requests table...');

  await pool.query(`

    CREATE TABLE IF NOT EXISTS company_requests (

      id CHAR(36) PRIMARY KEY,

      requested_by_user_id CHAR(36) NULL,

      company_name VARCHAR(120) NOT NULL,

      category_id VARCHAR(100) NOT NULL,

      description TEXT NULL,

      status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',

      reviewed_by CHAR(36) NULL,

      reviewed_at DATETIME NULL,

      created_at DATETIME NOT NULL,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE,

      FOREIGN KEY (category_id) REFERENCES categories(id),

      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL

    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  `);

  // Public company requests are allowed without an account. Existing installations are migrated safely.

  await pool.query(`ALTER TABLE company_requests MODIFY COLUMN requested_by_user_id CHAR(36) NULL`);

  // 6. sessions table

  console.log('Migrating sessions table...');

  await pool.query(`

    CREATE TABLE IF NOT EXISTS sessions (

      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

      token_hash CHAR(64) NOT NULL UNIQUE,

      user_id CHAR(36) NOT NULL,

      expires_at DATETIME NOT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  `);

  // 7. Add helpful indexes

  await addIndexIfNotExists('companies', 'idx_companies_status', '(status)');

  await addIndexIfNotExists('companies', 'idx_companies_category', '(category_id)');

  await addIndexIfNotExists('complaints', 'idx_complaints_user', '(user_id)');

  await addIndexIfNotExists('complaints', 'idx_complaints_company', '(company_id)');

  await addIndexIfNotExists('complaints', 'idx_complaints_category', '(category_id)');

  await addIndexIfNotExists('complaints', 'idx_complaints_status', '(status)');

  await addIndexIfNotExists('complaints', 'idx_complaints_created', '(created_at)');

  await addIndexIfNotExists('company_requests', 'idx_company_requests_status', '(status)');

  // 8. Grant ADMIN role to user mufeedha059@gmail.com if exists

  await pool.query(`

    UPDATE users SET role = 'ADMIN' WHERE LOWER(email) = 'mufeedha059@gmail.com'

  `);

  console.log('--- Migrations Completed Successfully ---');

}

async function addColumnIfNotExists(tableName, columnName, columnDefinition) {

  const [cols] = await pool.query(`

    SHOW COLUMNS FROM \`${tableName}\` LIKE ?

  `, [columnName]);

  if (cols.length === 0) {

    console.log(`Adding column ${columnName} to ${tableName}...`);

    await pool.query(`

      ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}

    `);

  }

}

async function addIndexIfNotExists(tableName, indexName, indexDefinition) {

  try {

    const [indexes] = await pool.query(`

      SHOW INDEX FROM \`${tableName}\` WHERE Key_name = ?

    `, [indexName]);

    if (indexes.length === 0) {

      console.log(`Adding index ${indexName} to ${tableName}...`);

      await pool.query(`

        ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` ${indexDefinition}

      `);

    }

  } catch (err) {

    console.warn(`Could not add index ${indexName}:`, err.message);

  }

}

// Allow running directly via `node src/db/migrate.js`

if (process.argv[1]?.replace(/\\/g, '/').endsWith('src/db/migrate.js')) {

  runMigrations()

    .then(() => process.exit(0))

    .catch((err) => {

      console.error('Migration failed:', err);

      process.exit(1);

    });

}
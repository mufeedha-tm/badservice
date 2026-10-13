import { randomUUID } from 'node:crypto';
import pool from '../config/database.js';

export async function runSeed() {
  console.log('--- Starting Database Seeding ---');

  // 1. Seed Parent Categories
  const parentCategories = [
    { id: 'banking', name: 'Banking', slug: 'banking' },
    { id: 'computers', name: 'Computers', slug: 'computers' },
    { id: 'fashion', name: 'Fashion', slug: 'fashion' },
    { id: 'flights-trains', name: 'Flights & Trains', slug: 'flights-trains' },
    { id: 'hospital-healthcare', name: 'Hospital & Healthcare', slug: 'hospital-healthcare' },
    { id: 'hotel-travel', name: 'Hotel & Travel', slug: 'hotel-travel' },
    { id: 'mobiles', name: 'Mobiles', slug: 'mobiles' },
    { id: 'restaurants-food', name: 'Restaurants & Food', slug: 'restaurants-food' },
    { id: 'telecom', name: 'Telecom', slug: 'telecom' },
    { id: 'tv-electronics', name: 'TV & Electronics', slug: 'tv-electronics' },
    { id: 'vehicles-automotive', name: 'Vehicles & Automotive', slug: 'vehicles-automotive' },
  ];

  for (const cat of parentCategories) {
    await pool.query(
      `INSERT INTO categories (id, name, slug, parent_id, status)
       VALUES (?, ?, ?, NULL, 'ACTIVE')
       ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug), status = 'ACTIVE'`,
      [cat.id, cat.name, cat.slug]
    );
  }

  // 2. Seed Subcategories with parent_id
  const subCategories = [
    { id: 'cars', name: 'Cars', slug: 'cars', parentId: 'vehicles-automotive' },
    { id: 'two-wheeler', name: 'Two Wheeler', slug: 'two-wheeler', parentId: 'vehicles-automotive' },
    { id: 'service-centers', name: 'Service Centers', slug: 'service-centers', parentId: 'vehicles-automotive' },
    { id: 'laptops', name: 'Laptops', slug: 'laptops', parentId: 'computers' },
    { id: 'hospitals', name: 'Hospitals', slug: 'hospitals', parentId: 'hospital-healthcare' },
    { id: 'hotels', name: 'Hotels', slug: 'hotels', parentId: 'hotel-travel' },
    { id: 'flights', name: 'Flights', slug: 'flights', parentId: 'flights-trains' },
  ];

  for (const sub of subCategories) {
    await pool.query(
      `INSERT INTO categories (id, name, slug, parent_id, status)
       VALUES (?, ?, ?, ?, 'ACTIVE')
       ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug), parent_id = VALUES(parent_id), status = 'ACTIVE'`,
      [sub.id, sub.name, sub.slug, sub.parentId]
    );
  }

  // 3. Seed Companies with category relationships
  const companies = [
    { id: 'apollo-hospital', name: 'Apollo Hospital', slug: 'apollo-hospital', categoryId: 'hospital-healthcare' },
    { id: 'hp', name: 'HP', slug: 'hp', categoryId: 'computers' },
    { id: 'indigo', name: 'IndiGo', slug: 'indigo', categoryId: 'flights-trains' },
    { id: 'maruti-suzuki', name: 'Maruti Suzuki', slug: 'maruti-suzuki', categoryId: 'vehicles-automotive' },
    { id: 'oyo', name: 'OYO', slug: 'oyo', categoryId: 'hotel-travel' },
    { id: 'royal-enfield', name: 'Royal Enfield', slug: 'royal-enfield', categoryId: 'vehicles-automotive' },
  ];

  for (const comp of companies) {
    await pool.query(
      `INSERT INTO companies (id, name, slug, category_id, status)
       VALUES (?, ?, ?, ?, 'ACTIVE')
       ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug), category_id = VALUES(category_id), status = 'ACTIVE'`,
      [comp.id, comp.name, comp.slug, comp.categoryId]
    );
  }

  // 4. Ensure admin user exists safely without duplicate entry errors
  const [existingAdmin] = await pool.query(
    'SELECT id, role, status FROM users WHERE LOWER(email) = ? LIMIT 1',
    ['badservice97@gmail.com']
  );
  if (existingAdmin.length === 0) {
    await pool.query(`
      INSERT INTO users (id, name, email, password_salt, password_hash, role, status, created_at)
      VALUES (?, 'BadService Admin', 'badservice97@gmail.com', '0000000000000000', 'admin', 'ADMIN', 'ACTIVE', UTC_TIMESTAMP())
    `, [randomUUID()]);
  } else if (existingAdmin[0].role !== 'ADMIN' || existingAdmin[0].status !== 'ACTIVE') {
    await pool.query("UPDATE users SET role = 'ADMIN', status = 'ACTIVE' WHERE id = ?", [existingAdmin[0].id]);
  }
  await pool.query(`UPDATE users SET role = 'USER' WHERE LOWER(email) = 'mufeedha059@gmail.com'`);

  console.log('--- Database reference data seeding completed successfully ---');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('src/db/seed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

import { randomBytes, randomUUID, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import pool from '../config/database.js';

const scrypt = promisify(scryptCallback);

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

  // 4. Ensure admin users exist
  // Update Mufeedha to ADMIN
  await pool.query(`UPDATE users SET role = 'ADMIN' WHERE LOWER(email) = 'mufeedha059@gmail.com'`);
  await pool.query(`UPDATE users SET role = 'USER' WHERE LOWER(email) <> 'mufeedha059@gmail.com' AND role = 'ADMIN'`);

 
 

  // 5. Seed legacy complaints if missing
  const sampleComplaints = [
    {
      id: 'hp-laptop',
      title: 'HP Laptop - Heating issue, service denied - HP Support',
      companyId: 'hp',
      categoryId: 'computers',
      subcategory: 'Laptops',
      location: null,
      description: 'Heating issue with HP laptop, service center denied repair under warranty.',
      badgeLabel: 'BEST SELLER',
      badgeTone: 'best-seller',
      similarComplaintCount: 45,
    },
    {
      id: 'apollo-hospital',
      title: 'Apollo Hospital - Overbilling, no bill details',
      companyId: 'apollo-hospital',
      categoryId: 'hospital-healthcare',
      subcategory: 'Healthcare',
      location: 'Kochi',
      description: 'Charged excess fees without providing an itemized bill at discharge.',
      badgeLabel: 'HOSPITAL',
      badgeTone: 'hospital',
      similarComplaintCount: 0,
    },
    {
      id: 'maruti-swift',
      title: 'Maruti Swift - Service center damaged car',
      companyId: 'maruti-suzuki',
      categoryId: 'vehicles-automotive',
      subcategory: 'Cars',
      location: 'Bangalore',
      description: 'Brought car in for regular service, returned with deep scratch on left door.',
      badgeLabel: 'VEHICLE',
      badgeTone: 'vehicle',
      similarComplaintCount: 12,
    },
    {
      id: 'oyo-rooms',
      title: 'OYO Rooms - Hotel denied check-in, no refund',
      companyId: 'oyo',
      categoryId: 'hotel-travel',
      subcategory: 'Hotels',
      location: 'Mumbai',
      description: 'Paid advance online, hotel claimed no rooms available and refused refund.',
      badgeLabel: 'HOTEL',
      badgeTone: 'hotel',
      similarComplaintCount: 30,
    },
    {
      id: 'indigo-flight',
      title: 'IndiGo Flight - Cancelled, refund pending 30 days',
      companyId: 'indigo',
      categoryId: 'flights-trains',
      subcategory: 'Flights',
      location: 'Delhi',
      description: 'Flight cancelled by airline, refund has not been processed after 30 days.',
      badgeLabel: 'AIRLINE',
      badgeTone: 'airline',
      similarComplaintCount: 18,
    },
    {
      id: 'royal-enfield',
      title: 'Royal Enfield - Bike engine issue in 10 days',
      companyId: 'royal-enfield',
      categoryId: 'vehicles-automotive',
      subcategory: 'Two Wheeler',
      location: 'Chennai',
      description: 'Brand new motorcycle engine stalling and oil leak after 10 days of delivery.',
      badgeLabel: 'BIKE',
      badgeTone: 'bike',
      similarComplaintCount: 8,
    },
  ];

  for (const c of sampleComplaints) {
    await pool.query(
      `INSERT INTO complaints
        (id, title, description, company_id, category_id, subcategory, location, status, created_at, similar_complaint_count, badge_label, badge_tone, action_label)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW(), ?, ?, ?, 'View Details')
       ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        subcategory = VALUES(subcategory),
        category_id = VALUES(category_id),
        company_id = VALUES(company_id)`,
      [
        c.id,
        c.title,
        c.description,
        c.companyId,
        c.categoryId,
        c.subcategory,
        c.location,
        c.similarComplaintCount,
        c.badgeLabel,
        c.badgeTone,
      ]
    );
  }

  console.log('--- Database Seeding Completed Successfully ---');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('src/db/seed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

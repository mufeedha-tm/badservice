import http from 'node:http';
import pool from './src/config/database.js';
import app from './src/app.js';

let server;
const PORT = 5088;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function main() {
  console.log('====================================================');
  console.log('   BADSERVICE.IN — FULL PRODUCTION AUDIT SUITE      ');
  console.log('====================================================');

  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
      resolve();
    });
  });

  try {
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
      if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
      } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
      }
    }

    // Helper request
    async function request(path, options = {}) {
      const url = `${BASE_URL}${path}`;
      const headers = options.headers || {};
      if (options.cookie) {
        headers['Cookie'] = options.cookie;
      }

      let body = options.body;
      if (body && typeof body === 'object' && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
      }

      const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body,
      });

      const setCookie = res.headers.get('set-cookie');
      let data = null;
      try {
        data = await res.json();
      } catch {
        // text
      }

      return { status: res.status, data, setCookie };
    }

    console.log('\n--- 1. Health Checks ---');
    const health1 = await request('/health');
    assert(health1.status === 200 && health1.data.success === true, 'Root GET /health works');
    const health2 = await request('/api/health');
    assert(health2.status === 200 && health2.data.success === true, 'GET /api/health works');

    console.log('\n--- 2. Public Catalog & Navigation ---');
    const cats = await request('/api/categories');
    assert(cats.status === 200 && Array.isArray(cats.data.data), 'GET /api/categories returns array of categories');

    const comps = await request('/api/companies');
    assert(comps.status === 200 && Array.isArray(comps.data.data), 'GET /api/companies returns array of active companies');

    console.log('\n--- 3. Category Hierarchy & Two Wheeler Bug Audit ---');
    // Test 1: Category = two-wheeler
    const twoWheelerSearch = await request('/api/complaints/search?category=two-wheeler');
    assert(twoWheelerSearch.status === 200, 'Search two-wheeler status 200');
    const twoWheelerComplaints = twoWheelerSearch.data.data;
    const hasMarutiInTwoWheeler = twoWheelerComplaints.some(
      (c) => c.company.toLowerCase().includes('maruti') || c.title.toLowerCase().includes('maruti')
    );
    assert(!hasMarutiInTwoWheeler, 'CRITICAL: Maruti car complaint DOES NOT appear under Two Wheeler');

    const hasRoyalEnfieldInTwoWheeler = twoWheelerComplaints.some(
      (c) => c.company.toLowerCase().includes('royal enfield')
    );
    assert(hasRoyalEnfieldInTwoWheeler, 'Royal Enfield bike complaint DOES appear under Two Wheeler');

    // Test 2: Category = cars
    const carsSearch = await request('/api/complaints/search?category=cars');
    const carsComplaints = carsSearch.data.data;
    const hasMarutiInCars = carsComplaints.some(
      (c) => c.company.toLowerCase().includes('maruti')
    );
    const hasRoyalEnfieldInCars = carsComplaints.some(
      (c) => c.company.toLowerCase().includes('royal enfield')
    );
    assert(hasMarutiInCars, 'Maruti car complaint appears under Cars');
    assert(!hasRoyalEnfieldInCars, 'Royal Enfield bike complaint DOES NOT appear under Cars');

    // Test 3: Parent Category = vehicles-automotive
    const autoSearch = await request('/api/complaints/search?category=vehicles-automotive');
    const autoComplaints = autoSearch.data.data;
    const hasBothInAuto =
      autoComplaints.some((c) => c.company.toLowerCase().includes('maruti')) &&
      autoComplaints.some((c) => c.company.toLowerCase().includes('royal enfield'));
    assert(hasBothInAuto, 'Parent category Vehicles & Automotive includes both Cars and Two Wheeler');

    console.log('\n--- 4. Authentication & Authorization Security ---');
    // Guest cannot submit complaint
    const guestComplaint = await request('/api/complaints', {
      method: 'POST',
      body: { title: 'Guest attempt', company: 'HP', category: 'Computers', description: 'Test' },
    });
    assert(guestComplaint.status === 401, 'Guest cannot submit complaint (returns 401)');

    // Registration validation: Missing phone
    const regNoPhone = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Audit User', email: 'test_phone@example.com', password: 'Password123', termsAccepted: true },
    });
    assert(regNoPhone.status === 400, 'Register without phone returns 400');

    // Registration validation: Invalid phone
    const regBadPhone = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Audit User', email: 'test_phone@example.com', phone: '12345', password: 'Password123', termsAccepted: true },
    });
    assert(regBadPhone.status === 400, 'Register with invalid phone returns 400');

    // Registration validation: Unchecked terms
    const regNoTerms = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Audit User', email: 'test_terms@example.com', phone: '9876543210', password: 'Password123', termsAccepted: false },
    });
    assert(regNoTerms.status === 400, 'Register without terms accepted returns 400');

    // Registration validation: Password mismatch
    const regMismatch = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Audit User', email: 'test_mismatch@example.com', phone: '9876543210', password: 'Password123', confirmPassword: 'DifferentPassword', termsAccepted: true },
    });
    assert(regMismatch.status === 400, 'Register with mismatched passwords returns 400');

    // Valid Registration User A
    const userAEmail = `audit_user_${Date.now()}@example.com`;
    const regA = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Audit User A',
        email: userAEmail,
        phone: `9${String(Date.now()).slice(-9)}`,
        password: 'Password123',
        confirmPassword: 'Password123',
        termsAccepted: true,
      },
    });
    assert(regA.status === 201 && regA.data.data.role === 'USER', 'Register user returns 201 with role USER and phone');
    const cookieA = regA.setCookie?.split(';')[0];
    assert(cookieA && cookieA.includes('badservice_session'), 'HttpOnly session cookie received');

    // User A attempts admin access -> Must return 403
    const userAdminAttempt = await request('/api/admin/stats', { cookie: cookieA });
    assert(userAdminAttempt.status === 403, 'Normal USER receives 403 accessing /api/admin/stats');

    const userAdminCompanies = await request('/api/admin/companies', { cookie: cookieA });
    assert(userAdminCompanies.status === 403, 'Normal USER receives 403 accessing /api/admin/companies');

    console.log('\n--- 5. Company Request & Approval Workflow ---');
    // Normal user submits company request
    const testCompanyName = `Audit Brand ${Date.now()}`;
    const reqSubmit = await request('/api/company-requests', {
      method: 'POST',
      cookie: cookieA,
      body: {
        companyName: testCompanyName,
        categoryId: 'vehicles-automotive',
        description: 'Electric motorcycle startup',
      },
    });
    assert(reqSubmit.status === 201 && reqSubmit.data.data.status === 'PENDING', 'User submits company request (status PENDING)');
    const companyRequestId = reqSubmit.data.data.id;

    // Verify requested company is NOT publicly visible yet
    const publicCompsBefore = await request('/api/companies');
    const isVisibleBefore = publicCompsBefore.data.data.some((c) => c.name === testCompanyName);
    assert(!isVisibleBefore, 'Requested company is NOT publicly visible while PENDING');

    // Normal user attempts to approve request -> 403
    const userApproveAttempt = await request(`/api/admin/company-requests/${companyRequestId}/approve`, {
      method: 'POST',
      cookie: cookieA,
    });
    assert(userApproveAttempt.status === 403, 'Normal USER cannot approve company request (returns 403)');

    // Login as Admin
   const adminLogin = await request('/api/auth/login', {
  method: 'POST',
  body: { email: 'mufeedha059@gmail.com', password: '12345678' },
});
    assert(adminLogin.status === 200 && adminLogin.data.data.role === 'ADMIN', 'Admin login successful with role ADMIN');
    const cookieAdmin = adminLogin.setCookie?.split(';')[0];

    // Admin views stats
    const adminStats = await request('/api/admin/stats', { cookie: cookieAdmin });
    assert(adminStats.status === 200 && adminStats.data.data.totalComplaints >= 0, 'Admin can view admin stats');

    // Admin approves the company request
    const adminApprove = await request(`/api/admin/company-requests/${companyRequestId}/approve`, {
      method: 'POST',
      cookie: cookieAdmin,
    });
    assert(adminApprove.status === 200 && adminApprove.data.data.request.status === 'APPROVED', 'Admin approves company request (status APPROVED)');

    // Verify company is NOW publicly visible
    const publicCompsAfter = await request('/api/companies');
    const isVisibleAfter = publicCompsAfter.data.data.some((c) => c.name === testCompanyName);
    assert(isVisibleAfter, 'Approved company is NOW publicly selectable in companies catalog');

    console.log('\n--- 6. Complaint Filing, Proof, & Ownership ---');
    // User A files complaint against newly approved company
    const complaintA = await request('/api/complaints', {
      method: 'POST',
      cookie: cookieA,
      body: {
        type: 'Service',
        title: `Audit Complaint ${Date.now()}`,
        company: testCompanyName,
        category: 'Vehicles & Automotive',
        subcategory: 'Two Wheeler',
        description: 'Test complaint with full facts and verified data.',
        location: 'Bangalore',
      },
    });
    assert(complaintA.status === 201 && complaintA.data.data.status === 'PENDING', 'User A files complaint (status PENDING)');
    const complaintAId = complaintA.data.data.id;

    // User A views /complaints/my
    const myComplaintsA = await request('/api/complaints/my', { cookie: cookieA });
    assert(
      myComplaintsA.status === 200 && myComplaintsA.data.data.some((c) => c.id === complaintAId),
      'User A sees their complaint in /complaints/my'
    );

    // Register User B
    const userBEmail = `audit_user_b_${Date.now()}@example.com`;
    const regB = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Audit User B',
        email: userBEmail,
        phone: '9876543211',
        password: 'Password123',
        confirmPassword: 'Password123',
        termsAccepted: true,
      },
    });
    const cookieB = regB.setCookie?.split(';')[0];

    // User B views /complaints/my -> MUST NOT see User A's complaint!
    const myComplaintsB = await request('/api/complaints/my', { cookie: cookieB });
    const userBSeesUserAComplaint = myComplaintsB.data.data.some((c) => c.id === complaintAId);
    assert(!userBSeesUserAComplaint, 'User B CANNOT see User A complaint in /complaints/my (ownership enforced)');

    // Test Server-Side Date Query
    const todayISO = new Date().toISOString().slice(0, 10);
    const dateQueryRes = await request(`/api/complaints/search?date=${todayISO}`);
    assert(dateQueryRes.status === 200 && Array.isArray(dateQueryRes.data.data), 'Date search GET /api/complaints/search?date=YYYY-MM-DD returns 200');

    console.log('\n--- 7. Admin Complaint Management ---');
    // Admin updates complaint status
    const statusUpdate = await request(`/api/admin/complaints/${complaintAId}/status`, {
      method: 'PATCH',
      cookie: cookieAdmin,
      body: { status: 'UNDER_REVIEW' },
    });
    assert(statusUpdate.status === 200 && statusUpdate.data.data.status === 'UNDER_REVIEW', 'Admin updates complaint status to UNDER_REVIEW');

    // Verify updated status reflected in MySQL
    const [dbComplaint] = await pool.query('SELECT status FROM complaints WHERE id = ?', [complaintAId]);
    assert(dbComplaint[0]?.status === 'UNDER_REVIEW', 'Complaint status persisted in MySQL as UNDER_REVIEW');

    console.log('\n--- 8. Validation Rules ---');
    // 1. Missing title
    const invalidTitle = await request('/api/complaints', {
      method: 'POST',
      cookie: cookieA,
      body: { company: 'HP', category: 'Computers', description: 'Desc' },
    });
    assert(invalidTitle.status === 400, 'Complaint with empty title returns 400');

    // 2. Unregistered/unapproved company
    const invalidCompany = await request('/api/complaints', {
      method: 'POST',
      cookie: cookieA,
      body: { title: 'Valid Title', company: 'NonExistentFakeCompany123', category: 'Computers', description: 'Desc' },
    });
    assert(invalidCompany.status === 400, 'Complaint against unregistered company returns 400 (cannot bypass request flow)');

    // 3. Invalid category
    const invalidCat = await request('/api/complaints', {
      method: 'POST',
      cookie: cookieA,
      body: { title: 'Valid Title', company: 'HP', category: 'FakeCategory999', description: 'Desc' },
    });
    assert(invalidCat.status === 400, 'Complaint with invalid category returns 400');

    console.log('\n--- 9. Cleanup Test Data ---');
    // Delete test complaint via admin
    const delComplaint = await request(`/api/admin/complaints/${complaintAId}`, {
      method: 'DELETE',
      cookie: cookieAdmin,
    });
    assert(delComplaint.status === 200, 'Admin successfully deleted test complaint');

    // Clean up created test users from MySQL
    await pool.query('DELETE FROM users WHERE email IN (?, ?)', [userAEmail, userBEmail]);
    // Clean up test company & request
    await pool.query('DELETE FROM company_requests WHERE id = ?', [companyRequestId]);
    await pool.query('DELETE FROM companies WHERE name = ?', [testCompanyName]);
    console.log('  Cleaned up temporary test rows in MySQL');

    console.log('\n====================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Audit suite crashed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    process.exit(0);
  }
}

main();

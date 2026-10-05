import http from 'node:http';
import { Buffer } from 'node:buffer';
import pool from './src/config/database.js';
import app from './src/app.js';

let server;
const PORT = 5088;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Valid media buffers with proper magic bytes
const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9]);
const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
const validMp4 = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32, 0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65]);
const fakeAvi = Buffer.from('RIFF....AVI LIST....');

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

    const autoSearch = await request('/api/complaints/search?category=vehicles-automotive');
    const autoComplaints = autoSearch.data.data;
    const hasBothInAuto =
      autoComplaints.some((c) => c.company.toLowerCase().includes('maruti')) &&
      autoComplaints.some((c) => c.company.toLowerCase().includes('royal enfield'));
    assert(hasBothInAuto, 'Parent category Vehicles & Automotive includes both Cars and Two Wheeler');

    console.log('\n--- 4. Email OTP Flow & Security Validation ---');
    const testOtpEmail = `otp_test_${Date.now()}@example.com`;

    // 4.1 Invalid email rejection
    const invalidEmailOtp = await request('/api/otp/request', {
      method: 'POST',
      body: { email: 'not-an-email' },
    });
    assert(invalidEmailOtp.status === 400, 'Invalid email rejected with 400');

    // 4.2 Send OTP
    const otpRequest = await request('/api/otp/request', {
      method: 'POST',
      body: { email: testOtpEmail },
    });
    assert(otpRequest.status === 200 && otpRequest.data.success === true, 'Email OTP successfully requested');
    assert(otpRequest.data.data.cooldownSeconds === 60, 'Resend cooldown is exactly 60 seconds');

    // 4.3 Cooldown enforcement: Sending again immediately must fail with 429
    const cooldownAttempt = await request('/api/otp/request', {
      method: 'POST',
      body: { email: testOtpEmail },
    });
    assert(cooldownAttempt.status === 429, 'Immediate OTP resend blocked by 60s cooldown (returns 429)');

    // 4.4 In dev test mode, OTP is echoed or readable from DB challenge
    const echoOtp = otpRequest.data?.data?._devEchoOtp;
    assert(echoOtp && echoOtp.length === 6, '6-digit OTP generated securely');

    // 4.5 Wrong OTP rejection
    const wrongOtpVerify = await request('/api/otp/verify', {
      method: 'POST',
      body: { email: testOtpEmail, otp: '000000' },
    });
    assert(wrongOtpVerify.status === 400, 'Incorrect OTP code rejected with 400');

    // 4.6 Correct OTP verification
    const correctOtpVerify = await request('/api/otp/verify', {
      method: 'POST',
      body: { email: testOtpEmail, otp: echoOtp },
    });
    assert(correctOtpVerify.status === 200 && correctOtpVerify.data.success === true, 'Correct OTP verified successfully');
    const verificationToken = correctOtpVerify.data.data.verificationToken;
    assert(verificationToken && typeof verificationToken === 'string', 'Single-use verification token returned');

    // 4.7 Re-verifying consumed OTP fails
    const reVerify = await request('/api/otp/verify', {
      method: 'POST',
      body: { email: testOtpEmail, otp: echoOtp },
    });
    assert(reVerify.status === 400, 'Already consumed OTP cannot be re-verified (returns 400)');

    console.log('\n--- 5. Authentication & Authorization Security ---');
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

    console.log('\n--- 6. Company Request & Approval Workflow ---');
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

    // Login as Admin
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'mufeedha059@gmail.com', password: '12345678' },
    });
    assert(adminLogin.status === 200 && adminLogin.data.data.role === 'ADMIN', 'Admin login successful with role ADMIN');
    const cookieAdmin = adminLogin.setCookie?.split(';')[0];

    // Admin approves the company request
    const adminApprove = await request(`/api/admin/company-requests/${companyRequestId}/approve`, {
      method: 'POST',
      cookie: cookieAdmin,
    });
    assert(adminApprove.status === 200 && adminApprove.data.data.request.status === 'APPROVED', 'Admin approves company request (status APPROVED)');

    console.log('\n--- 7. Complaint Verification & Evidence Upload Security ---');
    // 7.1 Complaint submission WITHOUT verification token -> Must return 401 OTP_REQUIRED
    const missingTokenComplaint = await request('/api/complaints', {
      method: 'POST',
      cookie: cookieA,
      body: {
        title: 'No token complaint',
        company: testCompanyName,
        category: 'Vehicles & Automotive',
        description: 'Testing token enforcement',
      },
    });
    assert(missingTokenComplaint.status === 401 && missingTokenComplaint.data?.error?.code === 'OTP_REQUIRED', 'Complaint without verificationToken returns 401 OTP_REQUIRED');

    // 7.2 Complaint submission WITH token but MISSING mandatory 3 evidence files
    const missingFilesForm = new FormData();
    missingFilesForm.append('verificationToken', verificationToken);
    missingFilesForm.append('email', testOtpEmail);
    missingFilesForm.append('fullName', 'Audit Submitter');
    missingFilesForm.append('phone', '9876543210');
    missingFilesForm.append('city', 'Kochi');
    missingFilesForm.append('address', '123 Test Street, MG Road');
    missingFilesForm.append('type', 'Service');
    missingFilesForm.append('company', testCompanyName);
    missingFilesForm.append('category', 'Vehicles & Automotive');
    missingFilesForm.append('subcategory', 'Two Wheeler');
    missingFilesForm.append('title', 'Missing Media Test');
    missingFilesForm.append('description', 'Test description with missing mandatory files');
    missingFilesForm.append('location', 'Kochi');
    missingFilesForm.append('serviceDetails', 'Brake repair inspection');
    missingFilesForm.append('serviceProvider', 'Kochi Workshop');

    const missingFilesRes = await request('/api/complaints', {
      method: 'POST',
      cookie: cookieA,
      body: missingFilesForm,
    });
    assert(missingFilesRes.status === 400 && (missingFilesRes.data?.error?.code === 'MISSING_PRODUCT_IMAGE' || missingFilesRes.data?.error?.code === 'MISSING_MEDIA'), 'Complaint missing 3 mandatory files rejected with 400 MISSING_PRODUCT_IMAGE');

    // 7.3 Complaint submission WITH ALL 3 MANDATORY FILES and valid verificationToken
    const validForm = new FormData();
    validForm.append('verificationToken', verificationToken);
    validForm.append('email', testOtpEmail);
    validForm.append('fullName', 'Audit Submitter');
    validForm.append('phone', '9876543210');
    validForm.append('city', 'Kochi');
    validForm.append('address', '123 Test Street, MG Road');
    validForm.append('type', 'Service');
    validForm.append('company', testCompanyName);
    validForm.append('category', 'Vehicles & Automotive');
    validForm.append('subcategory', 'Two Wheeler');
    validForm.append('title', `Audit Complaint ${Date.now()}`);
    validForm.append('description', 'Comprehensive genuine service complaint with 3 verified media attachments.');
    validForm.append('location', 'Kochi');
    validForm.append('serviceDetails', 'Brake repair inspection');
    validForm.append('serviceProvider', 'Kochi Workshop');

    // Attach 3 mandatory evidence files
    validForm.append('productImage', new Blob([validJpeg], { type: 'image/jpeg' }), 'photo.jpg');
    validForm.append('billImage', new Blob([validPng], { type: 'image/png' }), 'bill.png');
    validForm.append('productVideo', new Blob([validMp4], { type: 'video/mp4' }), 'video.mp4');

    const submitComplaintRes = await request('/api/complaints', {
      method: 'POST',
      cookie: cookieA,
      body: validForm,
    });
    if (submitComplaintRes.status !== 201) {
      console.log('DEBUG submitComplaintRes failed:', submitComplaintRes.status, submitComplaintRes.data);
    }
    assert(submitComplaintRes.status === 201 && submitComplaintRes.data?.success === true, 'Complaint with verified email and 3 mandatory files created with 201');
    const createdComplaint = submitComplaintRes.data?.data;
    const complaintId = createdComplaint?.id;

    // Verify evidence paths and email_verified flag in MySQL
    const [dbRows] = await pool.query('SELECT email_verified, phone_verified, complainant_email, complainant_phone, product_image_url, bill_image_url, product_video_url FROM complaints WHERE id = ?', [complaintId]);
    const dbRow = dbRows[0];
    assert(dbRow && dbRow.email_verified === 1, 'Complaint persisted with email_verified = 1 in MySQL');
    assert(dbRow && dbRow.phone_verified === 0, 'Complaint persisted with phone_verified = 0 (truth in verification)');
    assert(dbRow && dbRow.complainant_email === testOtpEmail.toLowerCase(), 'Complainant email correctly normalized and saved');
    assert(dbRow && dbRow.product_image_url && dbRow.bill_image_url && dbRow.product_video_url, 'All 3 evidence files tracked in MySQL URLs');


    // 7.4 Re-using the same verificationToken MUST be rejected (single-use token)
    // Request a new OTP for another email to test token invalidation
    const secondForm = new FormData();
    secondForm.append('verificationToken', verificationToken);
    secondForm.append('email', testOtpEmail);
    secondForm.append('fullName', 'Audit Submitter');
    secondForm.append('phone', '9876543210');
    secondForm.append('city', 'Kochi');
    secondForm.append('address', '123 Test Street, MG Road');
    secondForm.append('type', 'Service');
    secondForm.append('company', testCompanyName);
    secondForm.append('category', 'Vehicles & Automotive');
    secondForm.append('title', 'Duplicate token test');
    secondForm.append('description', 'Test duplicate token reuse');
    secondForm.append('location', 'Kochi');
    secondForm.append('serviceDetails', 'Brake repair');
    secondForm.append('serviceProvider', 'Kochi Workshop');
    secondForm.append('productImage', new Blob([validJpeg], { type: 'image/jpeg' }), 'photo.jpg');
    secondForm.append('billImage', new Blob([validPng], { type: 'image/png' }), 'bill.png');
    secondForm.append('productVideo', new Blob([validMp4], { type: 'video/mp4' }), 'video.mp4');

    const reusedTokenRes = await request('/api/complaints', {
      method: 'POST',
      cookie: cookieA,
      body: secondForm,
    });
    assert(reusedTokenRes.status === 401, 'Re-using a consumed verification token is blocked with 401');

    console.log('\n--- 8. User Ownership & Admin Management ---');
    // User A sees their complaint in /complaints/my
    const myComplaintsA = await request('/api/complaints/my', { cookie: cookieA });
    assert(myComplaintsA.status === 200 && myComplaintsA.data.data.some((c) => c.id === complaintId), 'User A sees their complaint in /complaints/my');

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
    const userBSeesUserAComplaint = myComplaintsB.data.data.some((c) => c.id === complaintId);
    assert(!userBSeesUserAComplaint, 'User B CANNOT see User A complaint in /complaints/my (ownership strictly enforced)');

    // Admin updates complaint status
    const statusUpdate = await request(`/api/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      cookie: cookieAdmin,
      body: { status: 'UNDER_REVIEW' },
    });
    assert(statusUpdate.status === 200 && statusUpdate.data.data.status === 'UNDER_REVIEW', 'Admin updates complaint status to UNDER_REVIEW');

    console.log('\n--- 9. Cleanup Test Data ---');
    // Delete test complaint via admin
    const delComplaint = await request(`/api/admin/complaints/${complaintId}`, {
      method: 'DELETE',
      cookie: cookieAdmin,
    });
    assert(delComplaint.status === 200, 'Admin successfully deleted test complaint');

    // Clean up created test users from MySQL
    await pool.query('DELETE FROM users WHERE email IN (?, ?)', [userAEmail, userBEmail]);
    await pool.query('DELETE FROM otp_challenges WHERE email = ?', [testOtpEmail.toLowerCase()]);
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

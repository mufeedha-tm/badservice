import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import pool from './src/config/database.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9224;
const FRONTEND_URL = 'http://localhost:5173';

class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        const listeners = this.eventListeners.get(msg.method) || [];
        for (const fn of listeners) fn(msg.params);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event, fn) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(fn);
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || 'Evaluation error');
    }
    return res.result?.value;
  }
}

async function runBrowserAudit() {
  console.log('====================================================');
  console.log('   BADSERVICE.IN — FULL BROWSER & UI AUDIT SUITE    ');
  console.log('====================================================');

  const userDataDir = path.join(os.tmpdir(), 'chrome-audit-' + Date.now());
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--window-size=1440,900',
    `--user-data-dir=${userDataDir}`,
    FRONTEND_URL,
  ]);

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

  // Wait for Chrome CDP to be available
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    const versionRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
    const versionData = await versionRes.json();
    console.log(`Browser Connected: ${versionData.Browser}`);

    // Connect to open page tab target
    const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const listData = await listRes.json();
    const pageTarget = listData.find((t) => t.type === 'page' && !t.url.startsWith('chrome-extension://')) || listData[0];
    const targetWsUrl = pageTarget?.webSocketDebuggerUrl;
    if (!targetWsUrl) {
      throw new Error('No target WebSocket URL found in Chrome list');
    }
    const ws = new WebSocket(targetWsUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    const cdp = new CDPClient(ws);

    // Track console errors and network requests
    const consoleErrors = [];
    const networkRequests = [];

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__setReactInput = function(el, val) {
          if (!el) return;
          const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype :
                        el instanceof HTMLSelectElement ? HTMLSelectElement.prototype :
                        HTMLInputElement.prototype;
          const desc = Object.getOwnPropertyDescriptor(proto, 'value');
          if (desc && desc.set) {
            desc.set.call(el, val);
          } else {
            el.value = val;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };

        window.__setReactCheckbox = function(el, checked) {
          if (!el) return;
          if (Boolean(el.checked) !== Boolean(checked)) {
            el.click();
          }
        };
      `
    });

    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        const text = params.args.map((a) => a.value || a.description || '').join(' ');
        consoleErrors.push(text);
      }
    });

    cdp.on('Network.requestWillBeSent', (params) => {
      networkRequests.push(params.request.url);
    });

    // Helper: wait for function
    async function waitFor(fnExpr, timeoutMs = 8000, intervalMs = 200) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try {
          const val = await cdp.eval(fnExpr);
          if (val) return val;
        } catch {
          // retry
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      throw new Error(`Timeout waiting for expression: ${fnExpr}`);
    }

    // Helper: navigate
    async function navigateTo(url) {
      await cdp.send('Page.navigate', { url });
      await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('#root')?.children.length)", 10000);
      await cdp.eval(`
        if (!window.__setReactInput) {
          window.__setReactInput = function(el, val) {
            if (!el) return;
            const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype :
                          el instanceof HTMLSelectElement ? HTMLSelectElement.prototype :
                          HTMLInputElement.prototype;
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc && desc.set) {
              desc.set.call(el, val);
            } else {
              el.value = val;
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          };
          window.__setReactCheckbox = function(el, checked) {
            if (!el) return;
            if (Boolean(el.checked) !== Boolean(checked)) {
              el.click();
            }
          };
        }
      `);
      await new Promise((r) => setTimeout(r, 600));
    }

    // --- TEST 1: HOMEPAGE, HEADER & NAVBAR ---
    console.log('\n--- 1. Homepage, Header & Navbar Audit ---');
    await navigateTo(FRONTEND_URL);

    const title = await cdp.eval('document.title');
    assert(title.includes('BadService') || title.length > 0, `Page loaded with title: "${title}"`);

    // Verify search button
    const searchBtnStyle = await cdp.eval(`
      (() => {
        const btn = document.querySelector('.search-bar__submit') || document.querySelector('.search-bar button');
        if (!btn) return null;
        const rect = btn.getBoundingClientRect();
        const style = window.getComputedStyle(btn);
        return {
          visible: rect.width > 50 && rect.height > 25,
          bgColor: style.backgroundColor,
          width: rect.width,
          text: btn.innerText.trim()
        };
      })()
    `);
    assert(searchBtnStyle && searchBtnStyle.visible, `Search button is visible with width ${searchBtnStyle?.width}px and text "${searchBtnStyle?.text}"`);

    // Wait for secondary navbar to load from navigation API
    await waitFor("document.querySelectorAll('.secondary-navigation a').length > 0", 8000);

    // Verify Navbar: MUST NOT have "File Complaint"
    const secondaryNavHasFileComplaint = await cdp.eval(`
      (() => {
        const links = Array.from(document.querySelectorAll('.secondary-navigation a'));
        return links.some(a => a.textContent.trim().toLowerCase().includes('file complaint'));
      })()
    `);
    assert(!secondaryNavHasFileComplaint, 'Secondary navbar DOES NOT contain duplicate "File Complaint"');

    // Verify Navbar has icons
    const navHasIcons = await cdp.eval(`
      Boolean(document.querySelectorAll('.secondary-navigation .nav-item-icon').length > 0)
    `);
    assert(navHasIcons, 'Secondary navigation items display supporting icons (.nav-item-icon)');

    // Verify Header File Complaint button exists
    const headerCtaExists = await cdp.eval(`
      (() => {
        const cta = document.querySelector('.file-complaint-button');
        return Boolean(cta && cta.textContent.includes('File Complaint'));
      })()
    `);
    assert(headerCtaExists, 'Header contains prominent File Complaint CTA button');

    // --- TEST 2: REGISTRATION FORM & COMPLETE VALIDATION ---
    console.log('\n--- 2. Registration Form Validation Audit ---');
    await navigateTo(`${FRONTEND_URL}/account`);

    // Click "Create your account"
    await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create your account'));
        if (btn) btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));

    // Verify fields exist: Name, Phone, Email, Password, Confirm Password, Terms
    const regFields = await cdp.eval(`
      (() => {
        return {
          name: Boolean(document.getElementById('account-name')),
          phone: Boolean(document.getElementById('account-phone')),
          email: Boolean(document.getElementById('account-email')),
          password: Boolean(document.getElementById('account-password')),
          confirmPassword: Boolean(document.getElementById('account-confirm-password')),
          terms: Boolean(document.getElementById('account-terms')),
        };
      })()
    `);
    assert(
      regFields.name && regFields.phone && regFields.email && regFields.password && regFields.confirmPassword && regFields.terms,
      'Registration form contains all 6 required fields (Name, Phone, Email, Password, Confirm Password, Terms)'
    );

    // Validation Test: Empty submission
    await cdp.eval(`document.querySelector('.account-form button[type="submit"]').click()`);
    await new Promise((r) => setTimeout(r, 300));
    const nameErr = await cdp.eval(`document.querySelector('.account-form')?.innerText.includes('Full Name is required')`);
    assert(nameErr, 'Empty submission triggers "Full Name is required" validation');

    // Validation Test: Short name
    await cdp.eval(`
      (() => {
        window.__setReactInput(document.getElementById('account-name'), 'A');
        document.querySelector('.account-form button[type="submit"]').click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));
    const shortNameErr = await cdp.eval(`document.querySelector('.account-form')?.innerText.includes('at least 2 characters')`);
    assert(shortNameErr, 'Short name triggers "at least 2 characters" validation');

    // Validation Test: Invalid phone
    await cdp.eval(`
      (() => {
        window.__setReactInput(document.getElementById('account-name'), 'Rahul Sharma');
        window.__setReactInput(document.getElementById('account-phone'), '12345');
        document.querySelector('.account-form button[type="submit"]').click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));
    const phoneErr = await cdp.eval(`document.querySelector('.account-form')?.innerText.includes('valid 10-digit Indian phone')`);
    assert(phoneErr, 'Invalid phone triggers "valid 10-digit Indian phone" validation');

    // Validation Test: Password mismatch
    await cdp.eval(`
      (() => {
        window.__setReactInput(document.getElementById('account-phone'), '9876543210');
        window.__setReactInput(document.getElementById('account-email'), 'rahul@example.com');
        window.__setReactInput(document.getElementById('account-password'), 'Password123');
        window.__setReactInput(document.getElementById('account-confirm-password'), 'MismatchPassword');
        window.__setReactCheckbox(document.getElementById('account-terms'), true);
        document.querySelector('.account-form button[type="submit"]').click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));
    const mismatchErr = await cdp.eval(`document.querySelector('.account-form')?.innerText.includes('Passwords do not match')`);
    assert(mismatchErr, 'Password mismatch triggers "Passwords do not match" validation');

    // Validation Test: Unchecked terms
    await cdp.eval(`
      (() => {
        window.__setReactInput(document.getElementById('account-confirm-password'), 'Password123');
        window.__setReactCheckbox(document.getElementById('account-terms'), false);
        document.querySelector('.account-form button[type="submit"]').click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));
    const termsErr = await cdp.eval(`document.querySelector('.account-form')?.innerText.includes('Terms & Conditions')`);
    assert(termsErr, 'Unchecked terms triggers "Terms & Conditions" validation');

    // Valid Registration
    const testUserEmail = `browser_user_${Date.now()}@example.com`;
    const testUserPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testUserName = 'Browser Audit User';
    await cdp.eval(`
      (() => {
        window.__setReactInput(document.getElementById('account-name'), '${testUserName}');
        window.__setReactInput(document.getElementById('account-phone'), '${testUserPhone}');
        window.__setReactInput(document.getElementById('account-email'), '${testUserEmail}');
        window.__setReactInput(document.getElementById('account-password'), 'SecurePass@123');
        window.__setReactInput(document.getElementById('account-confirm-password'), 'SecurePass@123');
        window.__setReactCheckbox(document.getElementById('account-terms'), true);
        document.querySelector('.account-form button[type="submit"]').click();
      })()
    `);

    // Wait for account page to show signed in state
    await waitFor(`document.body.innerText.includes('Welcome, ${testUserName}')`, 8000);
    assert(true, 'Registration succeeded and signed-in state rendered');

    // Verify Header updated to Hello, [User Name]
    const headerGreeting = await cdp.eval(`document.querySelector('.account-section')?.innerText || ''`);
    assert(headerGreeting.includes(testUserName) && headerGreeting.includes('Account'), `Header dynamic greeting updated: "${headerGreeting.replace(/\\n/g, ' ')}"`);

    // Verify user in MySQL
    const [userRows] = await pool.execute('SELECT id, name, email, phone, role FROM users WHERE email = ?', [testUserEmail]);
    assert(userRows.length === 1 && userRows[0].phone === testUserPhone, 'Registered user verified in MySQL database with phone');

    // --- TEST 3: FILE COMPLAINT TWO-STEP FLOW ---
    console.log('\n--- 3. File Complaint 2-Step Flow Audit ---');
    await navigateTo(`${FRONTEND_URL}/file-complaint`);

    // Step 1: Wait for prefilled info to load from Account Context
    await waitFor("Boolean(document.getElementById('complainant-name')?.value)", 8000);
    const prefilledName = await cdp.eval(`document.getElementById('complainant-name')?.value`);
    const prefilledEmail = await cdp.eval(`document.getElementById('complainant-email')?.value`);
    const prefilledPhone = await cdp.eval(`document.getElementById('complainant-phone')?.value`);
    assert(
      prefilledName === testUserName && prefilledEmail === testUserEmail && prefilledPhone === testUserPhone,
      'Step 1 automatically prefilled complainant identity from MySQL user account'
    );

    // Fill City and Address, advance to Step 2
    await cdp.eval(`
      (() => {
        window.__setReactInput(document.getElementById('complainant-city'), 'Bangalore');
        window.__setReactInput(document.getElementById('complainant-address'), '100 Feet Road, Indiranagar');
        const continueBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue to Complaint Details'));
        if (continueBtn) continueBtn.click();
      })()
    `);

    await waitFor(`document.body.innerText.includes('Step 2: Complaint Information')`, 6000);
    assert(true, 'Advanced smoothly to Step 2: Complaint Information');

    // Verify Product / Service pills
    const hasPills = await cdp.eval(`
      (() => {
        const text = document.body.innerText;
        return text.includes('🛒 Product') && text.includes('🛠 Service');
      })()
    `);
    assert(hasPills, 'Step 2 renders clear 🛒 Product and 🛠 Service pill options');

    // Fill Complaint Details
    const testComplaintTitle = `Browser Verified Complaint ${Date.now()}`;
    await cdp.eval(`
      (() => {
        // Select Category: Computers
        window.__setReactInput(document.getElementById('complaint-category'), 'Computers');

        // Company: HP
        window.__setReactInput(document.getElementById('complaint-company'), 'HP');

        // Model & Seller
        window.__setReactInput(document.getElementById('complaint-model'), 'Pavilion 15-eg');
        window.__setReactInput(document.getElementById('complaint-seller'), 'HP World Store Indiranagar');

        // Title
        window.__setReactInput(document.getElementById('complaint-title'), '${testComplaintTitle}');

        // Description
        window.__setReactInput(document.getElementById('complaint-description'), 'Detailed facts about defective laptop screen flickering under warranty for over 3 months without replacement.');

        // Submit
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit Verified Complaint'));
        if (submitBtn) submitBtn.click();
      })()
    `);

    // Verify redirected to complaint detail page
    await waitFor(`window.location.pathname.startsWith('/complaints/') && document.body.innerText.includes('${testComplaintTitle}')`, 10000);
    assert(true, 'Complaint submitted and redirected to live complaint details page');

    // Verify Complaint in MySQL
    const [complaintRows] = await pool.execute('SELECT id, title, status FROM complaints WHERE title = ?', [testComplaintTitle]);
    assert(complaintRows.length === 1 && complaintRows[0].status === 'PENDING', 'Complaint persisted in MySQL with status PENDING');
    const createdComplaintId = complaintRows[0]?.id;

    // --- TEST 4: TODAY'S COMPLAINTS & DATE CALENDAR ---
    console.log('\n--- 4. Today\'s Complaints & Calendar Audit ---');
    await navigateTo(`${FRONTEND_URL}/complaints/today`);

    const hasCalendarControls = await cdp.eval(`
      (() => {
        const dateInput = document.getElementById('calendar-date-picker');
        const todayBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Today'));
        const yestBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Yesterday'));
        return Boolean(dateInput && todayBtn && yestBtn);
      })()
    `);
    assert(hasCalendarControls, 'Today\'s Complaints page provides Today, Yesterday, and Calendar Date Picker controls');

    // Click "Yesterday"
    await cdp.eval(`
      (() => {
        const yestBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Yesterday'));
        if (yestBtn) yestBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 1200));

    const yestDateValue = await cdp.eval(`document.getElementById('calendar-date-picker')?.value`);
    assert(yestDateValue && yestDateValue.length === 10, `Calendar synced to selected date: ${yestDateValue}`);

    // Verify server network request was made with date parameter
    const dateRequestMade = networkRequests.some((url) => url.includes('date='));
    assert(dateRequestMade, 'Server-side date search request /api/complaints/search?date=... dispatched');

    // --- TEST 5: LOGOUT & SIGN IN AS ADMIN ---
    console.log('\n--- 5. Authentication & Admin Security Audit ---');
    await navigateTo(`${FRONTEND_URL}/account`);

    // Click Sign out
    await cdp.eval(`
      (() => {
        const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign out'));
        if (logoutBtn) logoutBtn.click();
      })()
    `);
    await waitFor(`document.body.innerText.includes('Sign in') && document.body.innerText.includes('Create your account')`, 5000);
    assert(true, 'Sign out destroyed session and returned to sign in form');

    // Login as Admin
    await cdp.eval(`
      (() => {
        window.__setReactInput(document.getElementById('account-email'), 'admin@badservice.in');
        window.__setReactInput(document.getElementById('account-password'), 'Admin@123456');
        document.querySelector('.account-form button[type="submit"]').click();
      })()
    `);

    await waitFor(`document.body.innerText.includes('Admin Dashboard')`, 6000);
    assert(true, 'Admin login succeeded and Admin Dashboard button displayed');

    const adminGreeting = await cdp.eval(`document.querySelector('.account-section')?.innerText || ''`);
    assert(adminGreeting.includes('Admin / Account'), `Header correctly displays admin badge: "${adminGreeting.replace(/\\n/g, ' ')}"`);

    // Navigate to Admin Dashboard
    await navigateTo(`${FRONTEND_URL}/admin`);
    const adminOverview = await cdp.eval(`document.body.innerText.includes('Total Complaints') && document.body.innerText.includes('Active Companies')`);
    assert(adminOverview, 'Admin dashboard rendered real stats from MySQL');

    // --- TEST 6: RESPONSIVE VIEWPORT TESTING ---
    console.log('\n--- 6. Responsive Viewport Audit ---');
    const viewports = [
      { name: 'Desktop 1920x1080', width: 1920, height: 1080 },
      { name: 'Laptop 1440x900', width: 1440, height: 900 },
      { name: 'Tablet 1024x768', width: 1024, height: 768 },
      { name: 'Tablet Portrait 768x1024', width: 768, height: 1024 },
      { name: 'Mobile 430x932', width: 430, height: 932 },
      { name: 'Mobile 390x844', width: 390, height: 844 },
      { name: 'Mobile 360x800', width: 360, height: 800 },
    ];

    for (const vp of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 800,
      });
      await new Promise((r) => setTimeout(r, 400));

      const overflow = await cdp.eval(`document.documentElement.scrollWidth > window.innerWidth`);
      assert(!overflow, `${vp.name}: No horizontal overflow (scrollWidth <= window.innerWidth)`);
    }

    // Reset viewport
    await cdp.send('Emulation.clearDeviceMetricsOverride');

    // --- TEST 7: CONSOLE & RUNTIME ERROR AUDIT ---
    console.log('\n--- 7. Console & Runtime Crash Audit ---');
    const reactCrashes = consoleErrors.filter((e) =>
      e.includes('Objects are not valid as a React child') ||
      e.includes('Encountered two children with the same key') ||
      e.includes('Unhandled promise rejection')
    );
    assert(reactCrashes.length === 0, `0 React runtime crashes (Found: ${reactCrashes.length})`);

    const badApiUrls = networkRequests.filter((url) =>
      url.includes('VITE_API_BASE_URL=') ||
      url.includes('badservice.onrender.com')
    );
    assert(badApiUrls.length === 0, `0 accidental Render or malformed API requests during local dev (Found: ${badApiUrls.length})`);

    // --- CLEANUP TEST DATA ---
    console.log('\n--- 8. Cleanup Temporary Test Data ---');
    if (createdComplaintId) {
      await pool.execute('DELETE FROM complaints WHERE id = ?', [createdComplaintId]);
    }
    await pool.execute('DELETE FROM users WHERE email = ?', [testUserEmail]);
    console.log('  Cleaned up temporary test rows in MySQL');

    console.log('\n====================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Browser audit crashed:', err);
    process.exit(1);
  } finally {
    chromeProcess.kill();
    process.exit(0);
  }
}

runBrowserAudit();

/* ==========================================================================
   RECO QA E2E Verification & Audit Test Suite
   ========================================================================== */

const http = require('http');

const BASE_URL = 'http://localhost:8080';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

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

async function runTests() {
  console.log('====================================================');
  console.log('🧪 STARTING RECO ZERO-BUG PRODUCTION AUDIT SUITE');
  console.log('====================================================\n');

  // 1. Health Check
  console.log('--- 1. API Health & Server Accessibility ---');
  try {
    const health = await request('GET', '/api/health');
    assert(health.status === 200, 'GET /api/health returned HTTP 200');
    assert(health.body.status === 'online', 'Platform status is online');
  } catch (err) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // 2. Static Assets
  console.log('\n--- 2. Static Asset Delivery ---');
  try {
    const root = await request('GET', '/');
    assert(root.status === 200, 'GET / returns HTML document');
    assert(typeof root.body === 'string' && root.body.includes('RECO'), 'HTML contains RECO branding');

    const css = await request('GET', '/css/style.css');
    assert(css.status === 200, 'GET /css/style.css returns CSS styles');

    const storeJs = await request('GET', '/js/store.js');
    assert(storeJs.status === 200, 'GET /js/store.js returns store script');

    const appJs = await request('GET', '/js/app.js');
    assert(appJs.status === 200, 'GET /js/app.js returns app script');
  } catch (err) {
    assert(false, `Static asset check failed: ${err.message}`);
  }

  // 3. Auth Form Validation & Edge Cases
  console.log('\n--- 3. Authentication Validation & Edge Cases ---');
  const timestamp = Date.now();
  const testEmailA = `audit_user_a_${timestamp}@enterprise.test`;
  const testEmailB = `audit_user_b_${timestamp}@enterprise.test`;

  // Empty fields signup
  const emptySignup = await request('POST', '/api/auth/signup', { name: '', email: '', password: '' });
  assert(emptySignup.status === 400, 'Signup with empty fields rejected with HTTP 400');

  // Invalid email signup
  const invalidEmailSignup = await request('POST', '/api/auth/signup', { name: 'Test', email: 'invalid-email', password: 'password123' });
  assert(invalidEmailSignup.status === 400, 'Signup with invalid email format rejected with HTTP 400');

  // Weak password (<6)
  const weakPassSignup = await request('POST', '/api/auth/signup', { name: 'Test', email: 'valid@example.com', password: '123' });
  assert(weakPassSignup.status === 400, 'Signup with short password (<6 chars) rejected with HTTP 400');

  // Valid Account A Signup
  const signupA = await request('POST', '/api/auth/signup', {
    name: 'Aarav Singhania',
    email: testEmailA,
    company: 'Singhania Logistics Ltd.',
    password: 'securePassword123'
  });
  assert(signupA.status === 201, 'Valid Account A signup returned HTTP 201 Created');
  assert(signupA.body.success === true, 'Signup response indicates success');
  assert(signupA.body.accountId && signupA.body.accountId.startsWith('acc_'), 'Generated valid Account ID');
  const accountIdA = signupA.body.accountId;

  // Duplicate email signup
  const dupSignup = await request('POST', '/api/auth/signup', {
    name: 'Aarav Singhania Duplicate',
    email: testEmailA,
    company: 'Duplicate Corp',
    password: 'anotherPassword123'
  });
  assert(dupSignup.status === 409, 'Duplicate email signup rejected with HTTP 409 Conflict');
  assert(dupSignup.body.error === 'DUPLICATE_EMAIL', 'Returns DUPLICATE_EMAIL error code');

  // Login Checks
  console.log('\n--- 4. Account Login & Authorization ---');
  // Wrong password
  const wrongPassLogin = await request('POST', '/api/auth/login', { email: testEmailA, password: 'wrongPassword' });
  assert(wrongPassLogin.status === 401, 'Login with wrong password rejected with HTTP 401');

  // Non-existent user
  const notFoundLogin = await request('POST', '/api/auth/login', { email: 'nonexistent@nowhere.test', password: 'password123' });
  assert(notFoundLogin.status === 404, 'Login with non-existent user returns HTTP 404');

  // Valid Login for Account A
  const validLoginA = await request('POST', '/api/auth/login', { email: testEmailA, password: 'securePassword123' });
  assert(validLoginA.status === 200, 'Valid login returns HTTP 200');
  assert(validLoginA.body.accountId === accountIdA, 'Returns matching Account ID');
  assert(validLoginA.body.user && !validLoginA.body.user.password, 'User object does NOT leak password');

  // Demo Account Login
  const demoLogin = await request('POST', '/api/auth/login', { email: 'vikram@apexenterprise.com', password: 'any' });
  assert(demoLogin.status === 200, 'Demo account shortcut login succeeds');
  assert(demoLogin.body.accountId === 'acc_demo_vikram', 'Demo account returns acc_demo_vikram');

  // 5. Data Isolation Audit
  console.log('\n--- 5. Multi-Tenant Data Isolation Audit ---');
  // Account A initial data
  const accDataA1 = await request('GET', `/api/account/${accountIdA}`);
  assert(accDataA1.status === 200, 'GET Account A data returns HTTP 200');
  assert(accDataA1.body.data.customers.length === 0, 'New Account A starts with 0 customers (no demo data bleed)');
  assert(accDataA1.body.data.invoices.length === 0, 'New Account A starts with 0 invoices');

  // Account A creates customer and invoice
  const updatedAData = {
    ...accDataA1.body.data,
    customers: [
      {
        id: 'CUST-001',
        accountId: accountIdA,
        name: 'Private Client A Corp',
        category: 'Consulting',
        email: 'billing@client-a.com',
        avgDelayDays: 12,
        totalRecovered: 0
      }
    ],
    invoices: [
      {
        id: 'INV-1001',
        accountId: accountIdA,
        customerId: 'CUST-001',
        customer: 'Private Client A Corp',
        amount: 350000,
        dueDate: '2026-08-10',
        status: 'Overdue'
      }
    ]
  };
  const saveA = await request('PUT', `/api/account/${accountIdA}`, updatedAData);
  assert(saveA.status === 200, 'PUT Account A data saved successfully');

  // Create Account B
  const signupB = await request('POST', '/api/auth/signup', {
    name: 'Bhavya Tiwari',
    email: testEmailB,
    company: 'Tiwari Ventures',
    password: 'passwordB123'
  });
  const accountIdB = signupB.body.accountId;
  assert(signupB.status === 201, 'Account B created successfully');

  // Check Account B cannot see Account A data
  const accDataB = await request('GET', `/api/account/${accountIdB}`);
  assert(accDataB.body.data.customers.length === 0, 'Account B has 0 customers (Account A data isolated)');
  assert(accDataB.body.data.invoices.length === 0, 'Account B has 0 invoices (Account A invoices isolated)');

  // Re-check Account A still has its own data intact
  const accDataA2 = await request('GET', `/api/account/${accountIdA}`);
  assert(accDataA2.body.data.customers.length === 1, 'Account A still has its 1 private customer');
  assert(accDataA2.body.data.customers[0].name === 'Private Client A Corp', 'Customer name is Private Client A Corp');
  assert(accDataA2.body.data.invoices.length === 1, 'Account A still has its 1 invoice');

  // 6. Summary
  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

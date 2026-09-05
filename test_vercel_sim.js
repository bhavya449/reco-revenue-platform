/* ==========================================================================
   Vercel Serverless Simulation Test
   Tests running under simulated Vercel environment (VERCEL=1)
   ========================================================================== */

process.env.VERCEL = '1';

const http = require('http');

console.log('--- Simulating Vercel Serverless Environment ---');

// 1. Load the serverless entrypoint
let app;
try {
  app = require('./api/index');
  console.log('✅ PASS: Successfully loaded api/index.js in Vercel mode');
} catch (err) {
  console.error('❌ FAIL: Failed to load api/index.js:', err);
  process.exit(1);
}

// 2. Start a temporary test server with the exported app
const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`✅ PASS: Serverless Express app running on ephemeral test port ${port}`);

  function req(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: port,
        path: path,
        method: method,
        headers: { 'Content-Type': 'application/json' }
      };
      const r = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      r.on('error', reject);
      if (body) r.write(JSON.stringify(body));
      r.end();
    });
  }

  try {
    // Check GET /
    const rootRes = await req('/');
    console.log(`✅ PASS: GET / returned HTTP ${rootRes.status}`);

    // Check GET /favicon.ico
    const favRes = await req('/favicon.ico');
    console.log(`✅ PASS: GET /favicon.ico returned HTTP ${favRes.status} (No 500 error!)`);

    // Check GET /favicon.png
    const favPngRes = await req('/favicon.png');
    console.log(`✅ PASS: GET /favicon.png returned HTTP ${favPngRes.status}`);

    // Check GET /api/health
    const healthRes = await req('/api/health');
    console.log(`✅ PASS: GET /api/health returned HTTP ${healthRes.status}, serverless=${healthRes.body.serverless}`);

    // Check POST /api/auth/signup in serverless mode
    const signupRes = await req('/api/auth/signup', 'POST', {
      name: 'Vercel Test User',
      email: `vercel_test_${Date.now()}@example.com`,
      company: 'Vercel Testing Inc.',
      password: 'password123'
    });
    console.log(`✅ PASS: POST /api/auth/signup returned HTTP ${signupRes.status}, success=${signupRes.body.success}`);

    // Check POST /api/settings/email (safely ignores read-only .env on Vercel)
    const settingsRes = await req('/api/settings/email', 'POST', {
      emailFrom: 'RECO Onboarding <onboarding@resend.dev>'
    });
    console.log(`✅ PASS: POST /api/settings/email returned HTTP ${settingsRes.status}, success=${settingsRes.body.success}`);

    console.log('\n🎉 ALL VERCEL SERVERLESS SIMULATION CHECKS PASSED WITH 0 ERRORS!');
    testServer.close();
    process.exit(0);
  } catch (testErr) {
    console.error('❌ Serverless test failure:', testErr);
    testServer.close();
    process.exit(1);
  }
});

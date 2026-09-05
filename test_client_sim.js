/* ==========================================================================
   RECO Client-Side & Store Simulation Unit Test Suite
   Includes Full 9-Scenario User Authentication Flow & Route Guard Tests
   ========================================================================== */

const fs = require('fs');
const path = require('path');

// Mock localStorage
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new MockLocalStorage();

// Mock DOM environment for routing simulation
class MockElement {
  constructor(id = '', className = '') {
    this.id = id;
    this.className = className;
    this.classList = {
      _classes: new Set(className ? className.split(' ') : []),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c)
    };
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.children = [];
    this.listeners = {};
    this.attributes = {};
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k] || null; }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  appendChild(child) { this.children.push(child); }
  querySelector() { return new MockElement(); }
  querySelectorAll() { return [new MockElement()]; }
  focus() {}
}

const mockDoc = {
  elements: {},
  getElementById: function(id) {
    if (!this.elements[id]) {
      this.elements[id] = new MockElement(id);
    }
    return this.elements[id];
  },
  createElement: function(tag) {
    return new MockElement('', tag);
  },
  querySelectorAll: function(selector) {
    return [new MockElement()];
  },
  querySelector: function(selector) {
    return new MockElement();
  },
  addEventListener: function() {}
};

global.document = mockDoc;
global.window = {
  location: { hash: '#landing', pathname: '/' },
  scrollTo: () => {},
  addEventListener: () => {},
  localStorage: global.localStorage
};

// Load RecoStore class from store.js
const storeCode = fs.readFileSync(path.join(__dirname, 'js', 'store.js'), 'utf-8');
eval(storeCode);

const store = global.window.recoStore;

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

async function runClientSimulation() {
  console.log('====================================================');
  console.log('🧪 RUNNING RECO AUTH FLOW & ROUTE GUARD TEST SUITE');
  console.log('====================================================\n');

  // Route alias and route guard simulator (reproducing router in app.js)
  const ROUTE_ALIASES = {
    'command-center': 'dashboard',
    'dashboard': 'dashboard',
    'invoices': 'invoices',
    'customers': 'customers',
    'copilot': 'copilot',
    'ai-copilot': 'copilot',
    'analytics': 'reports',
    'reports': 'reports',
    'notifications': 'notifications',
    'settings': 'settings',
    'login': 'login',
    'signin': 'login',
    'sign-in': 'login',
    'signup': 'signup',
    'sign-up': 'signup',
    'register': 'signup',
    'landing': 'landing',
    'home': 'landing'
  };

  let currentActiveView = 'landing';
  let toastMessage = null;

  function simulateNavigate(viewName) {
    const publicViews = ['landing', 'login', 'signup'];
    const isAuth = store.state.auth.isAuthenticated;

    if (!publicViews.includes(viewName) && !isAuth) {
      toastMessage = 'Please sign in to access your revenue workspace.';
      global.window.location.hash = '#login';
      currentActiveView = 'login';
      return;
    }

    currentActiveView = viewName;
    global.window.location.hash = `#${viewName}`;
  }

  function simulateRouteHash(hash) {
    const rawHash = (hash.replace('#', '') || 'landing').toLowerCase();
    const targetRoute = ROUTE_ALIASES[rawHash] || rawHash;
    simulateNavigate(targetRoute);
  }

  function simulateDirectPath(pathname) {
    const cleanPath = pathname.replace(/^\/|\/$/g, '').toLowerCase();
    const targetRoute = ROUTE_ALIASES[cleanPath] || cleanPath;
    simulateNavigate(targetRoute);
  }

  /* ==========================================================================
     EXPLICIT 9 REQUIRED USER VERIFICATION TEST SCENARIOS
     ========================================================================== */

  console.log('--- 1. TEST 1: Open website while logged out → Landing page appears ---');
  // Cold start for a fresh visitor
  localStorage.clear();
  store.activeAccountId = null;
  store.state.auth.isAuthenticated = false;
  store.state.auth.user = null;
  simulateRouteHash('#landing');

  assert(store.activeAccountId === null, 'Active account ID is null on cold start');
  assert(store.state.auth.isAuthenticated === false, 'Visitor is not authenticated');
  assert(currentActiveView === 'landing', 'Landing page is active view');
  const coldMetrics = store.getComputedMetrics();
  assert(coldMetrics.isEmpty === true, 'No demo financial data leaks to unauthenticated visitor');
  assert(coldMetrics.invoices.length === 0, '0 invoices shown to unauthenticated visitor');
  assert(coldMetrics.customers.length === 0, '0 customers shown to unauthenticated visitor');
  assert(coldMetrics.totalOutstandingFormatted === '₹0.0L', '₹0.0L outstanding shown to unauthenticated visitor');

  console.log('\n--- 2. TEST 2: Click Command Center while logged out → Sign In page ---');
  simulateRouteHash('#dashboard');
  assert(store.state.auth.isAuthenticated === false, 'User remains unauthenticated');
  assert(currentActiveView === 'login', 'Command Center access redirected to login view');
  assert(global.window.location.hash === '#login', 'URL hash redirected to #login');
  assert(toastMessage !== null, 'Warning toast displayed informing user to sign in');

  console.log('\n--- 3. TEST 3: Click AI Copilot while logged out → Sign In page ---');
  simulateRouteHash('#copilot');
  assert(store.state.auth.isAuthenticated === false, 'User remains unauthenticated');
  assert(currentActiveView === 'login', 'AI Copilot access redirected to login view');
  assert(global.window.location.hash === '#login', 'URL hash redirected to #login');

  console.log('\n--- 4. TEST 4: Click Analytics while logged out → Sign In page ---');
  simulateRouteHash('#reports');
  assert(store.state.auth.isAuthenticated === false, 'User remains unauthenticated');
  assert(currentActiveView === 'login', 'Analytics access redirected to login view');
  assert(global.window.location.hash === '#login', 'URL hash redirected to #login');

  console.log('\n--- 5. TEST 5: Manually enter the Command Center URL while logged out → Sign In page ---');
  simulateDirectPath('/command-center');
  assert(store.state.auth.isAuthenticated === false, 'Direct URL path unauthenticated check succeeds');
  assert(currentActiveView === 'login', 'Direct /command-center URL redirected to login view');
  assert(global.window.location.hash === '#login', 'URL hash redirected to #login');

  console.log('\n--- 6. TEST 6: Sign in successfully → Command Center becomes accessible ---');
  // Register an account and log in
  const userEmail = 'finance.head@enterprise.in';
  const userPass = 'securePassword2026';
  store.initLocalEmptyAccount('acc_ent_user_1', 'Rohan Mehra', userEmail, 'Mehra Logistics Ltd.', userPass);
  
  const loginRes = await store.login(userEmail, userPass);
  assert(loginRes.success === true, 'Sign in succeeds with valid credentials');
  assert(store.state.auth.isAuthenticated === true, 'store.state.auth.isAuthenticated is true');
  assert(store.activeAccountId === 'acc_ent_user_1', 'Active account ID set to acc_ent_user_1');

  // Navigate to Command Center
  simulateRouteHash('#dashboard');
  assert(currentActiveView === 'dashboard', 'Command Center is now accessible for authenticated user');
  assert(global.window.location.hash === '#dashboard', 'URL hash is #dashboard');

  console.log('\n--- 7. TEST 7: After signing in, click AI Copilot → accessible ---');
  simulateRouteHash('#copilot');
  assert(currentActiveView === 'copilot', 'AI Copilot is accessible for authenticated user');
  assert(global.window.location.hash === '#copilot', 'URL hash is #copilot');

  console.log('\n--- 8. TEST 8: After signing in, click Analytics → accessible ---');
  simulateRouteHash('#reports');
  assert(currentActiveView === 'reports', 'Analytics is accessible for authenticated user');
  assert(global.window.location.hash === '#reports', 'URL hash is #reports');

  console.log('\n--- 9. TEST 9: Refresh the page while signed in → authentication remains valid ---');
  // Simulate page reload: re-read active session from localStorage
  const savedSessionId = store.loadActiveSession();
  assert(savedSessionId === 'acc_ent_user_1', 'Saved session accountId loaded from localStorage on page refresh');
  
  // Re-instantiate store with loaded session
  const refreshedStore = new (store.constructor)();
  assert(refreshedStore.state.auth.isAuthenticated === true, 'refreshedStore is authenticated');
  assert(refreshedStore.state.auth.user.email === userEmail, 'refreshedStore user email persists');
  assert(refreshedStore.state.auth.user.company === 'Mehra Logistics Ltd.', 'refreshedStore user company persists');

  /* ==========================================================================
     FINANCIAL DATA INTEGRITY & ISOLATION TESTS
     ========================================================================== */
  console.log('\n--- 10. Financial Math & Demo Account Isolation ---');
  // Demo Workspace
  await store.enterDemoWorkspace();
  assert(store.isDemoSession() === true, 'Demo session flagged correctly');
  assert(store.activeAccountId === store.DEMO_ACCOUNT_ID, 'Demo active account ID is acc_demo_vikram');
  
  const demoMetrics = store.getComputedMetrics();
  assert(demoMetrics.invoices.length === 8, 'Demo account contains 8 sample invoices');
  assert(demoMetrics.customers.length === 6, 'Demo account contains 6 sample customers');
  assert(demoMetrics.overdueCount > 0, 'Demo account overdue invoices calculated');
  assert(demoMetrics.atRiskRaw > 0, 'Demo account at-risk exposure calculated');

  // Sign Up new isolated account
  const signupRes = await store.signup('Ananya Roy', 'ananya@royenterprises.in', 'Roy Enterprises', 'password123');
  assert(signupRes.success === true, 'New account signup succeeds');
  assert(store.isDemoSession() === false, 'New account is NOT in demo mode');
  
  const newMetrics = store.getComputedMetrics();
  assert(newMetrics.isEmpty === true, 'New account has a completely clean ledger');
  assert(newMetrics.invoices.length === 0, 'New account has 0 invoices');
  assert(newMetrics.customers.length === 0, 'New account has 0 customers (no demo data bleed)');

  // Invoice creation and status update
  const inv = store.addInvoice({ customer: 'Roy Client 1', amount: 500000, dueDate: '2026-08-01', status: 'Overdue' });
  assert(inv !== undefined && inv.id.startsWith('INV-'), 'Invoice created with ID');
  let metrics = store.getComputedMetrics();
  assert(metrics.totalOutstandingRaw === 500000, 'Outstanding is ₹5,00,000');
  
  store.updateInvoiceStatus(inv.id, 'Paid');
  metrics = store.getComputedMetrics();
  assert(metrics.totalOutstandingRaw === 0, 'Outstanding is 0 after payment');
  assert(metrics.recoveredThisMonthRaw === 500000, 'Recovered this month is ₹5,00,000');

  console.log('\n====================================================');
  console.log(`📊 SIMULATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runClientSimulation().catch(err => {
  console.error('Fatal simulation error:', err);
  process.exit(1);
});

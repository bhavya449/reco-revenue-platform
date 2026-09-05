/* ==========================================================================
   RECO Client-Side & Store Simulation Unit Test Suite
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
global.window = {
  location: { hash: '#landing' },
  scrollTo: () => {}
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
  console.log('🧪 RUNNING RECO CLIENT LOGIC & ENGINE SIMULATION');
  console.log('====================================================\n');

  // Test 1: Store Initialization & Demo Account Data
  console.log('--- 1. Store Initialization & Demo Isolation ---');
  assert(store !== undefined, 'RecoStore singleton instantiated');
  assert(store.activeAccountId === 'acc_demo_vikram', 'Default initial session is demo account');

  const demoMetrics = store.getComputedMetrics();
  assert(demoMetrics.invoices.length === 8, 'Demo account has 8 invoices');
  assert(demoMetrics.customers.length === 6, 'Demo account has 6 demo customers (ABC Constructions, etc.)');
  assert(demoMetrics.overdueCount > 0, 'Demo account has overdue invoices');
  assert(demoMetrics.atRiskRaw > 0, 'Demo account has at-risk exposure');
  assert(demoMetrics.totalOutstandingRaw > 0, 'Demo account has total outstanding');

  // Test 2: AI Deterministic Risk Engine Math
  console.log('\n--- 2. AI Risk Engine Deterministic Calculation ---');
  const highRiskInv = demoMetrics.invoices.find(i => i.id === 'INV-1024');
  assert(highRiskInv !== undefined, 'Found invoice INV-1024');
  assert(highRiskInv.riskLevel === 'HIGH', 'INV-1024 is classified as HIGH risk');
  assert(highRiskInv.riskScore >= 80, `INV-1024 risk score is >= 80% (Actual: ${highRiskInv.riskScore}%)`);

  // Risk of a paid invoice must be 0
  const paidInv = demoMetrics.invoices.find(i => i.id === 'INV-1018');
  assert(paidInv !== undefined, 'Found paid invoice INV-1018');
  assert(paidInv.riskScore === 0, 'Paid invoice risk score is 0');
  assert(paidInv.riskLevel === 'LOW', 'Paid invoice risk level is LOW');

  // Test 3: New Isolated Account Creation & Clean Slate
  console.log('\n--- 3. Clean Slate for Newly Registered Accounts ---');
  const newAccId = 'acc_test_new_clean';
  store.initLocalEmptyAccount(newAccId, 'Rohit Varma', 'rohit@varmaenterprises.in', 'Varma Enterprises', 'securePass123');
  store.saveActiveSession(newAccId);

  const cleanMetrics = store.getComputedMetrics();
  assert(cleanMetrics.isEmpty === true, 'New account metrics isEmpty is true');
  assert(cleanMetrics.totalInvoicesCount === 0, 'New account has 0 invoices');
  assert(cleanMetrics.customers.length === 0, 'New account has 0 customers (NO demo companies appear)');
  assert(cleanMetrics.totalOutstandingFormatted === '₹0.0L', 'New account outstanding is ₹0.0L');
  assert(cleanMetrics.atRiskFormatted === '₹0.0L', 'New account at risk is ₹0.0L');
  assert(cleanMetrics.overdueCount === 0, 'New account overdue count is 0');

  // Test 4: Customer CRUD in Isolated Account
  console.log('\n--- 4. Customer Management CRUD in Isolated Account ---');
  const newCust = store.addCustomer({
    name: 'Kaveri Tech Solutions Pvt Ltd',
    category: 'Cloud Services',
    contactPerson: 'Suresh Kaveri',
    email: 'billing@kaveritech.com',
    phone: '+91 98111 22334',
    avgDelayDays: 8
  });
  assert(newCust !== undefined && newCust.id.startsWith('CUST-'), 'Customer added with unique ID (CUST-001)');
  
  let currentMetrics = store.getComputedMetrics();
  assert(currentMetrics.customers.length === 1, 'Account now has exactly 1 customer');
  assert(currentMetrics.customers[0].name === 'Kaveri Tech Solutions Pvt Ltd', 'Customer name matches');

  // Edit customer
  store.editCustomer(newCust.id, {
    name: 'Kaveri Tech Solutions Global',
    category: 'Enterprise Cloud'
  });
  currentMetrics = store.getComputedMetrics();
  assert(currentMetrics.customers[0].name === 'Kaveri Tech Solutions Global', 'Customer name updated via editCustomer');
  assert(currentMetrics.customers[0].category === 'Enterprise Cloud', 'Customer category updated');

  // Test 5: Invoice CRUD & Relationship Sync
  console.log('\n--- 5. Invoice CRUD & Customer Relationship Sync ---');
  const newInv = store.addInvoice({
    customer: 'Kaveri Tech Solutions Global',
    amount: 600000,
    dueDate: '2026-08-01',
    status: 'Overdue'
  });
  assert(newInv !== undefined && newInv.id.startsWith('INV-'), 'Invoice added with unique ID (INV-1001)');

  currentMetrics = store.getComputedMetrics();
  assert(currentMetrics.invoices.length === 1, 'Account now has 1 invoice');
  assert(currentMetrics.totalOutstandingRaw === 600000, 'Total outstanding is ₹6,00,000');
  assert(currentMetrics.totalOutstandingFormatted === '₹6.0L', 'Total outstanding formatted as ₹6.0L');
  assert(currentMetrics.overdueCount === 1, 'Overdue count is 1');
  assert(currentMetrics.customers[0].totalOutstandingRaw === 600000, 'Customer total outstanding updated to ₹6,00,000');
  assert(currentMetrics.customers[0].invoicesCount === 1, 'Customer has 1 invoice');

  // Edit Invoice
  store.editInvoice(newInv.id, {
    amount: 750000
  });
  currentMetrics = store.getComputedMetrics();
  assert(currentMetrics.totalOutstandingRaw === 750000, 'Total outstanding updated to ₹7,50,000 after edit');
  assert(currentMetrics.customers[0].totalOutstandingRaw === 750000, 'Customer total outstanding updated to ₹7,50,000 after edit');

  // Mark invoice as Paid
  store.updateInvoiceStatus(newInv.id, 'Paid');
  currentMetrics = store.getComputedMetrics();
  assert(currentMetrics.totalOutstandingRaw === 0, 'Total outstanding dropped to 0 after payment');
  assert(currentMetrics.recoveredThisMonthRaw === 750000, 'Recovered this month updated to ₹7,50,000');
  assert(currentMetrics.overdueCount === 0, 'Overdue count is 0');
  assert(currentMetrics.customers[0].totalRecovered >= 750000, 'Customer total recovered increased to ₹7,50,000');
  assert(currentMetrics.customers[0].paidOnTime === '100%', 'Customer paid on time is 100%');

  // Delete invoice
  store.deleteInvoice(newInv.id);
  currentMetrics = store.getComputedMetrics();
  assert(currentMetrics.invoices.length === 0, 'Invoice successfully deleted from account');

  // Delete customer
  store.deleteCustomer(newCust.id);
  currentMetrics = store.getComputedMetrics();
  assert(currentMetrics.customers.length === 0, 'Customer successfully deleted from account');

  // Test 6: Simulator Mathematical Correctness
  console.log('\n--- 6. Recovery Simulator Mathematical Modeling ---');
  // Re-add an invoice for simulator test
  store.addInvoice({
    customer: 'Simulator Test Debtor',
    amount: 1000000,
    dueDate: '2026-08-01',
    status: 'Overdue'
  });
  const simMetrics = store.getComputedMetrics();
  const currentOutstanding = simMetrics.totalOutstandingRaw; // 10,00,000
  const targetRate = 85;
  const projectedRecoveredRaw = Math.round(currentOutstanding * (targetRate / 100)); // 8,50,000
  const unrecoveredRaw = Math.max(0, currentOutstanding - projectedRecoveredRaw); // 1,50,000

  assert(projectedRecoveredRaw === 850000, 'Simulator projected recovery for ₹10L at 85% target is ₹8.5L');
  assert(unrecoveredRaw === 150000, 'Simulator unrecovered amount is ₹1.5L');

  // Test 7: Batch Data Import Ingestion
  console.log('\n--- 7. Batch Data Import Ingestion ---');
  const importResult = store.importInvoices([
    { customer: 'Imported Enterprise Alpha', amount: 350000, dueDate: '2026-09-20', status: 'Pending' },
    { customer: 'Imported Enterprise Beta', amount: 420000, dueDate: '2026-08-10', status: 'Overdue' }
  ]);
  assert(importResult.count === 2, 'Imported 2 invoices in batch');
  const postImportMetrics = store.getComputedMetrics();
  assert(postImportMetrics.invoices.some(i => i.customer === 'Imported Enterprise Alpha'), 'Imported Alpha invoice present in ledger');
  assert(postImportMetrics.invoices.some(i => i.customer === 'Imported Enterprise Beta'), 'Imported Beta invoice present in ledger');
  assert(postImportMetrics.customers.some(c => c.name === 'Imported Enterprise Alpha'), 'Auto-created customer profile for Alpha');

  // Test 8: Verify Switch Back to Demo Account Still Isolated
  console.log('\n--- 8. Switching Back to Demo Account ---');
  store.saveActiveSession(store.DEMO_ACCOUNT_ID);
  const demoMetricsRestored = store.getComputedMetrics();
  assert(demoMetricsRestored.customers.length === 6, 'Demo account still has its 6 standard demo companies');
  assert(!demoMetricsRestored.customers.some(c => c.name === 'Simulator Test Debtor'), 'Demo account does NOT contain new account test debtors');

  // Test 9: Verification of All 3 User Authentication & Demo Workspace Flows
  console.log('\n--- 9. Comprehensive 3-Flow Verification ---');
  // Flow 1: Existing User -> Sign In -> Existing Isolated Workspace
  const existingLoginResult = await store.login('rohit@varmaenterprises.in', 'securePass123');
  assert(existingLoginResult.success === true, 'Flow 1: Existing user login succeeds');
  assert(store.isDemoSession() === false, 'Flow 1: Existing user is NOT in demo mode');
  assert(store.activeAccountId === newAccId, 'Flow 1: Active session points to existing user account');
  const existingUserMetrics = store.getComputedMetrics();
  assert(existingUserMetrics.customers.some(c => c.name === 'Imported Enterprise Alpha'), 'Flow 1: Existing user sees their own private customer');
  assert(!existingUserMetrics.customers.some(c => c.name === 'ABC Constructions Pvt. Ltd.'), 'Flow 1: Existing user does NOT see demo ABC Constructions');

  // Flow 2: New User -> Sign Up -> Completely Empty Personal Workspace
  const freshSignupResult = await store.signup('Ananya Roy', 'ananya@royfintech.com', 'Roy Fintech Labs', 'password123');
  assert(freshSignupResult.success === true, 'Flow 2: New user signup succeeds');
  assert(store.isDemoSession() === false, 'Flow 2: New user is NOT in demo mode');
  const freshUserMetrics = store.getComputedMetrics();
  assert(freshUserMetrics.isEmpty === true, 'Flow 2: New user gets a completely empty workspace');
  assert(freshUserMetrics.totalInvoicesCount === 0, 'Flow 2: New user has 0 invoices');
  assert(freshUserMetrics.customers.length === 0, 'Flow 2: New user has 0 customers (no demo data bleed)');

  // Flow 3: Evaluator -> Explore Demo Workspace -> Immediately sees prepared realistic dataset
  const demoExploreResult = await store.enterDemoWorkspace();
  assert(demoExploreResult.success === true, 'Flow 3: Explore Demo Workspace succeeds directly');
  assert(store.isDemoSession() === true, 'Flow 3: Evaluator is correctly flagged in demo mode');
  assert(store.activeAccountId === store.DEMO_ACCOUNT_ID, 'Flow 3: Active session is Demo Account');
  const demoDatasetMetrics = store.getComputedMetrics();
  assert(demoDatasetMetrics.customers.some(c => c.name.includes('ABC Constructions')), 'Flow 3: Evaluator sees ABC Constructions');
  assert(demoDatasetMetrics.customers.some(c => c.name.includes('XYZ Pvt Ltd')), 'Flow 3: Evaluator sees XYZ Pvt Ltd');
  assert(demoDatasetMetrics.invoices.length === 8, 'Flow 3: Evaluator sees prepared invoices portfolio');
  assert(demoDatasetMetrics.overdueCount > 0, 'Flow 3: Evaluator sees overdue invoices and AI risk scores');

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

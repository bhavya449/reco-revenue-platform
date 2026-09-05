/* ==========================================================================
   RECO — AI REVENUE RECOVERY PLATFORM
   Backend API & Static Web Server with Real Email Integration
   ========================================================================== */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { sendWelcomeEmail } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DEMO_ACCOUNT_ID = 'acc_demo_vikram';
const DEMO_EMAIL = 'vikram@apexenterprise.com';
const DEMO_PASSWORD = 'demopass123';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function emptyDb() {
  return { accounts: {}, users: {}, sessions: {} };
}

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = emptyDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.accounts) parsed.accounts = {};
    if (!parsed.users) parsed.users = {};
    if (!parsed.sessions) parsed.sessions = {};
    return parsed;
  } catch (e) {
    console.error('Database read error:', e);
    return emptyDb();
  }
}

function writeDb(data) {
  try {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    console.error('Database write error:', e);
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !password) return false;
  if (!String(stored).includes(':')) {
    return stored === password;
  }
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(String(password), salt, 64).toString('hex');
  const hashBuf = Buffer.from(hash, 'hex');
  const testBuf = Buffer.from(test, 'hex');
  if (hashBuf.length !== testBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, testBuf);
}

function createSession(accountId) {
  const token = crypto.randomBytes(32).toString('hex');
  const db = readDb();
  const now = Date.now();
  Object.keys(db.sessions || {}).forEach(key => {
    const sess = db.sessions[key];
    if (!sess || (sess.expiresAt && Date.parse(sess.expiresAt) < now)) {
      delete db.sessions[key];
    }
  });
  db.sessions[token] = {
    accountId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString()
  };
  writeDb(db);
  return token;
}

function destroySession(token) {
  if (!token) return;
  const db = readDb();
  if (db.sessions && db.sessions[token]) {
    delete db.sessions[token];
    writeDb(db);
  }
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

function emptyAccountPayload(user) {
  return {
    user: publicUser(user),
    customers: [],
    invoices: [],
    notifications: [
      {
        id: `NOTIF-${Date.now()}`,
        accountId: user.id,
        type: 'ai-insight',
        title: 'WELCOME TO RECO',
        message: `Your isolated workspace for ${user.company} is ready.`,
        timestamp: 'Just now',
        read: false,
        invoiceId: null
      }
    ],
    settings: {
      companyName: user.company,
      gstin: '',
      currency: 'INR',
      riskThreshold: 80,
      autoNudge: true
    },
    baseHistoricalRecovered: 0,
    quarterlyActionPlan: null
  };
}

function sanitizeQuarterlyActionPlan(plan, accountId) {
  if (!plan || typeof plan !== 'object') return null;
  const target = Number(plan.recoveryTarget);
  const levers = Array.isArray(plan.levers)
    ? plan.levers.map(l => String(l).trim()).filter(Boolean).slice(0, 12)
    : [];
  return {
    accountId,
    recoveryTarget: Number.isFinite(target) ? Math.max(50, Math.min(100, Math.round(target))) : 85,
    projectedRecoveryFormatted: String(plan.projectedRecoveryFormatted || '').slice(0, 40),
    currentRecoveryFormatted: String(plan.currentRecoveryFormatted || '').slice(0, 40),
    additionalRecoveryFormatted: String(plan.additionalRecoveryFormatted || '').slice(0, 40),
    outstandingFormatted: String(plan.outstandingFormatted || '').slice(0, 40),
    recoveryRateFormatted: String(plan.recoveryRateFormatted || '').slice(0, 40),
    unrecoveredFormatted: String(plan.unrecoveredFormatted || '').slice(0, 40),
    levers,
    status: 'ACTIVE',
    appliedAt: plan.appliedAt && !Number.isNaN(Date.parse(plan.appliedAt))
      ? plan.appliedAt
      : new Date().toISOString()
  };
}

function sanitizeAccountPayload(body, accountId, existingUser) {
  const src = body && typeof body === 'object' ? body : {};
  const customers = Array.isArray(src.customers) ? src.customers : [];
  const invoices = Array.isArray(src.invoices) ? src.invoices : [];
  const notifications = Array.isArray(src.notifications) ? src.notifications : [];
  const settings = src.settings && typeof src.settings === 'object' ? src.settings : {};

  return {
    user: publicUser(existingUser),
    customers: customers.filter(c => c && typeof c === 'object').map(c => ({
      ...c,
      accountId
    })),
    invoices: invoices.filter(i => i && typeof i === 'object').map(i => ({
      ...i,
      accountId,
      amount: Number.isFinite(Number(i.amount)) ? Number(i.amount) : 0
    })),
    notifications: notifications.filter(n => n && typeof n === 'object').map(n => ({
      ...n,
      accountId
    })),
    settings: {
      companyName: String(settings.companyName || existingUser.company || 'Enterprise Corp'),
      gstin: String(settings.gstin || ''),
      currency: String(settings.currency || 'INR'),
      riskThreshold: Number(settings.riskThreshold) || 80,
      autoNudge: settings.autoNudge !== false
    },
    baseHistoricalRecovered: Number(src.baseHistoricalRecovered) || 0,
    quarterlyActionPlan: sanitizeQuarterlyActionPlan(src.quarterlyActionPlan, accountId)
  };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  const db = readDb();
  const session = db.sessions[token];
  if (!session) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
  }
  if (session.expiresAt && Date.parse(session.expiresAt) < Date.now()) {
    delete db.sessions[token];
    writeDb(db);
    return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
  }
  req.accountId = session.accountId;
  req.sessionToken = token;
  next();
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ==========================================================================
   API Authentication Routes
   ========================================================================== */

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, company, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Name, email, and password are required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL',
        message: 'Please enter a valid email address.'
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const db = readDb();

    const existingUser = Object.values(db.users || {}).find(u => u.email && u.email.toLowerCase() === normalizedEmail);
    if (existingUser || normalizedEmail === DEMO_EMAIL) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_EMAIL',
        message: 'An account with this email already exists. Please log in instead.'
      });
    }

    const accountId = `acc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newUser = {
      id: accountId,
      name: String(name).trim(),
      email: normalizedEmail,
      company: String(company || 'Enterprise Corp').trim() || 'Enterprise Corp',
      role: 'Finance Director',
      createdAt: new Date().toISOString()
    };

    db.users[accountId] = { ...newUser, password: hashPassword(password) };
    db.accounts[accountId] = emptyAccountPayload(newUser);
    writeDb(db);

    const token = createSession(accountId);
    console.log(`[AUTH SUCCESS] New account created: ${newUser.name} (${newUser.email}) -> Account ID: ${accountId}`);

    let emailSent = false;
    let emailMessage = '';

    try {
      const emailResult = await Promise.race([
        sendWelcomeEmail({ userName: newUser.name, userEmail: newUser.email }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('EMAIL_TIMEOUT')), 10000))
      ]);

      if (emailResult && emailResult.success) {
        emailSent = true;
        emailMessage = `Account created! Welcome email sent to ${newUser.email}.`;
      } else {
        console.warn(`[EMAIL DELIVERY NOTE] Email not dispatched: ${(emailResult && (emailResult.error || emailResult.message)) || 'unknown'}`);
        emailMessage = "Your account was created successfully, but we couldn't send the confirmation email. You can continue using RECO.";
      }
    } catch (emailErr) {
      console.error('[EMAIL HANDLER ERROR]', emailErr.message || emailErr);
      emailMessage = "Your account was created successfully, but we couldn't send the confirmation email. You can continue using RECO.";
    }

    return res.status(201).json({
      success: true,
      accountId,
      token,
      user: newUser,
      emailSent,
      message: emailMessage
    });
  } catch (err) {
    console.error('[SIGNUP SERVER ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Internal server error occurred during account creation.'
    });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (normalizedEmail === DEMO_EMAIL) {
      if (password !== DEMO_PASSWORD) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password. Please try again.'
        });
      }
      const token = createSession(DEMO_ACCOUNT_ID);
      return res.json({
        success: true,
        accountId: DEMO_ACCOUNT_ID,
        token,
        user: {
          id: DEMO_ACCOUNT_ID,
          name: 'Vikram Malhotra',
          email: DEMO_EMAIL,
          company: 'Apex Enterprise Solutions Pvt. Ltd.',
          role: 'Head of Credit & Collections'
        }
      });
    }

    const db = readDb();
    const userEntry = Object.values(db.users || {}).find(u => u.email && u.email.toLowerCase() === normalizedEmail);

    if (!userEntry || !verifyPassword(password, userEntry.password)) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password. Please try again.'
      });
    }

    const token = createSession(userEntry.id);
    return res.json({
      success: true,
      accountId: userEntry.id,
      token,
      user: publicUser(userEntry)
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  destroySession(token);
  return res.json({ success: true });
});

app.get('/api/account', authMiddleware, (req, res) => {
  try {
    if (req.accountId === DEMO_ACCOUNT_ID) {
      return res.json({ success: true, accountId: DEMO_ACCOUNT_ID, account: null, isDemo: true });
    }
    const db = readDb();
    const user = db.users[req.accountId];
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    const account = db.accounts[req.accountId] || emptyAccountPayload(publicUser(user));
    account.user = publicUser(user);
    return res.json({ success: true, accountId: req.accountId, account, isDemo: false });
  } catch (err) {
    console.error('[ACCOUNT GET ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to load account data.' });
  }
});

app.put('/api/account', authMiddleware, (req, res) => {
  try {
    if (req.accountId === DEMO_ACCOUNT_ID) {
      return res.json({ success: true, accountId: DEMO_ACCOUNT_ID, isDemo: true });
    }
    const db = readDb();
    const user = db.users[req.accountId];
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    const incoming = req.body && req.body.account ? req.body.account : req.body;
    db.accounts[req.accountId] = sanitizeAccountPayload(incoming, req.accountId, publicUser(user));
    if (incoming && incoming.settings && incoming.settings.companyName) {
      db.users[req.accountId].company = String(incoming.settings.companyName).trim();
      db.accounts[req.accountId].user.company = db.users[req.accountId].company;
    }
    writeDb(db);
    return res.json({ success: true, accountId: req.accountId });
  } catch (err) {
    console.error('[ACCOUNT PUT ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to save account data.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'RECO AI Revenue Recovery Platform',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid request payload.' });
  }
  console.error('[UNHANDLED ERROR]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 RECO Platform Server running on http://localhost:${PORT}`);
  console.log(`📧 Transactional Email Service: Configured`);
  console.log(`=======================================================`);
});

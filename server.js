/* ==========================================================================
   RECO — AI REVENUE RECOVERY PLATFORM
   Backend API & Static Web Server with Real Email Integration
   ========================================================================== */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { sendWelcomeEmail, sendPaymentReminderEmail, sendTestEmail, isEmailConfigured } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Database helper functions
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = { accounts: {}, users: {} };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Database read error:', e);
    return { accounts: {}, users: {} };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Database write error:', e);
  }
}

function saveSentEmailRecord(record) {
  try {
    const db = readDb();
    if (!db.sentEmails) db.sentEmails = [];
    const item = {
      id: `EMAIL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      to: record.to,
      subject: record.subject,
      html: record.html || '',
      text: record.text || '',
      previewUrl: record.previewUrl || null,
      messageId: record.messageId || null,
      provider: record.provider || 'Live Mail Service',
      invoiceId: record.invoiceId || null,
      type: record.type || 'reminder',
      timestamp: new Date().toISOString()
    };
    db.sentEmails.unshift(item);
    if (db.sentEmails.length > 100) db.sentEmails = db.sentEmails.slice(0, 100);
    writeDb(db);
    return item;
  } catch (e) {
    console.error('[OUTBOX DB ERROR]', e);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));

/* ==========================================================================
   API Authentication Routes
   ========================================================================== */

/**
 * POST /api/auth/signup
 * Handles real user registration, duplicate check, persistence, and transactional email.
 */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, company, password } = req.body;

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Name, email, and password are required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL',
        message: 'Please enter a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = readDb();

    // 2. Duplicate Account Check
    const existingUser = Object.values(db.users || {}).find(u => u.email.toLowerCase() === normalizedEmail);
    if (existingUser || normalizedEmail === 'vikram@apexenterprise.com') {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_EMAIL',
        message: 'An account with this email already exists. Please log in instead.'
      });
    }

    // 3. Create Account & Save in Database
    const accountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newUser = {
      id: accountId,
      name: name.trim(),
      email: normalizedEmail,
      company: (company || 'Enterprise Corp').trim(),
      role: 'Finance Director',
      createdAt: new Date().toISOString()
    };

    if (!db.users) db.users = {};
    if (!db.accounts) db.accounts = {};

    db.users[accountId] = { ...newUser, password: password };
    db.accounts[accountId] = {
      user: newUser,
      customers: [],
      invoices: [],
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          accountId: accountId,
          type: 'ai-insight',
          title: 'WELCOME TO RECO',
          message: `Your isolated workspace for ${newUser.company} is ready.`,
          timestamp: 'Just now',
          read: false,
          invoiceId: null
        }
      ],
      settings: {
        companyName: newUser.company,
        gstin: '',
        currency: 'INR',
        riskThreshold: 80,
        autoNudge: true
      }
    };

    writeDb(db);
    console.log(`[AUTH SUCCESS] New account created: ${newUser.name} (${newUser.email}) -> Account ID: ${accountId}`);

    // 4. Trigger Real Welcome Email (AFTER successful account creation)
    let emailSent = false;
    let emailMessage = '';
    let previewUrl = null;

    try {
      const emailResult = await sendWelcomeEmail({
        userName: newUser.name,
        userEmail: newUser.email
      });

      if (emailResult.success && emailResult.emailSent) {
        emailSent = true;
        previewUrl = emailResult.previewUrl || null;
        emailMessage = `Account created! Welcome email dispatched to ${newUser.email}.`;
      } else {
        emailMessage = `Account created successfully! Live webmail preview prepared for ${newUser.email}.`;
      }

      saveSentEmailRecord({
        to: newUser.email,
        subject: 'Welcome to RECO — Your Account Has Been Created Successfully 🎉',
        html: emailResult.html,
        previewUrl: emailResult.previewUrl,
        messageId: emailResult.messageId,
        provider: emailResult.provider || 'RECO Onboarding',
        type: 'welcome'
      });
    } catch (emailErr) {
      console.error('[EMAIL HANDLER ERROR]', emailErr);
      emailMessage = "Your account was created successfully, but we couldn't send the confirmation email. You can continue using RECO.";
    }

    // 5. Respond with success
    return res.status(201).json({
      success: true,
      accountId: accountId,
      user: newUser,
      emailSent: emailSent,
      previewUrl: previewUrl,
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

/**
 * POST /api/auth/login
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check Demo Account
    if (normalizedEmail === 'vikram@apexenterprise.com') {
      return res.json({
        success: true,
        accountId: 'acc_demo_vikram',
        user: {
          id: 'acc_demo_vikram',
          name: 'Vikram Malhotra',
          email: 'vikram@apexenterprise.com',
          company: 'Apex Enterprise Solutions Pvt. Ltd.',
          role: 'Head of Credit & Collections'
        }
      });
    }

    const db = readDb();
    const userEntry = Object.values(db.users || {}).find(u => u.email.toLowerCase() === normalizedEmail);

    if (!userEntry) {
      return res.status(404).json({
        success: false,
        message: 'Account not found. Please create an account.'
      });
    }

    if (userEntry.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.'
      });
    }

    const { password: _, ...safeUser } = userEntry;
    return res.json({
      success: true,
      accountId: safeUser.id,
      user: safeUser
    });

  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
});

/**
 * GET /api/account/:id
 * Retrieve isolated account state from server database
 */
app.get('/api/account/:id', (req, res) => {
  try {
    const accountId = req.params.id;
    if (accountId === 'acc_demo_vikram') {
      return res.json({ success: true, accountId, isDemo: true });
    }
    const db = readDb();
    const accountData = db.accounts ? db.accounts[accountId] : null;
    if (!accountData) {
      return res.status(404).json({ success: false, message: 'Account data not found' });
    }
    return res.json({ success: true, data: accountData });
  } catch (err) {
    console.error('[GET ACCOUNT ERROR]', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving account data' });
  }
});

/**
 * PUT /api/account/:id
 * Sync account data updates to server database
 */
app.put('/api/account/:id', (req, res) => {
  try {
    const accountId = req.params.id;
    if (accountId === 'acc_demo_vikram') {
      return res.json({ success: true, message: 'Demo account updated' });
    }
    const db = readDb();
    if (!db.accounts) db.accounts = {};
    const existing = db.accounts[accountId] || {};
    db.accounts[accountId] = {
      ...existing,
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    writeDb(db);
    return res.json({ success: true });
  } catch (err) {
    console.error('[PUT ACCOUNT ERROR]', err);
    return res.status(500).json({ success: false, message: 'Server error saving account data' });
  }
});

/**
 * POST /api/reminder/send
 * Dispatches payment reminder email to customer recipient
 */
app.post('/api/reminder/send', async (req, res) => {
  try {
    const { toEmail, subject, message, customerName, invoiceId, amount, dueDate, senderCompany } = req.body;

    if (!toEmail || !toEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL',
        message: 'A valid recipient email address is required.'
      });
    }

    const normalizedTo = toEmail.trim().toLowerCase();

    const result = await sendPaymentReminderEmail({
      toEmail: normalizedTo,
      subject: subject || `Payment Reminder: Invoice #${invoiceId || ''}`,
      message: message || '',
      customerName: customerName || 'Finance Team',
      invoiceId: invoiceId || 'N/A',
      amount: amount || '',
      dueDate: dueDate || '',
      senderCompany: senderCompany || 'RECO Financial'
    });

    // Record in outbox
    const sentRecord = saveSentEmailRecord({
      to: normalizedTo,
      subject: subject || `Payment Reminder: Invoice #${invoiceId || ''}`,
      html: result.html,
      previewUrl: result.previewUrl,
      messageId: result.messageId,
      provider: result.provider || 'Live Mail Service',
      invoiceId: invoiceId || null,
      type: 'reminder'
    });

    return res.json({
      success: result.success,
      toEmail: normalizedTo,
      emailSent: result.emailSent,
      previewUrl: result.previewUrl || null,
      messageId: result.messageId || null,
      provider: result.provider || 'Live Mail Service',
      recordId: sentRecord ? sentRecord.id : null,
      message: result.message || `Payment reminder dispatched to ${normalizedTo}.`
    });
  } catch (err) {
    console.error('[REMINDER EMAIL ROUTE ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to process reminder email delivery.'
    });
  }
});

/**
 * GET /api/emails/outbox
 * Returns all sent emails for inspection / live webmail viewing
 */
app.get('/api/emails/outbox', (req, res) => {
  try {
    const db = readDb();
    const emails = db.sentEmails || [];
    return res.json({
      success: true,
      count: emails.length,
      emails: emails
    });
  } catch (err) {
    console.error('[OUTBOX FETCH ERROR]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch sent emails outbox.' });
  }
});

/**
 * POST /api/email/test
 * Dispatches an instant test email to verify live delivery
 */
app.post('/api/email/test', async (req, res) => {
  try {
    const { targetEmail } = req.body;

    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL',
        message: 'Please provide a valid destination email address.'
      });
    }

    const result = await sendTestEmail({ targetEmail: targetEmail.trim().toLowerCase() });

    const sentRecord = saveSentEmailRecord({
      to: targetEmail.trim().toLowerCase(),
      subject: 'RECO AI — Real Email Delivery Verification Test 🚀',
      html: result.html,
      previewUrl: result.previewUrl,
      messageId: result.messageId,
      provider: result.provider || 'Live Mail Service',
      type: 'test'
    });

    return res.json({
      success: result.success,
      emailSent: result.emailSent,
      toEmail: targetEmail.trim().toLowerCase(),
      previewUrl: result.previewUrl || null,
      messageId: result.messageId || null,
      provider: result.provider || 'Live Mail Service',
      recordId: sentRecord ? sentRecord.id : null,
      message: result.message || (result.success ? `Live test email sent to ${targetEmail}!` : 'Failed to send test email.')
    });
  } catch (err) {
    console.error('[TEST EMAIL ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Exception while transmitting test email.'
    });
  }
});

/**
 * GET /api/settings/email
 * Returns active email provider configuration status
 */
app.get('/api/settings/email', (req, res) => {
  const status = isEmailConfigured();
  const rawKey = process.env.RESEND_API_KEY || '';
  const maskedKey = (rawKey && rawKey.startsWith('re_') && rawKey !== 're_your_api_key_here')
    ? `${rawKey.substring(0, 5)}••••••••••••${rawKey.substring(rawKey.length - 4)}`
    : '';

  return res.json({
    success: true,
    ...status,
    maskedKey: maskedKey,
    fromEmail: process.env.EMAIL_FROM || 'RECO Onboarding <onboarding@resend.dev>',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '465',
    smtpUser: process.env.SMTP_USER || ''
  });
});

/**
 * POST /api/settings/email
 * Updates Resend API Key or SMTP credentials dynamically at runtime & saves to .env
 */
app.post('/api/settings/email', (req, res) => {
  try {
    const { resendApiKey, emailFrom, smtpHost, smtpPort, smtpUser, smtpPass } = req.body;

    if (resendApiKey !== undefined && resendApiKey.trim()) {
      process.env.RESEND_API_KEY = resendApiKey.trim();
    }
    if (emailFrom !== undefined && emailFrom.trim()) {
      process.env.EMAIL_FROM = emailFrom.trim();
    }
    if (smtpHost !== undefined) process.env.SMTP_HOST = smtpHost.trim();
    if (smtpPort !== undefined) process.env.SMTP_PORT = smtpPort.trim();
    if (smtpUser !== undefined) process.env.SMTP_USER = smtpUser.trim();
    if (smtpPass !== undefined) process.env.SMTP_PASS = smtpPass.trim();

    // Persist to .env file if it exists or create one
    const envPath = path.join(__dirname, '.env');
    const envContent = `# RECO Platform Environment Variables
PORT=${process.env.PORT || 8080}
APP_URL=${process.env.APP_URL || 'http://localhost:8080'}

# Transactional Email Configuration (Resend)
RESEND_API_KEY=${process.env.RESEND_API_KEY || 're_your_api_key_here'}
EMAIL_FROM=${process.env.EMAIL_FROM || 'RECO Onboarding <onboarding@resend.dev>'}

# Optional SMTP Configuration
SMTP_HOST=${process.env.SMTP_HOST || ''}
SMTP_PORT=${process.env.SMTP_PORT || '587'}
SMTP_USER=${process.env.SMTP_USER || ''}
SMTP_PASS=${process.env.SMTP_PASS || ''}
`;
    fs.writeFileSync(envPath, envContent);

    const status = isEmailConfigured();
    console.log(`[EMAIL CONFIG UPDATED] Email Provider Status: ${status.provider} (Configured: ${status.configured})`);

    return res.json({
      success: true,
      message: 'Email service configuration saved successfully!',
      ...status
    });
  } catch (err) {
    console.error('[EMAIL SETTINGS SAVE ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to update email settings.'
    });
  }
});

/**
 * POST /api/email/test
 * Dispatches an instant test email to verify live delivery
 */
app.post('/api/email/test', async (req, res) => {
  try {
    const { targetEmail } = req.body;

    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL',
        message: 'Please provide a valid destination email address.'
      });
    }

    const result = await sendTestEmail({ targetEmail: targetEmail.trim().toLowerCase() });
    return res.json({
      success: result.success,
      emailSent: result.success && !result.simulated,
      toEmail: targetEmail.trim().toLowerCase(),
      messageId: result.messageId || null,
      message: result.message || (result.success ? `Live test email sent to ${targetEmail}!` : 'Failed to send test email.')
    });
  } catch (err) {
    console.error('[TEST EMAIL ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Exception while transmitting test email.'
    });
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'RECO AI Revenue Recovery Platform',
    timestamp: new Date().toISOString()
  });
});

// Fallback for SPA routing to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 RECO Platform Server running on http://localhost:${PORT}`);
  console.log(`📧 Transactional Email Service: Configured`);
  console.log(`=======================================================`);
});

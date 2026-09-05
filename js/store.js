/* ==========================================================================
   RECO — AI REVENUE RECOVERY PLATFORM
   Multi-Tenant Account Data Isolation Architecture & Financial Engine
   ========================================================================== */

class RecoStore {
  constructor() {
    this.REGISTRY_KEY = 'RECO_ACCOUNTS_REGISTRY_V2';
    this.SESSION_KEY = 'RECO_ACTIVE_SESSION_V2';
    this.DEMO_ACCOUNT_ID = 'acc_demo_vikram';
    this.DEMO_EMAIL = 'vikram@apexenterprise.com';
    this.DEMO_PASSWORD = 'demopass123';

    this.listeners = [];
    this.sessionToken = null;
    this._remoteSyncTimer = null;
    this.initRegistry();
    this.activeAccountId = this.loadActiveSession();
  }

  // Demo Dataset for the dedicated Demo Account ONLY
  getDemoDataset() {
    return {
      user: {
        id: this.DEMO_ACCOUNT_ID,
        name: "Vikram Malhotra",
        email: this.DEMO_EMAIL,
        role: "Head of Credit & Collections",
        company: "Apex Enterprise Solutions Pvt. Ltd."
      },
      customers: [
        {
          id: "CUST-001",
          accountId: this.DEMO_ACCOUNT_ID,
          name: "ABC Constructions Pvt. Ltd.",
          category: "Infrastructure & Civil",
          email: "finance@abcconstructions.in",
          phone: "+91 98201 44521",
          contactPerson: "Rajesh Verma (VP Finance)",
          avgDelayDays: 14,
          historyDelayRate: 0.38,
          totalRecovered: 1840000,
          riskProgression: [65, 70, 78, 82, 85, 89],
          aiAssessment: "Severe working capital delays tied to municipal project disbursement cycles. Direct senior escalation and structured payment milestones recommended."
        },
        {
          id: "CUST-002",
          accountId: this.DEMO_ACCOUNT_ID,
          name: "XYZ Pvt Ltd",
          category: "Software & IT Services",
          email: "accounts@xyzpvt.com",
          phone: "+91 97112 88401",
          contactPerson: "Pooja Hegde (Sr. Accountant)",
          avgDelayDays: 6,
          historyDelayRate: 0.25,
          totalRecovered: 1420000,
          riskProgression: [30, 42, 45, 50, 52, 54],
          aiAssessment: "Occasional procedural bottlenecks in tax deduction verification. Friendly reminder with automated ledger reconciliation attached will likely expedite clearance."
        },
        {
          id: "CUST-003",
          accountId: this.DEMO_ACCOUNT_ID,
          name: "Sharma Enterprises",
          category: "Wholesale & Distribution",
          email: "billing@sharmaenterprises.org",
          phone: "+91 98402 11993",
          contactPerson: "Alok Sharma (Proprietor)",
          avgDelayDays: 2,
          historyDelayRate: 0.08,
          totalRecovered: 980000,
          riskProgression: [15, 12, 10, 14, 11, 12],
          aiAssessment: "Strong credit record. Delays are within standard banking clearance limits. Continuous monitoring without aggressive collections recommended."
        },
        {
          id: "CUST-004",
          accountId: this.DEMO_ACCOUNT_ID,
          name: "Apex Dynamics Corp",
          category: "Manufacturing & Heavy Components",
          email: "payables@apexdynamics.io",
          phone: "+91 99100 22345",
          contactPerson: "Karan Mehta (CFO)",
          avgDelayDays: 19,
          historyDelayRate: 0.42,
          totalRecovered: 2210000,
          riskProgression: [60, 68, 72, 79, 81, 84],
          aiAssessment: "Critical risk threshold breached. Multiple automated emails unacknowledged. Urgent executive intervention required."
        },
        {
          id: "CUST-005",
          accountId: this.DEMO_ACCOUNT_ID,
          name: "Tata Logistics Fleet",
          category: "Supply Chain & Logistics",
          email: "vendor.payments@tatalogistics.com",
          phone: "+91 98331 77610",
          contactPerson: "Nikhil Joshi (Head of Procurement)",
          avgDelayDays: 1,
          historyDelayRate: 0.04,
          totalRecovered: 4500000,
          riskProgression: [20, 18, 15, 17, 19, 18],
          aiAssessment: "High reliability enterprise account. Automated receipt confirmations recommended."
        },
        {
          id: "CUST-006",
          accountId: this.DEMO_ACCOUNT_ID,
          name: "Zenith Automations Ltd",
          category: "Industrial Robotics",
          email: "accounts@zenithauto.in",
          phone: "+91 98765 43210",
          contactPerson: "Deepak Singhania (Director)",
          avgDelayDays: 26,
          historyDelayRate: 0.60,
          totalRecovered: 1260000,
          riskProgression: [75, 80, 84, 88, 90, 92],
          aiAssessment: "Highest single exposure at risk. High probability of default without settlement restructuring. Deploy 2% early clearance incentive algorithm."
        }
      ],
      invoices: [
        {
          id: "INV-1024",
          accountId: this.DEMO_ACCOUNT_ID,
          customerId: "CUST-001",
          customer: "ABC Constructions Pvt. Ltd.",
          amount: 480000,
          issueDate: "2026-07-12",
          dueDate: "2026-08-12",
          status: "Overdue",
          recommendedAction: "Send reminder",
          aiNotes: "3 consecutive delays exceeding 14 days. Municipal project disbursement dependency detected."
        },
        {
          id: "INV-1031",
          accountId: this.DEMO_ACCOUNT_ID,
          customerId: "CUST-002",
          customer: "XYZ Pvt Ltd",
          amount: 210000,
          issueDate: "2026-07-23",
          dueDate: "2026-08-23",
          status: "Overdue",
          recommendedAction: "Follow up",
          aiNotes: "Disputed line item resolved. Customer awaiting executive sign-off."
        },
        {
          id: "INV-1042",
          accountId: this.DEMO_ACCOUNT_ID,
          customerId: "CUST-003",
          customer: "Sharma Enterprises",
          amount: 80000,
          issueDate: "2026-07-30",
          dueDate: "2026-08-30",
          status: "Overdue",
          recommendedAction: "Monitor",
          aiNotes: "Consistently clears balance within 3-5 days of due date. Low risk."
        },
        {
          id: "INV-1048",
          accountId: this.DEMO_ACCOUNT_ID,
          customerId: "CUST-004",
          customer: "Apex Dynamics Corp",
          amount: 650000,
          issueDate: "2026-08-01",
          dueDate: "2026-08-20",
          status: "Overdue",
          recommendedAction: "Escalate to CFO",
          aiNotes: "Client unresponsive to 2 automated email notifications. Phone follow-up suggested."
        },
        {
          id: "INV-1055",
          accountId: this.DEMO_ACCOUNT_ID,
          customerId: "CUST-005",
          customer: "Tata Logistics Fleet",
          amount: 320000,
          issueDate: "2026-08-05",
          dueDate: "2026-09-05",
          status: "Pending",
          recommendedAction: "Scheduled",
          aiNotes: "Standard net-30 terms. High probability of on-time clearance."
        },
        {
          id: "INV-1060",
          accountId: this.DEMO_ACCOUNT_ID,
          customerId: "CUST-006",
          customer: "Zenith Automations Ltd",
          amount: 940000,
          issueDate: "2026-07-15",
          dueDate: "2026-08-15",
          status: "Overdue",
          recommendedAction: "Offer Settlement Discount",
          aiNotes: "Large balance. 2% prompt discount projected to yield 82% recovery probability."
        },
        {
          id: "INV-1064",
          accountId: this.DEMO_ACCOUNT_ID,
          customerId: "CUST-001",
          customer: "ABC Constructions Pvt. Ltd.",
          amount: 185000,
          issueDate: "2026-08-10",
          dueDate: "2026-09-10",
          status: "Pending",
          recommendedAction: "Pre-due reminder",
          aiNotes: "Upcoming milestone invoice. Pre-reminder scheduled 3 days before due date."
        },
        {
          id: "INV-1018",
          accountId: this.DEMO_ACCOUNT_ID,
          customerId: "CUST-003",
          customer: "Sharma Enterprises",
          amount: 520000,
          issueDate: "2026-07-01",
          dueDate: "2026-07-31",
          status: "Paid",
          recommendedAction: "Cleared",
          aiNotes: "Paid in full on July 29 (2 days ahead of schedule)."
        }
      ],
      notifications: [
        {
          id: "NOTIF-1",
          accountId: this.DEMO_ACCOUNT_ID,
          type: "critical",
          title: "HIGH PRIORITY",
          message: "ABC Constructions is now overdue on Invoice #INV-1024 (₹4,80,000).",
          timestamp: "10 mins ago",
          read: false,
          invoiceId: "INV-1024"
        },
        {
          id: "NOTIF-2",
          accountId: this.DEMO_ACCOUNT_ID,
          type: "ai-insight",
          title: "AI RISK DETECTION",
          message: "3 new high-risk invoices detected following automated supplier sentiment analysis.",
          timestamp: "1 hour ago",
          read: false,
          invoiceId: null
        },
        {
          id: "NOTIF-3",
          accountId: this.DEMO_ACCOUNT_ID,
          type: "recovery",
          title: "REVENUE RECOVERED",
          message: "₹5,20,000 successfully recovered from Sharma Enterprises for Invoice #INV-1018.",
          timestamp: "3 hours ago",
          read: true,
          invoiceId: "INV-1018"
        },
        {
          id: "NOTIF-4",
          accountId: this.DEMO_ACCOUNT_ID,
          type: "critical",
          title: "UPCOMING OVERDUE RISK",
          message: "Pending invoices totaling ₹5,05,000 are approaching their due dates without intervention.",
          timestamp: "5 hours ago",
          read: true,
          invoiceId: null
        }
      ],
      settings: {
        companyName: "Apex Enterprise Solutions Pvt. Ltd.",
        gstin: "27AAACA1234F1Z8",
        currency: "INR",
        riskThreshold: 80,
        autoNudge: true
      },
      baseHistoricalRecovered: 820000,
      quarterlyActionPlan: null
    };
  }

  /* ==========================================================================
     Date helpers (timezone-safe)
     ========================================================================== */
  parseLocalDate(dateStr) {
    if (!dateStr) return null;
    const raw = String(dateStr).trim();
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  todayLocal() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  toLocalISODate(d = new Date()) {
    const date = d instanceof Date ? d : this.parseLocalDate(d) || new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  daysBetween(fromDate, toDate) {
    const a = fromDate instanceof Date ? fromDate : this.parseLocalDate(fromDate);
    const b = toDate instanceof Date ? toDate : this.parseLocalDate(toDate);
    if (!a || !b) return 0;
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((utcB - utcA) / (1000 * 60 * 60 * 24));
  }

  lastSixMonthLabels() {
    const labels = [];
    const now = this.todayLocal();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    }
    return labels;
  }

  /* ==========================================================================
     Registry / session
     ========================================================================== */
  initRegistry() {
    try {
      const existing = localStorage.getItem(this.REGISTRY_KEY);
      if (!existing) {
        const demoData = this.getDemoDataset();
        const registry = {
          [this.DEMO_ACCOUNT_ID]: {
            id: this.DEMO_ACCOUNT_ID,
            email: this.DEMO_EMAIL,
            name: "Vikram Malhotra",
            company: "Apex Enterprise Solutions Pvt. Ltd.",
            createdAt: new Date().toISOString()
          }
        };
        localStorage.setItem(this.REGISTRY_KEY, JSON.stringify(registry));
        this.saveAccountData(this.DEMO_ACCOUNT_ID, demoData, { persistRemote: false, silent: true });
      }
    } catch (e) {
      console.warn('LocalStorage error initializing registry:', e);
    }
  }

  _readSessionRaw() {
    try {
      const sessionStore = sessionStorage.getItem(this.SESSION_KEY);
      if (sessionStore) return JSON.parse(sessionStore);
    } catch (e) { /* ignore */ }
    try {
      const persistent = localStorage.getItem(this.SESSION_KEY);
      if (persistent) return JSON.parse(persistent);
    } catch (e) { /* ignore */ }
    return null;
  }

  loadActiveSession() {
    try {
      const parsed = this._readSessionRaw();
      if (parsed && parsed.accountId) {
        this.sessionToken = parsed.token || null;
        return parsed.accountId;
      }
    } catch (e) {
      console.warn('Error loading active session:', e);
    }
    this.sessionToken = null;
    return null;
  }

  saveActiveSession(accountId, token, options = {}) {
    this.activeAccountId = accountId || null;
    this.sessionToken = token || null;
    const remember = options.remember !== false;
    try {
      localStorage.removeItem(this.SESSION_KEY);
      sessionStorage.removeItem(this.SESSION_KEY);
      if (accountId) {
        const payload = JSON.stringify({ accountId, token: this.sessionToken || null });
        if (remember) localStorage.setItem(this.SESSION_KEY, payload);
        else sessionStorage.setItem(this.SESSION_KEY, payload);
      }
    } catch (e) {
      console.warn('Error saving active session:', e);
    }
    this.notify();
  }

  getAccountData(accountId) {
    if (!accountId) return null;
    try {
      const key = `RECO_ACCOUNT_DATA_${accountId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`Error reading data for account ${accountId}:`, e);
    }

    if (accountId === this.DEMO_ACCOUNT_ID) {
      return this.getDemoDataset();
    }

    return {
      user: {
        id: accountId,
        name: "User",
        email: "",
        role: "Finance Director",
        company: "My Enterprise"
      },
      customers: [],
      invoices: [],
      notifications: [],
      settings: {
        companyName: "My Enterprise",
        gstin: "",
        currency: "INR",
        riskThreshold: 80,
        autoNudge: true
      },
      baseHistoricalRecovered: 0,
      quarterlyActionPlan: null
    };
  }

  saveAccountData(accountId, data, options = {}) {
    if (!accountId || !data) return false;
    try {
      const key = `RECO_ACCOUNT_DATA_${accountId}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Error saving data for account ${accountId}:`, e);
      return false;
    }
    if (options.persistRemote !== false) {
      this.queueRemoteSync(accountId, data);
    }
    if (!options.silent) this.notify();
    return true;
  }

  queueRemoteSync(accountId, data) {
    if (!accountId || accountId === this.DEMO_ACCOUNT_ID || !this.sessionToken) return;
    if (this._remoteSyncTimer) clearTimeout(this._remoteSyncTimer);
    this._remoteSyncTimer = setTimeout(() => {
      this.syncToBackend(accountId, data);
    }, 350);
  }

  async syncToBackend(accountId, data) {
    if (!this.sessionToken || accountId === this.DEMO_ACCOUNT_ID) return;
    try {
      await fetch('/api/account', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken}`
        },
        body: JSON.stringify({ account: data })
      });
    } catch (e) {
      console.warn('Remote account sync skipped:', e.message || e);
    }
  }

  async hydrateFromBackend() {
    if (!this.sessionToken || !this.activeAccountId || this.activeAccountId === this.DEMO_ACCOUNT_ID) {
      return;
    }
    try {
      const resp = await fetch('/api/account', {
        headers: { 'Authorization': `Bearer ${this.sessionToken}` }
      });
      if (resp.status === 401) {
        this.saveActiveSession(null, null);
        return;
      }
      if (!resp.ok) return;
      const payload = await resp.json();
      if (payload && payload.success && payload.account) {
        const local = this.getAccountData(this.activeAccountId) || {};
        const remote = payload.account;
        const localCount = (local.invoices || []).length + (local.customers || []).length;
        const remoteCount = (remote.invoices || []).length + (remote.customers || []).length;
        const merged = remoteCount >= localCount ? {
          ...remote,
          user: remote.user || local.user
        } : {
          ...local,
          user: remote.user || local.user
        };
        merged.quarterlyActionPlan = remote.quarterlyActionPlan || local.quarterlyActionPlan || null;
        this.saveAccountData(this.activeAccountId, merged, { persistRemote: remoteCount < localCount, silent: false });
      }
    } catch (e) {
      console.warn('Could not hydrate account from backend:', e.message || e);
    }
  }

  getCurrentAccount() {
    if (!this.activeAccountId) return null;
    return this.getAccountData(this.activeAccountId);
  }

  saveCurrentAccount(data) {
    if (!this.activeAccountId) return false;
    return this.saveAccountData(this.activeAccountId, data);
  }

  get state() {
    if (!this.activeAccountId) {
      return {
        auth: { isAuthenticated: false, user: null },
        customers: [],
        invoices: [],
        notifications: [],
        settings: {}
      };
    }
    const acc = this.getCurrentAccount();
    if (!acc) {
      return {
        auth: { isAuthenticated: false, user: null },
        customers: [],
        invoices: [],
        notifications: [],
        settings: {}
      };
    }
    return {
      auth: {
        isAuthenticated: true,
        user: acc.user
      },
      customers: acc.customers || [],
      invoices: acc.invoices || [],
      notifications: acc.notifications || [],
      settings: acc.settings || {}
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => {
      try { fn(this.state); } catch (e) { console.warn('Store listener error:', e); }
    });
  }

  /* ==========================================================================
     Deterministic AI Risk Scoring Engine (Isolated to Account Ledger)
     ========================================================================== */
  calculateInvoiceRisk(invoice, accountCustomers) {
    if (!invoice || invoice.status === 'Paid') {
      return { score: 0, level: 'LOW', daysOverdue: 0 };
    }

    const today = this.todayLocal();
    const dueDate = this.parseLocalDate(invoice.dueDate);
    const daysOverdue = dueDate ? Math.max(0, this.daysBetween(dueDate, today)) : 0;

    const cust = (accountCustomers || []).find(c =>
      c.id === invoice.customerId ||
      (c.name && invoice.customer && c.name.toLowerCase() === String(invoice.customer).toLowerCase())
    ) || {
      avgDelayDays: 8,
      historyDelayRate: 0.2
    };

    let overdueScore = 0;
    if (daysOverdue > 0) {
      overdueScore = Math.min(45, Math.round(daysOverdue * 2.2));
    }

    const custDelayScore = Math.min(30, Math.round((cust.historyDelayRate || 0.2) * 40 + (cust.avgDelayDays || 5) * 0.5));

    let amountScore = 5;
    if (invoice.amount > 800000) amountScore = 25;
    else if (invoice.amount > 500000) amountScore = 20;
    else if (invoice.amount > 200000) amountScore = 14;
    else if (invoice.amount > 100000) amountScore = 9;

    let totalScore = overdueScore + custDelayScore + amountScore;
    totalScore = Math.min(99, Math.max(5, totalScore));

    let level = 'LOW';
    if (totalScore >= 80) level = 'HIGH';
    else if (totalScore >= 50) level = 'MEDIUM';

    return {
      score: totalScore,
      level: level,
      daysOverdue: daysOverdue
    };
  }

  /* ==========================================================================
     Dynamic Portfolio Calculations (Isolated strictly to current account)
     ========================================================================== */
  getComputedMetrics() {
    const acc = this.getCurrentAccount();
    if (!acc || !this.activeAccountId) {
      return this.getEmptyMetrics();
    }

    let totalOutstanding = 0;
    let atRiskAmount = 0;
    let overdueCount = 0;
    let highRiskCount = 0;
    let pendingCount = 0;
    let paidCount = 0;
    let recoveredTotal = 0;
    let upcoming7Count = 0;
    let upcoming7Amount = 0;
    let overdueAmount = 0;
    let weightedOpenDays = 0;

    const today = this.todayLocal();
    const in7 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);

    const enrichedInvoices = (acc.invoices || []).map(inv => {
      const riskInfo = this.calculateInvoiceRisk(inv, acc.customers);
      const isOverdue = inv.status !== 'Paid' && (inv.status === 'Overdue' || riskInfo.daysOverdue > 0);
      const effectiveStatus = inv.status === 'Paid' ? 'Paid' : (isOverdue ? 'Overdue' : 'Pending');

      if (effectiveStatus !== 'Paid') {
        totalOutstanding += Number(inv.amount) || 0;
        weightedOpenDays += (riskInfo.daysOverdue || 0) * (Number(inv.amount) || 0);
        if (riskInfo.score >= (acc.settings && acc.settings.riskThreshold || 80)) {
          atRiskAmount += Number(inv.amount) || 0;
          highRiskCount++;
        }
        if (effectiveStatus === 'Overdue') {
          overdueCount++;
          overdueAmount += Number(inv.amount) || 0;
        } else {
          pendingCount++;
          const due = this.parseLocalDate(inv.dueDate);
          if (due && due >= today && due <= in7) {
            upcoming7Count++;
            upcoming7Amount += Number(inv.amount) || 0;
          }
        }
      } else {
        paidCount++;
        recoveredTotal += Number(inv.amount) || 0;
      }

      return {
        ...inv,
        amount: Number(inv.amount) || 0,
        status: effectiveStatus,
        daysOverdue: riskInfo.daysOverdue,
        riskScore: riskInfo.score,
        riskLevel: riskInfo.level
      };
    });

    const totalInvoiced = totalOutstanding + recoveredTotal;
    const recoveryRate = totalInvoiced > 0 ? (recoveredTotal / totalInvoiced) * 100 : 0;
    const highRiskExposurePct = totalOutstanding > 0 ? (atRiskAmount / totalOutstanding) * 100 : 0;
    const dso = totalOutstanding > 0 ? weightedOpenDays / totalOutstanding : 0;

    const paidWithDates = enrichedInvoices.filter(inv => inv.status === 'Paid' && inv.issueDate && inv.dueDate);
    let avgRecoveryCycle = 0;
    if (paidWithDates.length > 0) {
      const cycleSum = (acc.customers || []).reduce((sum, c) => sum + (Number(c.avgDelayDays) || 0), 0);
      avgRecoveryCycle = (acc.customers || []).length > 0
        ? cycleSum / acc.customers.length
        : 0;
    } else if ((acc.customers || []).length > 0) {
      avgRecoveryCycle = (acc.customers || []).reduce((sum, c) => sum + (Number(c.avgDelayDays) || 0), 0) / acc.customers.length;
    }

    const monthKey = (dateStr) => {
      const d = this.parseLocalDate(dateStr);
      if (!d) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const trendLabels = this.lastSixMonthLabels();
    const trendKeys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      trendKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const trendRecovered = trendKeys.map(() => 0);
    const trendAtRisk = trendKeys.map(() => 0);

    enrichedInvoices.forEach(inv => {
      const key = monthKey(inv.status === 'Paid' ? (inv.paidDate || inv.dueDate || inv.issueDate) : (inv.dueDate || inv.issueDate));
      const idx = trendKeys.indexOf(key);
      if (idx === -1) return;
      if (inv.status === 'Paid') trendRecovered[idx] += inv.amount / 100000;
      else if (inv.riskScore >= (acc.settings && acc.settings.riskThreshold || 80)) trendAtRisk[idx] += inv.amount / 100000;
    });
    if (trendAtRisk.every(v => v === 0) && atRiskAmount > 0) {
      trendAtRisk[trendAtRisk.length - 1] = +(atRiskAmount / 100000).toFixed(1);
    }
    if (trendRecovered.every(v => v === 0) && recoveredTotal > 0) {
      trendRecovered[trendRecovered.length - 1] = +(recoveredTotal / 100000).toFixed(1);
    }

    const prevRec = trendRecovered[trendRecovered.length - 2] || 0;
    const curRec = trendRecovered[trendRecovered.length - 1] || +(recoveredTotal / 100000).toFixed(1);
    let recoveredMomLabel = 'No prior period data';
    let recoveredMomPositive = false;
    if (prevRec > 0) {
      const pct = ((curRec - prevRec) / prevRec) * 100;
      recoveredMomLabel = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs last month`;
      recoveredMomPositive = pct >= 0;
    } else if (recoveredTotal > 0) {
      recoveredMomLabel = 'First recovery period';
      recoveredMomPositive = true;
    }

    let breakdown = {
      labels: ['Recovered', 'Pending (Low/Med Risk)', 'High Risk Overdue'],
      data: [
        +(recoveredTotal / 100000).toFixed(1),
        +((Math.max(0, totalOutstanding - atRiskAmount)) / 100000).toFixed(1),
        +(atRiskAmount / 100000).toFixed(1)
      ],
      colors: ['#D5B893', '#617891', '#632024']
    };

    if (totalInvoiced === 0) {
      breakdown = {
        labels: ['No Active Data'],
        data: [1],
        colors: ['#617891']
      };
    }

    let aging = { '0-15d': 0, '16-30d': 0, '31-60d': 0, '60+d': 0 };
    enrichedInvoices.forEach(inv => {
      if (inv.status === 'Overdue') {
        const d = inv.daysOverdue;
        const amtLakh = inv.amount / 100000;
        if (d <= 15) aging['0-15d'] += amtLakh;
        else if (d <= 30) aging['16-30d'] += amtLakh;
        else if (d <= 60) aging['31-60d'] += amtLakh;
        else aging['60+d'] += amtLakh;
      }
    });

    const channelBase = Math.max(0, Math.min(100, recoveryRate || 0));
    const channelRates = (acc.invoices || []).length === 0
      ? [0, 0, 0, 0]
      : [
          Math.max(0, Math.min(100, Math.round(channelBase * 1.08 + 4))),
          Math.max(0, Math.min(100, Math.round(channelBase * 1.18 + 6))),
          Math.max(0, Math.min(100, Math.round(channelBase * 0.82 + 2))),
          Math.max(0, Math.min(100, Math.round(channelBase * 1.22 + 8)))
        ];

    const enrichedCustomers = (acc.customers || []).map(cust => {
      const custInvoices = enrichedInvoices.filter(i =>
        i.customerId === cust.id ||
        (i.customer && cust.name && i.customer.toLowerCase() === cust.name.toLowerCase())
      );
      const custOutstanding = custInvoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
      const custPaidSum = custInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
      const custPaidCount = custInvoices.filter(i => i.status === 'Paid').length;
      const onTimeRate = custInvoices.length > 0 ? Math.round((custPaidCount / custInvoices.length) * 100) : 100;
      const overdueDays = custInvoices.filter(i => i.status === 'Overdue').map(i => i.daysOverdue);
      const computedAvgDelay = overdueDays.length
        ? Math.round(overdueDays.reduce((a, b) => a + b, 0) / overdueDays.length)
        : (cust.avgDelayDays || 0);
      const recoveredAmt = Math.max(Number(cust.totalRecovered) || 0, custPaidSum);

      const maxRisk = custInvoices.reduce((max, i) => Math.max(max, i.riskScore || 0), custInvoices.length ? 0 : 15);
      const riskLevel = maxRisk >= 80 ? 'HIGH' : (maxRisk >= 50 ? 'MEDIUM' : 'LOW');

      return {
        ...cust,
        totalOutstanding: `₹${(custOutstanding / 100000).toFixed(1)}L`,
        totalOutstandingRaw: custOutstanding,
        invoicesCount: custInvoices.length,
        paidOnTime: `${onTimeRate}%`,
        avgDelay: `${computedAvgDelay} days`,
        avgDelayDays: computedAvgDelay,
        totalRecovered: recoveredAmt,
        riskScore: maxRisk,
        riskLevel: riskLevel,
        recentInvoices: custInvoices.map(i => i.id)
      };
    });

    return {
      accountId: acc.user && acc.user.id,
      isEmpty: enrichedInvoices.length === 0,
      totalOutstandingFormatted: `₹${(totalOutstanding / 100000).toFixed(1)}L`,
      totalOutstandingRaw: totalOutstanding,
      atRiskFormatted: `₹${(atRiskAmount / 100000).toFixed(1)}L`,
      atRiskRaw: atRiskAmount,
      overdueCount: overdueCount,
      overdueAmountRaw: overdueAmount,
      recoveredThisMonthFormatted: `₹${(recoveredTotal / 100000).toFixed(1)}L`,
      recoveredThisMonthRaw: recoveredTotal,
      highRiskCount: highRiskCount,
      pendingCount: pendingCount,
      paidCount: paidCount,
      totalInvoicesCount: enrichedInvoices.length,
      recoveryRate: recoveryRate,
      recoveryRateFormatted: `${recoveryRate.toFixed(0)}%`,
      recoveryOpportunityFormatted: `₹${((atRiskAmount * 0.55) / 100000).toFixed(1)}L`,
      upcoming7Count,
      upcoming7Amount,
      upcoming7Formatted: `₹${(upcoming7Amount / 100000).toFixed(1)}L`,
      recoveredMomLabel,
      recoveredMomPositive,
      avgRecoveryCycle: avgRecoveryCycle,
      highRiskExposurePct,
      dso,
      channelRates,
      recoveryTrends: {
        labels: trendLabels,
        recovered: trendRecovered.map(v => +v.toFixed(1)),
        atRisk: trendAtRisk.map(v => +v.toFixed(1))
      },
      breakdown: breakdown,
      agingBuckets: [
        +aging['0-15d'].toFixed(1),
        +aging['16-30d'].toFixed(1),
        +aging['31-60d'].toFixed(1),
        +aging['60+d'].toFixed(1)
      ],
      invoices: enrichedInvoices,
      customers: enrichedCustomers
    };
  }

  getEmptyMetrics() {
    return {
      accountId: null,
      isEmpty: true,
      totalOutstandingFormatted: "₹0.0L",
      totalOutstandingRaw: 0,
      atRiskFormatted: "₹0.0L",
      atRiskRaw: 0,
      overdueCount: 0,
      overdueAmountRaw: 0,
      recoveredThisMonthFormatted: "₹0.0L",
      recoveredThisMonthRaw: 0,
      highRiskCount: 0,
      pendingCount: 0,
      paidCount: 0,
      totalInvoicesCount: 0,
      recoveryRate: 0,
      recoveryRateFormatted: "0%",
      recoveryOpportunityFormatted: "₹0.0L",
      upcoming7Count: 0,
      upcoming7Amount: 0,
      upcoming7Formatted: "₹0.0L",
      recoveredMomLabel: "No prior period data",
      recoveredMomPositive: false,
      avgRecoveryCycle: 0,
      highRiskExposurePct: 0,
      dso: 0,
      channelRates: [0, 0, 0, 0],
      recoveryTrends: {
        labels: this.lastSixMonthLabels(),
        recovered: [0, 0, 0, 0, 0, 0],
        atRisk: [0, 0, 0, 0, 0, 0]
      },
      breakdown: {
        labels: ['No Active Data'],
        data: [1],
        colors: ['#617891']
      },
      agingBuckets: [0, 0, 0, 0],
      invoices: [],
      customers: []
    };
  }

  /* ==========================================================================
     CRUD Operations (Strictly isolated by Account ID)
     ========================================================================== */
  nextInvoiceId(acc) {
    const nums = (acc.invoices || []).map(i => {
      const m = String(i.id || '').match(/INV-(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    });
    const next = Math.max(1000, ...nums, 1000) + 1;
    return `INV-${next}`;
  }

  nextCustomerId() {
    return `CUST-${Date.now().toString(36).toUpperCase()}`;
  }

  validateInvoiceInput(invoiceData) {
    const customer = String(invoiceData.customer || '').trim();
    const amount = Number(invoiceData.amount);
    const dueDate = String(invoiceData.dueDate || '').trim();
    if (!customer) return 'Customer name is required.';
    if (!Number.isFinite(amount) || amount <= 0) return 'Invoice amount must be a positive number.';
    if (amount > 10000000000) return 'Invoice amount is unrealistically large.';
    if (!dueDate || !this.parseLocalDate(dueDate)) return 'Please provide a valid due date.';
    return null;
  }

  findCustomer(acc, { customerId, customerName }) {
    if (customerId) {
      const byId = acc.customers.find(c => c.id === customerId);
      if (byId) return byId;
    }
    if (customerName) {
      return acc.customers.find(c => c.name && c.name.toLowerCase() === String(customerName).toLowerCase()) || null;
    }
    return null;
  }

  applyRecoveredDelta(acc, invoice, delta) {
    if (!invoice || !delta) return;
    const cust = this.findCustomer(acc, { customerId: invoice.customerId, customerName: invoice.customer });
    if (cust) {
      cust.totalRecovered = Math.max(0, (Number(cust.totalRecovered) || 0) + delta);
    }
  }

  addInvoice(invoiceData) {
    const acc = this.getCurrentAccount();
    if (!acc) return null;

    const error = this.validateInvoiceInput(invoiceData);
    if (error) return { error };

    const accountId = acc.user.id;
    const newId = this.nextInvoiceId(acc);
    const customerName = String(invoiceData.customer).trim();

    let cust = this.findCustomer(acc, { customerName });
    let customerId = cust ? cust.id : this.nextCustomerId();

    if (!cust) {
      const slug = customerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const newCustomer = {
        id: customerId,
        accountId: accountId,
        name: customerName,
        category: invoiceData.category || "Corporate Commercial",
        email: `finance@${slug || 'client'}.com`,
        phone: "+91 98000 " + Math.floor(10000 + Math.random() * 90000),
        contactPerson: "Finance Lead",
        avgDelayDays: 5,
        historyDelayRate: 0.1,
        totalRecovered: 0,
        riskProgression: [20, 25, 30],
        aiAssessment: "Newly registered debtor for this account. Active monitoring enabled."
      };
      acc.customers.push(newCustomer);
      cust = newCustomer;
    }

    const status = invoiceData.status || "Pending";
    const newInvoice = {
      id: newId,
      accountId: accountId,
      customerId: customerId,
      customer: customerName,
      amount: Number(invoiceData.amount),
      issueDate: invoiceData.issueDate || this.toLocalISODate(),
      dueDate: invoiceData.dueDate,
      status,
      recommendedAction: invoiceData.recommendedAction || "Monitor",
      aiNotes: invoiceData.aiNotes || "Newly recorded invoice in account ledger."
    };

    acc.invoices.unshift(newInvoice);

    if (status === 'Paid') {
      this.applyRecoveredDelta(acc, newInvoice, newInvoice.amount);
    }

    const risk = this.calculateInvoiceRisk(newInvoice, acc.customers);
    if (risk.level === 'HIGH') {
      acc.notifications.unshift({
        id: `NOTIF-${Date.now()}`,
        accountId: accountId,
        type: 'critical',
        title: 'HIGH RISK INVOICE DETECTED',
        message: `Invoice #${newId} for ${newInvoice.customer} (₹${(newInvoice.amount).toLocaleString('en-IN')}) flagged as HIGH RISK (${risk.score}%).`,
        timestamp: "Just now",
        read: false,
        invoiceId: newId
      });
    } else {
      acc.notifications.unshift({
        id: `NOTIF-${Date.now()}`,
        accountId: accountId,
        type: 'ai-insight',
        title: 'INVOICE REGISTERED',
        message: `Invoice #${newId} for ${newInvoice.customer} recorded. Due on ${newInvoice.dueDate}.`,
        timestamp: "Just now",
        read: false,
        invoiceId: newId
      });
    }

    this.saveCurrentAccount(acc);
    return newInvoice;
  }

  editInvoice(id, updateData) {
    const acc = this.getCurrentAccount();
    if (!acc) return false;

    const index = acc.invoices.findIndex(i => i.id === id);
    if (index === -1) return false;

    const prev = acc.invoices[index];
    const nextCustomer = updateData.customer !== undefined ? String(updateData.customer).trim() : prev.customer;
    const nextAmount = updateData.amount !== undefined ? Number(updateData.amount) : Number(prev.amount);
    const nextDue = updateData.dueDate !== undefined ? String(updateData.dueDate).trim() : prev.dueDate;

    const error = this.validateInvoiceInput({ customer: nextCustomer, amount: nextAmount, dueDate: nextDue });
    if (error) return { error };

    if (nextCustomer && nextCustomer.toLowerCase() !== String(prev.customer || '').toLowerCase()) {
      let cust = this.findCustomer(acc, { customerName: nextCustomer });
      if (!cust) {
        cust = {
          id: this.nextCustomerId(),
          accountId: acc.user.id,
          name: nextCustomer,
          category: "Corporate Commercial",
          email: `finance@${nextCustomer.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}.com`,
          phone: "+91 98000 " + Math.floor(10000 + Math.random() * 90000),
          contactPerson: "Finance Lead",
          avgDelayDays: 5,
          historyDelayRate: 0.1,
          totalRecovered: 0,
          riskProgression: [20, 25, 30],
          aiAssessment: "Debtor reassigned from invoice edit. Active monitoring enabled."
        };
        acc.customers.push(cust);
      }
      updateData.customerId = cust.id;
      updateData.customer = nextCustomer;
    }

    const nextStatus = updateData.status !== undefined ? updateData.status : prev.status;
    if (prev.status !== 'Paid' && nextStatus === 'Paid') {
      this.applyRecoveredDelta(acc, { ...prev, customer: nextCustomer, customerId: updateData.customerId || prev.customerId }, nextAmount);
      updateData.paidDate = this.toLocalISODate();
      updateData.recommendedAction = updateData.recommendedAction || "Cleared";
    } else if (prev.status === 'Paid' && nextStatus !== 'Paid') {
      this.applyRecoveredDelta(acc, prev, -(Number(prev.amount) || 0));
      updateData.paidDate = null;
    } else if (prev.status === 'Paid' && nextStatus === 'Paid' && nextAmount !== Number(prev.amount)) {
      this.applyRecoveredDelta(acc, prev, nextAmount - (Number(prev.amount) || 0));
    }

    acc.invoices[index] = {
      ...prev,
      ...updateData,
      amount: nextAmount,
      customer: nextCustomer,
      dueDate: nextDue
    };

    this.saveCurrentAccount(acc);
    return true;
  }

  deleteInvoice(id) {
    const acc = this.getCurrentAccount();
    if (!acc) return false;

    const inv = acc.invoices.find(i => i.id === id);
    if (!inv) return false;

    if (inv.status === 'Paid') {
      this.applyRecoveredDelta(acc, inv, -(Number(inv.amount) || 0));
    }

    acc.invoices = acc.invoices.filter(i => i.id !== id);
    acc.notifications.unshift({
      id: `NOTIF-${Date.now()}`,
      accountId: acc.user.id,
      type: 'ai-insight',
      title: 'INVOICE DELETED',
      message: `Invoice #${id} was deleted from your ledger.`,
      timestamp: "Just now",
      read: false,
      invoiceId: null
    });

    this.saveCurrentAccount(acc);
    return true;
  }

  updateInvoiceStatus(id, newStatus) {
    const acc = this.getCurrentAccount();
    if (!acc) return false;

    const inv = acc.invoices.find(i => i.id === id);
    if (!inv) return false;
    if (inv.status === newStatus) return true;

    const prevStatus = inv.status;
    inv.status = newStatus;
    if (newStatus === 'Paid' && prevStatus !== 'Paid') {
      inv.recommendedAction = "Cleared";
      inv.paidDate = this.toLocalISODate();
      inv.aiNotes = `Settled and cleared on ${this.todayLocal().toLocaleDateString('en-US')}.`;
      this.applyRecoveredDelta(acc, inv, Number(inv.amount) || 0);
      acc.notifications.unshift({
        id: `NOTIF-${Date.now()}`,
        accountId: acc.user.id,
        type: 'recovery',
        title: 'REVENUE RECOVERED',
        message: `₹${Number(inv.amount).toLocaleString('en-IN')} recovered for Invoice #${inv.id} (${inv.customer}).`,
        timestamp: "Just now",
        read: false,
        invoiceId: inv.id
      });
    } else if (prevStatus === 'Paid' && newStatus !== 'Paid') {
      this.applyRecoveredDelta(acc, inv, -(Number(inv.amount) || 0));
      inv.paidDate = null;
    }

    this.saveCurrentAccount(acc);
    return true;
  }

  markAllNotificationsRead() {
    const acc = this.getCurrentAccount();
    if (!acc) return;
    acc.notifications.forEach(n => n.read = true);
    this.saveCurrentAccount(acc);
  }

  markNotificationRead(id) {
    const acc = this.getCurrentAccount();
    if (!acc) return;
    const notif = acc.notifications.find(n => n.id === id);
    if (!notif || notif.read) return;
    notif.read = true;
    this.saveCurrentAccount(acc);
  }

  updateSettings(settingsData) {
    const acc = this.getCurrentAccount();
    if (!acc) return;
    acc.settings = { ...acc.settings, ...settingsData };
    if (settingsData.companyName) {
      acc.user.company = settingsData.companyName;
    }
    this.saveCurrentAccount(acc);
  }

  getQuarterlyActionPlan() {
    const acc = this.getCurrentAccount();
    if (!acc || !acc.quarterlyActionPlan || typeof acc.quarterlyActionPlan !== 'object') return null;
    return acc.quarterlyActionPlan;
  }

  strategyFingerprint(plan) {
    if (!plan) return '';
    const levers = Array.isArray(plan.levers) ? plan.levers.slice().map(l => String(l)).sort() : [];
    return `${Number(plan.recoveryTarget) || 0}|${levers.join('|')}`;
  }

  async applyQuarterlyStrategy(plan) {
    const acc = this.getCurrentAccount();
    if (!acc || !this.activeAccountId || !plan) {
      return { success: false, message: 'Unable to save strategy. Please try again.' };
    }

    const nextPlan = {
      accountId: this.activeAccountId,
      recoveryTarget: Number(plan.recoveryTarget),
      projectedRecoveryFormatted: String(plan.projectedRecoveryFormatted || ''),
      currentRecoveryFormatted: String(plan.currentRecoveryFormatted || ''),
      additionalRecoveryFormatted: String(plan.additionalRecoveryFormatted || ''),
      outstandingFormatted: String(plan.outstandingFormatted || ''),
      recoveryRateFormatted: String(plan.recoveryRateFormatted || ''),
      unrecoveredFormatted: String(plan.unrecoveredFormatted || ''),
      levers: Array.isArray(plan.levers) ? plan.levers.slice() : [],
      status: 'ACTIVE',
      appliedAt: new Date().toISOString()
    };

    const existing = acc.quarterlyActionPlan;
    if (existing && existing.status === 'ACTIVE' && this.strategyFingerprint(existing) === this.strategyFingerprint(nextPlan)) {
      return { success: true, alreadyActive: true, plan: existing };
    }

    const previous = existing || null;
    acc.quarterlyActionPlan = nextPlan;
    const saved = this.saveAccountData(this.activeAccountId, acc, { persistRemote: false });
    if (!saved) {
      return { success: false, message: 'Unable to save strategy. Please try again.' };
    }

    if (this.sessionToken && this.activeAccountId !== this.DEMO_ACCOUNT_ID) {
      try {
        const resp = await fetch('/api/account', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.sessionToken}`
          },
          body: JSON.stringify({ account: acc })
        });
        if (!resp.ok) {
          throw new Error('remote save failed');
        }
      } catch (e) {
        acc.quarterlyActionPlan = previous;
        this.saveAccountData(this.activeAccountId, acc, { persistRemote: false });
        return { success: false, message: 'Unable to save strategy. Please try again.' };
      }
    }

    return { success: true, alreadyActive: false, plan: nextPlan };
  }

  /* ==========================================================================
     Authentication & Multi-Account Switching (with Real Backend Email API)
     ========================================================================== */
  async sha256Hex(text) {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let hash = 5381;
    const s = String(text);
    for (let i = 0; i < s.length; i++) hash = ((hash << 5) + hash) + s.charCodeAt(i);
    return (hash >>> 0).toString(16);
  }

  async login(email, password, options = {}) {
    if (!email || !password) {
      return { success: false, message: "Please provide both email and password." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const remember = options.remember !== false;

    if (normalizedEmail === this.DEMO_EMAIL) {
      if (password !== this.DEMO_PASSWORD) {
        return { success: false, message: "Incorrect password. Please try again." };
      }
    }

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password })
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.success) {
        if (data.accountId !== this.DEMO_ACCOUNT_ID && data.user) {
          const existing = this.getAccountData(data.accountId);
          if (!existing || !existing.user || !existing.user.email) {
            this.initLocalEmptyAccount(data.accountId, data.user.name, data.user.email, data.user.company, null);
          } else if (existing.user) {
            existing.user = { ...existing.user, ...data.user };
            this.saveAccountData(data.accountId, existing, { persistRemote: false, silent: true });
          }
        }
        this.saveActiveSession(data.accountId, data.token, { remember });
        await this.hydrateFromBackend();
        return { success: true, accountId: data.accountId };
      }
      if (!resp.ok) {
        return { success: false, message: data.message || "Login failed." };
      }
    } catch (apiErr) {
      console.warn('Backend API login offline, falling back to local registry:', apiErr);
    }

    try {
      const registryRaw = localStorage.getItem(this.REGISTRY_KEY);
      const registry = registryRaw ? JSON.parse(registryRaw) : {};
      const accountEntry = Object.values(registry).find(a => a.email && a.email.toLowerCase() === normalizedEmail);
      if (accountEntry) {
        if (normalizedEmail === this.DEMO_EMAIL) {
          this.saveActiveSession(this.DEMO_ACCOUNT_ID, null, { remember });
          return { success: true, accountId: this.DEMO_ACCOUNT_ID };
        }
        if (accountEntry.passwordHash) {
          const candidate = await this.sha256Hex(`${normalizedEmail}::${password}`);
          if (candidate !== accountEntry.passwordHash) {
            return { success: false, message: "Incorrect password. Please try again." };
          }
        } else if (accountEntry.password && accountEntry.password !== password) {
          return { success: false, message: "Incorrect password. Please try again." };
        } else if (!accountEntry.passwordHash && !accountEntry.password) {
          return { success: false, message: "Cannot verify this account offline. Please try again when the server is available." };
        }
        this.saveActiveSession(accountEntry.id, null, { remember });
        return { success: true, accountId: accountEntry.id };
      }
    } catch (e) {
      console.warn('Error during local login lookup:', e);
    }

    return { success: false, message: "Account not found. Please create an account." };
  }

  async signup(name, email, company, password) {
    if (!name || !email || !password) {
      return { success: false, message: "All fields are required." };
    }
    if (password.length < 6) {
      return { success: false, message: "Password must be at least 6 characters." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return { success: false, message: "Please enter a valid email address." };
    }

    try {
      const resp = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          company: (company || "Enterprise Corp").trim(),
          password
        })
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data.success) {
        return {
          success: false,
          error: data.error,
          message: data.message || "Signup failed."
        };
      }

      const newAccountId = data.accountId;
      this.initLocalEmptyAccount(newAccountId, name.trim(), normalizedEmail, company, null);
      this.saveActiveSession(newAccountId, data.token, { remember: true });
      await this.hydrateFromBackend();

      return {
        success: true,
        accountId: newAccountId,
        emailSent: data.emailSent,
        message: data.message
      };
    } catch (apiErr) {
      console.warn('Backend API signup offline, performing local registration:', apiErr);
    }

    let registry = {};
    try {
      const raw = localStorage.getItem(this.REGISTRY_KEY);
      if (raw) registry = JSON.parse(raw);
    } catch (e) { /* ignore */ }

    const existing = Object.values(registry).find(a => a.email && a.email.toLowerCase() === normalizedEmail);
    if (existing || normalizedEmail === this.DEMO_EMAIL) {
      return {
        success: false,
        message: "An account with this email already exists. Please log in instead."
      };
    }

    const newAccountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const passwordHash = await this.sha256Hex(`${normalizedEmail}::${password}`);
    this.initLocalEmptyAccount(newAccountId, name.trim(), normalizedEmail, company, null, passwordHash);
    this.saveActiveSession(newAccountId, null, { remember: true });

    return {
      success: true,
      accountId: newAccountId,
      emailSent: false,
      message: "Account created successfully!"
    };
  }

  initLocalEmptyAccount(newAccountId, name, normalizedEmail, company, password, passwordHash) {
    let registry = {};
    try {
      const raw = localStorage.getItem(this.REGISTRY_KEY);
      if (raw) registry = JSON.parse(raw);
    } catch (e) { /* ignore */ }

    registry[newAccountId] = {
      id: newAccountId,
      email: normalizedEmail,
      name: name,
      company: company || "Enterprise Corp",
      createdAt: new Date().toISOString()
    };
    if (passwordHash) registry[newAccountId].passwordHash = passwordHash;
    try {
      localStorage.setItem(this.REGISTRY_KEY, JSON.stringify(registry));
    } catch (e) {
      console.warn('Could not persist account registry:', e);
    }

    const emptyAccountData = {
      user: {
        id: newAccountId,
        name: name,
        email: normalizedEmail,
        company: company || "Enterprise Corp",
        role: "Finance Director"
      },
      customers: [],
      invoices: [],
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          accountId: newAccountId,
          type: "ai-insight",
          title: "WELCOME TO RECO",
          message: `Your isolated revenue workspace for ${company || 'your enterprise'} is ready. Click '+ Add Invoice' to start tracking.`,
          timestamp: "Just now",
          read: false,
          invoiceId: null
        }
      ],
      settings: {
        companyName: company || "Enterprise Corp",
        gstin: "",
        currency: "INR",
        riskThreshold: 80,
        autoNudge: true
      },
      baseHistoricalRecovered: 0,
      quarterlyActionPlan: null
    };

    this.saveAccountData(newAccountId, emptyAccountData, { persistRemote: false, silent: true });
  }

  logout() {
    const token = this.sessionToken;
    this.saveActiveSession(null, null);
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
  }

  resetDemoAccount() {
    const demoData = this.getDemoDataset();
    this.saveAccountData(this.DEMO_ACCOUNT_ID, demoData, { persistRemote: false });
    this.saveActiveSession(this.DEMO_ACCOUNT_ID, this.sessionToken, { remember: true });
  }
}

window.recoStore = new RecoStore();

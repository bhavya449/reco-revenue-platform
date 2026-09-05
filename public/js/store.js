/* ==========================================================================
   RECO — AI REVENUE RECOVERY PLATFORM
   Multi-Tenant Account Data Isolation Architecture & Financial Engine
   ========================================================================== */

class RecoStore {
  constructor() {
    this.REGISTRY_KEY = 'RECO_ACCOUNTS_REGISTRY_V2';
    this.SESSION_KEY = 'RECO_ACTIVE_SESSION_V2';
    this.DEMO_ACCOUNT_ID = 'acc_demo_vikram';
    
    this.listeners = [];
    this.initRegistry();
    this.activeAccountId = this.loadActiveSession();
  }

  // Demo Dataset for the dedicated Demo Account ONLY
  getDemoDataset() {
    return {
      user: {
        id: this.DEMO_ACCOUNT_ID,
        name: "Vikram Malhotra",
        email: "vikram@apexenterprise.com",
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
          message: "ABC Constructions is now 18 days overdue on Invoice #INV-1024 (₹4,80,000).",
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
          message: "5 invoices totaling ₹5,80,000 are projected to become overdue tomorrow without intervention.",
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
      baseHistoricalRecovered: 820000
    };
  }

  // Initialize Account Registry
  initRegistry() {
    try {
      const existing = localStorage.getItem(this.REGISTRY_KEY);
      if (!existing) {
        // Create initial registry with ONLY the Demo account
        const demoData = this.getDemoDataset();
        const registry = {
          [this.DEMO_ACCOUNT_ID]: {
            id: this.DEMO_ACCOUNT_ID,
            email: "vikram@apexenterprise.com",
            password: "demopass123",
            name: "Vikram Malhotra",
            company: "Apex Enterprise Solutions Pvt. Ltd.",
            createdAt: new Date().toISOString()
          }
        };
        localStorage.setItem(this.REGISTRY_KEY, JSON.stringify(registry));
        this.saveAccountData(this.DEMO_ACCOUNT_ID, demoData);
      }
    } catch (e) {
      console.warn('LocalStorage error initializing registry:', e);
    }
  }

  loadActiveSession() {
    try {
      const session = localStorage.getItem(this.SESSION_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed && parsed.accountId) {
          return parsed.accountId;
        }
      }
    } catch (e) {
      console.warn('Error loading active session:', e);
    }
    return this.DEMO_ACCOUNT_ID;
  }

  saveActiveSession(accountId) {
    this.activeAccountId = accountId;
    try {
      if (accountId) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify({ accountId }));
      } else {
        localStorage.removeItem(this.SESSION_KEY);
      }
    } catch (e) {
      console.warn('Error saving active session:', e);
    }
    this.notify();
  }

  isDemoSession() {
    return this.activeAccountId === this.DEMO_ACCOUNT_ID;
  }

  async enterDemoWorkspace() {
    let demoData = this.getAccountData(this.DEMO_ACCOUNT_ID);
    if (!demoData || !demoData.customers || demoData.customers.length === 0) {
      demoData = this.getDemoDataset();
      this.saveAccountData(this.DEMO_ACCOUNT_ID, demoData);
    }
    this.saveActiveSession(this.DEMO_ACCOUNT_ID);
    return {
      success: true,
      accountId: this.DEMO_ACCOUNT_ID,
      user: demoData.user || {
        name: "Vikram Malhotra",
        company: "Apex Enterprise Solutions Pvt. Ltd.",
        role: "Head of Credit & Collections"
      }
    };
  }

  getAccountData(accountId) {
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

    // Default EMPTY state for new accounts
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
      baseHistoricalRecovered: 0
    };
  }

  saveAccountData(accountId, data) {
    try {
      const key = `RECO_ACCOUNT_DATA_${accountId}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Error saving data for account ${accountId}:`, e);
    }

    // Async sync to server database if available
    if (accountId && accountId !== this.DEMO_ACCOUNT_ID && typeof fetch !== 'undefined') {
      try {
        fetch(`/api/account/${accountId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).catch(() => {});
      } catch (err) {}
    }

    this.notify();
  }

  getCurrentAccount() {
    if (!this.activeAccountId) return null;
    return this.getAccountData(this.activeAccountId);
  }

  saveCurrentAccount(data) {
    if (!this.activeAccountId) return;
    this.saveAccountData(this.activeAccountId, data);
  }

  get state() {
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
        isAuthenticated: !!this.activeAccountId,
        user: acc.user
      },
      customers: acc.customers,
      invoices: acc.invoices,
      notifications: acc.notifications,
      settings: acc.settings
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  /* ==========================================================================
     Deterministic AI Risk Scoring Engine (Isolated to Account Ledger)
     ========================================================================== */
  calculateInvoiceRisk(invoice, accountCustomers) {
    if (invoice.status === 'Paid') {
      return { score: 0, level: 'LOW', daysOverdue: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - dueDate.getTime();
    const daysOverdue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Look up customer characteristics strictly from this account's customers
    const cust = (accountCustomers || []).find(c => c.id === invoice.customerId || c.name.toLowerCase() === invoice.customer.toLowerCase()) || {
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
    if (!acc) {
      return this.getEmptyMetrics();
    }

    let totalOutstanding = 0;
    let atRiskAmount = 0;
    let overdueCount = 0;
    let highRiskCount = 0;
    let pendingCount = 0;
    let paidCount = 0;
    let recoveredTotal = 0;

    const enrichedInvoices = acc.invoices.map(inv => {
      const riskInfo = this.calculateInvoiceRisk(inv, acc.customers);
      const isOverdue = inv.status === 'Overdue' || (inv.status !== 'Paid' && riskInfo.daysOverdue > 0);
      const effectiveStatus = inv.status === 'Paid' ? 'Paid' : (isOverdue ? 'Overdue' : 'Pending');

      if (effectiveStatus !== 'Paid') {
        totalOutstanding += inv.amount;
        if (riskInfo.score >= (acc.settings.riskThreshold || 80)) {
          atRiskAmount += inv.amount;
          highRiskCount++;
        }
        if (effectiveStatus === 'Overdue') {
          overdueCount++;
        } else {
          pendingCount++;
        }
      } else {
        paidCount++;
        recoveredTotal += inv.amount;
      }

      return {
        ...inv,
        status: effectiveStatus,
        daysOverdue: riskInfo.daysOverdue,
        riskScore: riskInfo.score,
        riskLevel: riskInfo.level
      };
    });

    // Monthly Recovery Trends (Calculated dynamically for current account)
    let trendRecovered = [0, 0, 0, 0, 0, 0];
    let trendAtRisk = [0, 0, 0, 0, 0, 0];

    if (acc.user.id === this.DEMO_ACCOUNT_ID) {
      trendRecovered = [4.2, 5.1, 6.4, 5.8, 7.3, Math.max(8.2, +(recoveredTotal / 100000).toFixed(1))];
      trendAtRisk = [14.8, 13.9, 13.1, 12.8, 12.6, Math.max(12.4, +(atRiskAmount / 100000).toFixed(1))];
    } else {
      const curRec = +(recoveredTotal / 100000).toFixed(1);
      const curRisk = +(atRiskAmount / 100000).toFixed(1);
      trendRecovered = [0, 0, 0, 0, 0, curRec];
      trendAtRisk = [0, 0, 0, 0, 0, curRisk];
    }

    // Breakdown for Doughnut Chart
    let breakdown = {
      labels: ['Recovered', 'Pending (Low/Med Risk)', 'High Risk Overdue'],
      data: [
        +(recoveredTotal / 100000).toFixed(1),
        +((totalOutstanding - atRiskAmount) / 100000).toFixed(1),
        +(atRiskAmount / 100000).toFixed(1)
      ],
      colors: ['#D5B893', '#617891', '#632024']
    };

    // Aging Buckets
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

    // Enriched Customers strictly derived from this account
    const enrichedCustomers = acc.customers.map(cust => {
      const custInvoices = enrichedInvoices.filter(i => i.customerId === cust.id || (i.customer && i.customer.toLowerCase() === cust.name.toLowerCase()));
      const custOutstanding = custInvoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
      const custPaidInvoices = custInvoices.filter(i => i.status === 'Paid');
      const custPaidAmount = custPaidInvoices.reduce((sum, i) => sum + i.amount, 0);
      const custPaidCount = custPaidInvoices.length;
      const onTimeRate = custInvoices.length > 0 ? Math.round((custPaidCount / custInvoices.length) * 100) : 100;

      const maxRisk = custInvoices.length > 0 ? custInvoices.reduce((max, i) => Math.max(max, i.riskScore), 0) : 15;
      const riskLevel = maxRisk >= 80 ? 'HIGH' : (maxRisk >= 50 ? 'MEDIUM' : 'LOW');

      const totalRec = (cust.totalRecovered || 0) + custPaidAmount;

      return {
        ...cust,
        totalOutstanding: `₹${(custOutstanding / 100000).toFixed(1)}L`,
        totalOutstandingRaw: custOutstanding,
        invoicesCount: custInvoices.length,
        paidOnTime: `${onTimeRate}%`,
        avgDelay: `${cust.avgDelayDays || 0} days`,
        totalRecovered: totalRec,
        riskScore: maxRisk,
        riskLevel: riskLevel,
        recentInvoices: custInvoices.map(i => i.id)
      };
    });

    return {
      accountId: acc.user.id,
      isEmpty: enrichedInvoices.length === 0,
      totalOutstandingFormatted: `₹${(totalOutstanding / 100000).toFixed(1)}L`,
      totalOutstandingRaw: totalOutstanding,
      atRiskFormatted: `₹${(atRiskAmount / 100000).toFixed(1)}L`,
      atRiskRaw: atRiskAmount,
      overdueCount: overdueCount,
      recoveredThisMonthFormatted: `₹${(recoveredTotal / 100000).toFixed(1)}L`,
      recoveredThisMonthRaw: recoveredTotal,
      highRiskCount: highRiskCount,
      pendingCount: pendingCount,
      totalInvoicesCount: enrichedInvoices.length,
      recoveryOpportunityFormatted: `₹${((atRiskAmount * 0.55) / 100000).toFixed(1)}L`,
      recoveryTrends: {
        labels: ['March', 'April', 'May', 'June', 'July', 'August'],
        recovered: trendRecovered,
        atRisk: trendAtRisk
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
      recoveredThisMonthFormatted: "₹0.0L",
      recoveredThisMonthRaw: 0,
      highRiskCount: 0,
      pendingCount: 0,
      totalInvoicesCount: 0,
      recoveryOpportunityFormatted: "₹0.0L",
      recoveryTrends: {
        labels: ['March', 'April', 'May', 'June', 'July', 'August'],
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
  addInvoice(invoiceData) {
    const acc = this.getCurrentAccount();
    if (!acc) return null;

    const accountId = acc.user.id;

    // Unique collision-proof ID generation
    let maxIdNum = 1000;
    acc.invoices.forEach(i => {
      if (i.id) {
        const match = i.id.match(/\d+/);
        if (match) {
          const n = parseInt(match[0], 10);
          if (!isNaN(n) && n > maxIdNum) maxIdNum = n;
        }
      }
    });
    const newId = `INV-${maxIdNum + 1}`;

    // Find or create customer strictly inside this account
    let cust = acc.customers.find(c => c.name.toLowerCase() === invoiceData.customer.trim().toLowerCase());
    
    let customerId = cust ? cust.id : null;
    if (!customerId) {
      let maxCustNum = 0;
      acc.customers.forEach(c => {
        if (c.id) {
          const match = c.id.match(/\d+/);
          if (match) {
            const n = parseInt(match[0], 10);
            if (!isNaN(n) && n > maxCustNum) maxCustNum = n;
          }
        }
      });
      customerId = `CUST-${String(maxCustNum + 1).padStart(3, '0')}`;
    }

    if (!cust) {
      const cleanName = invoiceData.customer.trim();
      const newCustomer = {
        id: customerId,
        accountId: accountId,
        name: cleanName,
        category: invoiceData.category || "Corporate Commercial",
        email: `finance@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        phone: "+91 98000 " + Math.floor(10000 + Math.random() * 90000),
        contactPerson: "Finance Lead",
        avgDelayDays: 5,
        historyDelayRate: 0.1,
        totalRecovered: 0,
        riskProgression: [20, 25, 30],
        aiAssessment: "Newly registered debtor for this account. Active monitoring enabled."
      };
      acc.customers.push(newCustomer);
    }

    const newInvoice = {
      id: newId,
      accountId: accountId,
      customerId: customerId,
      customer: invoiceData.customer.trim(),
      amount: Math.max(1, parseFloat(invoiceData.amount) || 0),
      issueDate: invoiceData.issueDate || new Date().toISOString().split('T')[0],
      dueDate: invoiceData.dueDate,
      status: invoiceData.status || "Pending",
      recommendedAction: invoiceData.recommendedAction || "Monitor",
      aiNotes: invoiceData.aiNotes || "Newly recorded invoice in account ledger."
    };

    acc.invoices.unshift(newInvoice);

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

  importInvoices(invoicesList) {
    if (!Array.isArray(invoicesList) || invoicesList.length === 0) return { count: 0, imported: [] };
    const imported = [];
    invoicesList.forEach(item => {
      if (item && item.customer && item.amount !== undefined && item.dueDate) {
        const added = this.addInvoice({
          customer: item.customer,
          amount: parseFloat(item.amount),
          dueDate: item.dueDate,
          issueDate: item.issueDate || new Date().toISOString().split('T')[0],
          status: item.status || 'Pending',
          category: item.category || 'Corporate Commercial',
          recommendedAction: item.recommendedAction || 'Monitor',
          aiNotes: item.aiNotes || 'Imported via CSV/Data Ledger'
        });
        if (added) imported.push(added);
      }
    });
    return { count: imported.length, imported };
  }

  editInvoice(id, updateData) {
    const acc = this.getCurrentAccount();
    if (!acc) return false;

    const index = acc.invoices.findIndex(i => i.id === id);
    if (index === -1) return false;

    const currentInv = acc.invoices[index];
    const newCustomerName = updateData.customer ? updateData.customer.trim() : currentInv.customer;
    const newAmount = updateData.amount !== undefined ? Math.max(0, parseFloat(updateData.amount) || 0) : currentInv.amount;

    acc.invoices[index] = {
      ...currentInv,
      ...updateData,
      customer: newCustomerName,
      amount: newAmount
    };

    this.saveCurrentAccount(acc);
    return true;
  }

  deleteInvoice(id) {
    const acc = this.getCurrentAccount();
    if (!acc) return false;

    const inv = acc.invoices.find(i => i.id === id);
    if (!inv) return false;

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

  /* ==========================================================================
     Customer Management CRUD Operations (Strictly isolated by Account ID)
     ========================================================================== */
  addCustomer(customerData) {
    const acc = this.getCurrentAccount();
    if (!acc) return null;

    const accountId = acc.user.id;
    const cleanName = (customerData.name || "").trim();
    if (!cleanName) return null;

    // Check if customer already exists in this account
    let existing = acc.customers.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      return existing;
    }

    let maxCustNum = 0;
    acc.customers.forEach(c => {
      if (c.id) {
        const match = c.id.match(/\d+/);
        if (match) {
          const n = parseInt(match[0], 10);
          if (!isNaN(n) && n > maxCustNum) maxCustNum = n;
        }
      }
    });
    const customerId = `CUST-${String(maxCustNum + 1).padStart(3, '0')}`;

    const newCustomer = {
      id: customerId,
      accountId: accountId,
      name: cleanName,
      category: (customerData.category || "Corporate Commercial").trim(),
      email: (customerData.email || `finance@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`).trim(),
      phone: (customerData.phone || "+91 98000 " + Math.floor(10000 + Math.random() * 90000)).trim(),
      contactPerson: (customerData.contactPerson || "Finance Lead").trim(),
      avgDelayDays: Math.max(0, parseInt(customerData.avgDelayDays, 10) || 5),
      historyDelayRate: 0.15,
      totalRecovered: 0,
      riskProgression: [20, 25, 30],
      aiAssessment: customerData.aiAssessment || "Debtor profile registered in account. Active behavioral tracking enabled."
    };

    acc.customers.unshift(newCustomer);
    acc.notifications.unshift({
      id: `NOTIF-${Date.now()}`,
      accountId: accountId,
      type: 'ai-insight',
      title: 'CUSTOMER REGISTERED',
      message: `Customer profile created for ${newCustomer.name}.`,
      timestamp: "Just now",
      read: false,
      invoiceId: null
    });

    this.saveCurrentAccount(acc);
    return newCustomer;
  }

  editCustomer(id, updateData) {
    const acc = this.getCurrentAccount();
    if (!acc) return false;

    const index = acc.customers.findIndex(c => c.id === id);
    if (index === -1) return false;

    const currentCust = acc.customers[index];
    const oldName = currentCust.name;
    const newName = updateData.name ? updateData.name.trim() : oldName;

    acc.customers[index] = {
      ...currentCust,
      ...updateData,
      name: newName,
      category: updateData.category ? updateData.category.trim() : currentCust.category,
      email: updateData.email ? updateData.email.trim() : currentCust.email,
      phone: updateData.phone ? updateData.phone.trim() : currentCust.phone,
      contactPerson: updateData.contactPerson ? updateData.contactPerson.trim() : currentCust.contactPerson,
      avgDelayDays: updateData.avgDelayDays !== undefined ? Math.max(0, parseInt(updateData.avgDelayDays, 10) || 0) : currentCust.avgDelayDays
    };

    // If customer name changed, update associated invoices customer string
    if (newName !== oldName) {
      acc.invoices.forEach(inv => {
        if (inv.customerId === id || (inv.customer && inv.customer.toLowerCase() === oldName.toLowerCase())) {
          inv.customer = newName;
          inv.customerId = id;
        }
      });
    }

    this.saveCurrentAccount(acc);
    return true;
  }

  deleteCustomer(id) {
    const acc = this.getCurrentAccount();
    if (!acc) return false;

    const cust = acc.customers.find(c => c.id === id);
    if (!cust) return false;

    acc.customers = acc.customers.filter(c => c.id !== id);
    acc.notifications.unshift({
      id: `NOTIF-${Date.now()}`,
      accountId: acc.user.id,
      type: 'ai-insight',
      title: 'CUSTOMER REMOVED',
      message: `Customer profile for ${cust.name} removed from your workspace.`,
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

    inv.status = newStatus;
    if (newStatus === 'Paid') {
      inv.recommendedAction = "Cleared";
      inv.aiNotes = `Settled and cleared on ${new Date().toLocaleDateString('en-US')}.`;
      acc.notifications.unshift({
        id: `NOTIF-${Date.now()}`,
        accountId: acc.user.id,
        type: 'recovery',
        title: 'REVENUE RECOVERED',
        message: `₹${inv.amount.toLocaleString('en-IN')} recovered for Invoice #${inv.id} (${inv.customer}).`,
        timestamp: "Just now",
        read: false,
        invoiceId: inv.id
      });
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

  updateSettings(settingsData) {
    const acc = this.getCurrentAccount();
    if (!acc) return;
    acc.settings = { ...acc.settings, ...settingsData };
    if (settingsData.companyName) {
      acc.user.company = settingsData.companyName;
    }
    this.saveCurrentAccount(acc);
  }

  /* ==========================================================================
     Authentication & Multi-Account Switching (with Real Backend Email API)
     ========================================================================== */
  async login(email, password) {
    if (!email || !password) {
      return { success: false, message: "Please provide both email and password." };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check Demo Account Shortcut
    if (normalizedEmail === "vikram@apexenterprise.com") {
      this.saveActiveSession(this.DEMO_ACCOUNT_ID);
      return { success: true, accountId: this.DEMO_ACCOUNT_ID };
    }

    // Try Backend API First (if running in browser with HTTP host)
    if (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password })
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
          this.saveActiveSession(data.accountId);
          return { success: true, accountId: data.accountId };
        } else if (!resp.ok) {
          return { success: false, message: data.message || "Login failed." };
        }
      } catch (apiErr) {
        console.warn('Backend API login offline, falling back to local registry:', apiErr);
      }
    }

    // Fallback: Look up in Local Accounts Registry
    try {
      const registryRaw = localStorage.getItem(this.REGISTRY_KEY);
      const registry = registryRaw ? JSON.parse(registryRaw) : {};
      
      const accountEntry = Object.values(registry).find(a => a.email.toLowerCase() === normalizedEmail);
      if (accountEntry) {
        if (accountEntry.password && accountEntry.password !== password) {
          return { success: false, message: "Incorrect password. Please try again." };
        }
        this.saveActiveSession(accountEntry.id);
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

    // 1. Try Backend API (With Real Transactional Welcome Email)
    if (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
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

        const data = await resp.json();

        if (!resp.ok || !data.success) {
          return {
            success: false,
            error: data.error,
            message: data.message || "Signup failed."
          };
        }

        // Backend created account successfully!
        const newAccountId = data.accountId;

        // Sync local isolated store for this account
        this.initLocalEmptyAccount(newAccountId, name, normalizedEmail, company, password);
        this.saveActiveSession(newAccountId);

        return {
          success: true,
          accountId: newAccountId,
          emailSent: data.emailSent,
          message: data.message
        };

      } catch (apiErr) {
        console.warn('Backend API signup offline, performing local registration:', apiErr);
      }
    }

    // 2. Fallback for standalone/offline execution
    let registry = {};
    try {
      const raw = localStorage.getItem(this.REGISTRY_KEY);
      if (raw) registry = JSON.parse(raw);
    } catch (e) {}

    const existing = Object.values(registry).find(a => a.email.toLowerCase() === normalizedEmail);
    if (existing || normalizedEmail === 'vikram@apexenterprise.com') {
      return {
        success: false,
        message: "An account with this email already exists. Please log in instead."
      };
    }

    const newAccountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.initLocalEmptyAccount(newAccountId, name, normalizedEmail, company, password);
    this.saveActiveSession(newAccountId);

    return {
      success: true,
      accountId: newAccountId,
      emailSent: false,
      message: "Account created successfully!"
    };
  }

  initLocalEmptyAccount(newAccountId, name, normalizedEmail, company, password) {
    let registry = {};
    try {
      const raw = localStorage.getItem(this.REGISTRY_KEY);
      if (raw) registry = JSON.parse(raw);
    } catch (e) {}

    registry[newAccountId] = {
      id: newAccountId,
      email: normalizedEmail,
      password: password,
      name: name,
      company: company || "Enterprise Corp",
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(this.REGISTRY_KEY, JSON.stringify(registry));

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
      baseHistoricalRecovered: 0
    };

    this.saveAccountData(newAccountId, emptyAccountData);
  }

  logout() {
    this.saveActiveSession(null);
  }

  resetDemoAccount() {
    const demoData = this.getDemoDataset();
    this.saveAccountData(this.DEMO_ACCOUNT_ID, demoData);
    this.saveActiveSession(this.DEMO_ACCOUNT_ID);
  }
}

// Global Store Singleton
window.recoStore = new RecoStore();

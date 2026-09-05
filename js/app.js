/* ==========================================================================
   RECO — AI REVENUE RECOVERY PLATFORM
   Master Application Logic & UI Controller (Multi-Tenant Isolated)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const store = window.recoStore;

  // Local UI State
  const uiState = {
    currentView: 'landing',
    activeInvoiceFilter: 'all',
    invoiceSearchQuery: '',
    customerSearchQuery: '',
    selectedInvoiceId: null,
    selectedCustomerId: null,
    currentTone: 'formal',
    notificationFilter: 'all',
    simulatorTargetRate: 85,
    authMode: 'login'
  };

  // Chart Instances
  let trendChartInstance = null;
  let breakdownChartInstance = null;
  let agingChartInstance = null;
  let channelChartInstance = null;
  let customerHistoryChartInstance = null;

  /* ==========================================================================
     1. Router & View Management
     ========================================================================== */
  function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    if (!window.location.hash) {
      window.location.hash = store.state.auth.isAuthenticated ? '#dashboard' : '#landing';
    } else {
      handleRoute();
    }
  }

  function handleRoute() {
    const hash = (window.location.hash.replace('#', '') || 'landing').split('?')[0];
    if (hash === 'signup') {
      uiState.authMode = 'signup';
      navigateTo('login');
      switchAuthTab('signup');
      return;
    }
    if (hash === 'profile') {
      navigateTo('settings');
      return;
    }
    navigateTo(hash);
  }

  function switchAuthTab(mode) {
    const authTabLogin = document.getElementById('auth-tab-login');
    const authTabSignup = document.getElementById('auth-tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    if (!authTabLogin || !authTabSignup || !loginForm || !signupForm) return;
    if (mode === 'signup') {
      authTabSignup.classList.add('active');
      authTabLogin.classList.remove('active');
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
      uiState.authMode = 'signup';
    } else {
      authTabLogin.classList.add('active');
      authTabSignup.classList.remove('active');
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
      uiState.authMode = 'login';
    }
  }

  function navigateTo(viewName) {
    const publicViews = ['landing', 'login'];
    const knownViews = ['landing', 'login', 'dashboard', 'invoices', 'customers', 'copilot', 'reports', 'notifications', 'settings'];
    const isAuth = store.state.auth.isAuthenticated;

    if (!knownViews.includes(viewName)) {
      window.location.hash = isAuth ? '#dashboard' : '#landing';
      return;
    }

    // Route Guard for Protected Pages
    if (!publicViews.includes(viewName) && !isAuth) {
      showToast('Please sign in to access your revenue workspace.', 'danger');
      window.location.hash = '#login';
      return;
    }

    if (viewName === 'login' && isAuth) {
      window.location.hash = '#dashboard';
      return;
    }

    uiState.currentView = viewName;

    // Update active class on views
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active-view');
    });

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active-view');
    } else {
      window.location.hash = isAuth ? '#dashboard' : '#landing';
      return;
    }

    // Toggle Landing / App Layout Shell
    const appShell = document.getElementById('app-shell-container');
    const landingView = document.getElementById('view-landing');
    document.body.classList.toggle('auth-only', viewName === 'login');
    document.body.classList.toggle('is-authenticated', isAuth);

    if (viewName === 'landing') {
      if (appShell) appShell.style.display = 'none';
      if (landingView) landingView.style.display = 'block';
    } else {
      if (appShell) appShell.style.display = 'flex';
      if (landingView) landingView.style.display = 'none';
    }

    // Update sidebar navigation active links
    document.querySelectorAll('.nav-item').forEach(link => {
      const linkTarget = link.getAttribute('data-view');
      if (linkTarget === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update Topbar Breadcrumb
    const breadcrumb = document.getElementById('topbar-page-title');
    if (breadcrumb) {
      const titles = {
        'dashboard': 'Executive Command Center',
        'invoices': 'Invoice Management',
        'customers': 'Customer Intelligence',
        'copilot': 'AI Revenue Copilot',
        'simulator': 'Revenue Recovery Simulator',
        'reports': 'Financial & Recovery Reports',
        'notifications': 'Notification Center',
        'settings': 'Platform Settings',
        'login': 'Account Authentication'
      };
      breadcrumb.textContent = titles[viewName] || 'Dashboard';
    }

    // Update User Info in Topbar/Sidebar
    updateUserDisplay();

    // Trigger View-Specific Setup
    onViewActivated(viewName);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Close mobile sidebar if open
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      sidebar.classList.remove('mobile-open');
    }
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function updateUserDisplay() {
    const user = store.state.auth.user;
    if (!user) return;

    const nameEls = document.querySelectorAll('.user-name-display');
    nameEls.forEach(el => el.textContent = user.name || "User");
    
    const roleEls = document.querySelectorAll('.user-role-display');
    roleEls.forEach(el => el.textContent = `${user.company || 'Enterprise'} · ${user.role || 'Finance Lead'}`);

    const avatarEls = document.querySelectorAll('.user-avatar-display');
    avatarEls.forEach(el => {
      const initials = (user.name || "U").split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      el.textContent = initials;
    });

    // Update notification badge count in sidebar
    const unreadCount = store.state.notifications.filter(n => !n.read).length;
    const badgeEl = document.getElementById('sidebar-notification-badge');
    if (badgeEl) {
      badgeEl.textContent = unreadCount;
      badgeEl.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
  }

  function onViewActivated(viewName) {
    const metrics = store.getComputedMetrics();

    if (viewName === 'dashboard') {
      renderDashboard(metrics);
    } else if (viewName === 'invoices') {
      renderInvoicesTable(metrics);
    } else if (viewName === 'customers') {
      renderCustomersGrid(metrics);
    } else if (viewName === 'simulator') {
      updateSimulatorMath(uiState.simulatorTargetRate);
    } else if (viewName === 'reports') {
      renderReportsCharts(metrics);
    } else if (viewName === 'notifications') {
      renderNotificationList();
    } else if (viewName === 'copilot') {
      populateCopilotInvoiceSelector(metrics.invoices);
      updateReminderComposer(uiState.selectedInvoiceId, uiState.currentTone);
    } else if (viewName === 'settings') {
      populateSettingsForm();
    }
  }

  // Subscribe to store updates to re-render active view
  store.subscribe(() => {
    updateUserDisplay();
    const metrics = store.getComputedMetrics();
    if (uiState.currentView === 'dashboard') renderDashboard(metrics);
    else if (uiState.currentView === 'invoices') renderInvoicesTable(metrics);
    else if (uiState.currentView === 'customers') renderCustomersGrid(metrics);
    else if (uiState.currentView === 'reports') renderReportsCharts(metrics);
    else if (uiState.currentView === 'notifications') renderNotificationList();
    else if (uiState.currentView === 'simulator') updateSimulatorMath(uiState.simulatorTargetRate);
    else if (uiState.currentView === 'copilot') {
      populateCopilotInvoiceSelector(metrics.invoices);
      updateReminderComposer(uiState.selectedInvoiceId, uiState.currentTone);
    }
  });

  /* ==========================================================================
     2. Dashboard View Renderer (Data Isolated)
     ========================================================================== */
  function renderDashboard(metrics) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greetEl = document.getElementById('dashboard-greeting-prefix');
    if (greetEl) greetEl.textContent = greeting;

    // 4 Top KPI Cards
    const kpiOutstanding = document.getElementById('kpi-total-outstanding');
    const kpiAtRisk = document.getElementById('kpi-at-risk');
    const kpiOverdue = document.getElementById('kpi-overdue-count');
    const kpiRecovered = document.getElementById('kpi-recovered-month');

    if (kpiOutstanding) kpiOutstanding.textContent = metrics.totalOutstandingFormatted;
    if (kpiAtRisk) kpiAtRisk.textContent = metrics.atRiskFormatted;
    if (kpiOverdue) kpiOverdue.textContent = metrics.overdueCount;
    if (kpiRecovered) kpiRecovered.textContent = metrics.recoveredThisMonthFormatted;

    const recoveredTrend = document.getElementById('kpi-recovered-trend');
    if (recoveredTrend) {
      recoveredTrend.textContent = metrics.recoveredMomLabel;
      recoveredTrend.classList.toggle('positive', !!metrics.recoveredMomPositive);
      recoveredTrend.classList.toggle('negative', !metrics.recoveredMomPositive && metrics.recoveredThisMonthRaw > 0);
    }

    const trendSubtitle = document.getElementById('dashboard-trend-subtitle');
    if (trendSubtitle && metrics.recoveryTrends && metrics.recoveryTrends.labels) {
      const labels = metrics.recoveryTrends.labels;
      trendSubtitle.textContent = `Monthly recovered revenue vs at-risk exposure (${labels[0]} – ${labels[labels.length - 1]})`;
    }

    // AI Spotlight Summary
    const aiSummary = document.getElementById('ai-banner-summary');
    const aiHighRiskCount = document.getElementById('ai-high-risk-count');
    const aiHighRiskAmt = document.getElementById('ai-high-risk-amount');
    const aiOppAmt = document.getElementById('ai-opportunity-amount');
    const upcomingCount = document.getElementById('ai-upcoming-count');
    const upcomingAmt = document.getElementById('ai-upcoming-amount');

    if (metrics.isEmpty) {
      if (aiSummary) aiSummary.textContent = "You don't have any invoice data yet. Add your first invoice to start receiving recovery insights.";
      if (aiHighRiskCount) aiHighRiskCount.textContent = "0 Invoices";
      if (aiHighRiskAmt) aiHighRiskAmt.textContent = "No at-risk invoices detected in this account.";
      if (aiOppAmt) aiOppAmt.textContent = "₹0.0L Potential";
      if (upcomingCount) upcomingCount.textContent = "0 Invoices";
      if (upcomingAmt) upcomingAmt.textContent = "No upcoming due dates in the next 7 days.";
    } else {
      if (aiSummary) {
        aiSummary.textContent = `I analyzed ${metrics.totalInvoicesCount} invoice${metrics.totalInvoicesCount === 1 ? '' : 's'} and identified ${metrics.overdueCount} payment${metrics.overdueCount === 1 ? '' : 's'} that require immediate attention.`;
      }
      if (aiHighRiskCount) aiHighRiskCount.textContent = `${metrics.highRiskCount} Invoices`;
      if (aiHighRiskAmt) aiHighRiskAmt.textContent = `${metrics.atRiskFormatted} potentially at risk across delayed accounts.`;
      if (aiOppAmt) aiOppAmt.textContent = `${metrics.recoveryOpportunityFormatted} Potential`;
      if (upcomingCount) upcomingCount.textContent = `${metrics.upcoming7Count} Invoices`;
      if (upcomingAmt) upcomingAmt.textContent = metrics.upcoming7Count
        ? `${metrics.upcoming7Formatted} may become overdue within 7 days based on current due dates.`
        : "No pending invoices are due within the next 7 days.";
    }

    // Render Charts
    initDashboardCharts(metrics);

    // Render Priority Collections Table
    renderPriorityTable(metrics.invoices);
  }

  function initDashboardCharts(metrics) {
    // Line Chart: Revenue Recovery Trend
    const trendCtx = document.getElementById('revenueTrendChart');
    if (trendCtx && typeof Chart !== 'undefined') {
      if (trendChartInstance) trendChartInstance.destroy();

      const ctx2d = trendCtx.getContext('2d');
      const gradientRecovered = ctx2d.createLinearGradient(0, 0, 0, 300);
      gradientRecovered.addColorStop(0, 'rgba(213, 184, 147, 0.45)');
      gradientRecovered.addColorStop(1, 'rgba(213, 184, 147, 0.02)');

      const gradientAtRisk = ctx2d.createLinearGradient(0, 0, 0, 300);
      gradientAtRisk.addColorStop(0, 'rgba(99, 32, 36, 0.35)');
      gradientAtRisk.addColorStop(1, 'rgba(99, 32, 36, 0.02)');

      trendChartInstance = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: metrics.recoveryTrends.labels,
          datasets: [
            {
              label: 'Recovered Revenue (₹ Lakhs)',
              data: metrics.recoveryTrends.recovered,
              borderColor: '#D5B893',
              backgroundColor: gradientRecovered,
              fill: true,
              tension: 0.38,
              borderWidth: 3,
              pointBackgroundColor: '#25344F',
              pointBorderColor: '#D5B893',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7
            },
            {
              label: 'At-Risk Exposure (₹ Lakhs)',
              data: metrics.recoveryTrends.atRisk,
              borderColor: '#632024',
              backgroundColor: gradientAtRisk,
              fill: true,
              tension: 0.38,
              borderWidth: 2,
              borderDash: [5, 5],
              pointBackgroundColor: '#632024',
              pointBorderColor: '#FAF8F5',
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: '#25344F',
                font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 12 },
                usePointStyle: true,
                boxWidth: 8
              }
            },
            tooltip: {
              backgroundColor: '#25344F',
              titleColor: '#D5B893',
              bodyColor: '#FFFFFF',
              borderColor: '#D5B893',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: function(context) {
                  return ` ${context.dataset.label}: ₹${context.raw} Lakhs`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(97, 120, 145, 0.12)' },
              ticks: { color: '#617891', font: { family: "'Plus Jakarta Sans', sans-serif" } }
            },
            y: {
              grid: { color: 'rgba(97, 120, 145, 0.12)' },
              ticks: {
                color: '#617891',
                callback: function(val) { return '₹' + val + 'L'; }
              }
            }
          }
        }
      });
    }

    // Doughnut Chart: Outstanding vs Recovered
    const breakdownCtx = document.getElementById('outstandingVsRecoveredChart');
    if (breakdownCtx && typeof Chart !== 'undefined') {
      if (breakdownChartInstance) breakdownChartInstance.destroy();

      breakdownChartInstance = new Chart(breakdownCtx, {
        type: 'doughnut',
        data: {
          labels: metrics.breakdown.labels,
          datasets: [{
            data: metrics.breakdown.data,
            backgroundColor: metrics.breakdown.colors,
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#25344F',
                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' },
                boxWidth: 12,
                padding: 12
              }
            },
            tooltip: {
              backgroundColor: '#25344F',
              titleColor: '#D5B893',
              bodyColor: '#FFFFFF',
              borderColor: '#D5B893',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: function(context) {
                  return ` ${context.label}: ₹${context.raw}L`;
                }
              }
            }
          }
        }
      });
    }
  }

  function renderPriorityTable(invoices) {
    const tbody = document.getElementById('priority-collections-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const priorityInvoices = (invoices || [])
      .filter(inv => inv.status === 'Overdue')
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);

    if (priorityInvoices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 36px; color: var(--slate-gray);">No overdue accounts requiring priority action in your ledger.</td></tr>`;
      return;
    }

    priorityInvoices.forEach(inv => {
      const tr = document.createElement('tr');
      const isHighRisk = inv.riskScore >= 80;
      const isMediumRisk = inv.riskScore >= 50 && inv.riskScore < 80;

      const riskClass = isHighRisk ? 'high' : isMediumRisk ? 'medium' : 'low';
      const badgeRiskClass = isHighRisk ? 'badge-risk-high' : isMediumRisk ? 'badge-risk-medium' : 'badge-risk-low';

      tr.innerHTML = `
        <td>
          <div style="font-weight:700; color:var(--space-cadet);">${escapeHtml(inv.customer)}</div>
          <div style="font-size:0.78rem; color:var(--slate-gray);">${inv.id}</div>
        </td>
        <td><strong style="color:var(--space-cadet); font-family:monospace;">${inv.id}</strong></td>
        <td><strong style="font-size:0.95rem; color:var(--space-cadet);">₹${inv.amount.toLocaleString('en-IN')}</strong></td>
        <td>${formatDate(inv.dueDate)}</td>
        <td><span style="color: ${isHighRisk ? 'var(--caput-mortuum)' : 'var(--coffee)'}; font-weight:700;">${inv.daysOverdue} days</span></td>
        <td>
          <div class="risk-meter">
            <span class="badge ${badgeRiskClass}">${inv.riskScore}%</span>
            <div class="risk-bar-track">
              <div class="risk-bar-fill ${riskClass}" style="width:${inv.riskScore}%"></div>
            </div>
          </div>
        </td>
        <td>
          <button class="btn btn-sm ${isHighRisk ? 'btn-danger' : 'btn-tan'} action-trigger-btn" data-id="${inv.id}">
            ${escapeHtml(inv.recommendedAction || 'Send reminder')}
          </button>
        </td>
      `;

      tr.querySelector('.action-trigger-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openReminderForInvoice(inv.id);
      });

      tr.addEventListener('click', () => {
        openInvoiceDrawer(inv.id);
      });

      tbody.appendChild(tr);
    });
  }

  /* ==========================================================================
     3. Invoices Page & Table Management (Data Isolated)
     ========================================================================== */
  function renderInvoicesTable(metrics) {
    const tbody = document.getElementById('invoices-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const invoices = metrics.invoices || [];

    if (invoices.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding: 48px 20px; color: var(--slate-gray);">
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--space-cadet); margin-bottom: 6px;">No invoices recorded in this workspace</div>
            <p style="font-size: 0.9rem;">Click the button below to add your first client invoice.</p>
            <button class="btn btn-sm btn-primary" style="margin-top: 14px;" onclick="document.getElementById('add-invoice-modal-backdrop').classList.add('active')">
              + Add First Invoice
            </button>
          </td>
        </tr>
      `;
      return;
    }

    let filtered = invoices.filter(inv => {
      // Filter tab
      if (uiState.activeInvoiceFilter === 'paid' && inv.status !== 'Paid') return false;
      if (uiState.activeInvoiceFilter === 'pending' && inv.status !== 'Pending') return false;
      if (uiState.activeInvoiceFilter === 'overdue' && inv.status !== 'Overdue') return false;
      if (uiState.activeInvoiceFilter === 'high-risk' && inv.riskScore < 80) return false;

      // Search query
      if (uiState.invoiceSearchQuery) {
        const q = uiState.invoiceSearchQuery.toLowerCase();
        return String(inv.id || '').toLowerCase().includes(q) ||
               String(inv.customer || '').toLowerCase().includes(q) ||
               String(inv.amount).includes(q) ||
               String(inv.status || '').toLowerCase().includes(q);
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding: 40px; color: var(--slate-gray);">
            No invoices matching the current filter criteria.
            <div style="margin-top: 10px;">
              <button class="btn btn-sm btn-secondary" id="btn-reset-invoice-filter">Reset Filters</button>
            </div>
          </td>
        </tr>
      `;
      const resetBtn = document.getElementById('btn-reset-invoice-filter');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          uiState.activeInvoiceFilter = 'all';
          uiState.invoiceSearchQuery = '';
          const searchInput = document.getElementById('invoice-search-input');
          if (searchInput) searchInput.value = '';
          document.querySelectorAll('.invoice-filter-btn').forEach(b => b.classList.remove('active'));
          const allBtn = document.querySelector('.invoice-filter-btn[data-filter="all"]');
          if (allBtn) allBtn.classList.add('active');
          renderInvoicesTable(store.getComputedMetrics());
        });
      }
      return;
    }

    filtered.forEach(inv => {
      const tr = document.createElement('tr');
      const isHighRisk = inv.riskScore >= 80;
      const isMediumRisk = inv.riskScore >= 50 && inv.riskScore < 80;
      const badgeRiskClass = isHighRisk ? 'badge-risk-high' : isMediumRisk ? 'badge-risk-medium' : 'badge-risk-low';

      let statusBadge = '';
      if (inv.status === 'Paid') statusBadge = '<span class="badge badge-paid">Paid</span>';
      else if (inv.status === 'Overdue') statusBadge = `<span class="badge badge-overdue">${inv.daysOverdue}d Overdue</span>`;
      else statusBadge = '<span class="badge badge-pending">Pending</span>';

      tr.innerHTML = `
        <td><strong style="color:var(--space-cadet); font-family:monospace;">${inv.id}</strong></td>
        <td>
          <strong style="color:var(--space-cadet);">${escapeHtml(inv.customer)}</strong>
        </td>
        <td><strong>₹${inv.amount.toLocaleString('en-IN')}</strong></td>
        <td style="color:var(--slate-gray);">${formatDate(inv.issueDate)}</td>
        <td style="color:var(--slate-gray);">${formatDate(inv.dueDate)}</td>
        <td>${statusBadge}</td>
        <td>
          <span class="badge ${badgeRiskClass}">${inv.riskScore}% (${inv.riskLevel})</span>
        </td>
        <td>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="btn btn-sm btn-secondary view-inv-btn" data-id="${inv.id}">View</button>
            <button class="btn btn-sm btn-tan remind-inv-btn" data-id="${inv.id}">Remind</button>
            ${inv.status !== 'Paid' ? `
              <button class="btn btn-sm btn-ghost mark-paid-btn" data-id="${inv.id}" title="Mark as Paid">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            ` : ''}
          </div>
        </td>
      `;

      tr.querySelector('.view-inv-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openInvoiceDrawer(inv.id);
      });

      tr.querySelector('.remind-inv-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openReminderForInvoice(inv.id);
      });

      const markPaidBtn = tr.querySelector('.mark-paid-btn');
      if (markPaidBtn) {
        markPaidBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          store.updateInvoiceStatus(inv.id, 'Paid');
          showToast(`Invoice #${inv.id} marked as Paid! Revenue recovered updated.`);
        });
      }

      tr.addEventListener('click', () => {
        openInvoiceDrawer(inv.id);
      });

      tbody.appendChild(tr);
    });
  }

  /* ==========================================================================
     4. Customer Intelligence Grid (Data Isolated)
     ========================================================================== */
  function renderCustomersGrid(metrics) {
    const grid = document.getElementById('customers-grid-container');
    if (!grid) return;

    grid.innerHTML = '';

    const customers = metrics.customers || [];

    if (customers.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; background: var(--surface-white); border-radius: 12px; border: 1px dashed var(--border-warm);">
          <p style="font-size: 1.15rem; color: var(--space-cadet); font-weight:700;">No customer profiles in this workspace</p>
          <p style="color: var(--slate-gray); font-size: 0.9rem; margin-top: 6px; max-width: 480px; margin-left: auto; margin-right: auto;">
            When you register client invoices, RECO automatically generates behavioral intelligence profiles, delay scoring, and risk telemetry here.
          </p>
          <button class="btn btn-tan btn-sm" style="margin-top: 18px;" onclick="document.getElementById('add-invoice-modal-backdrop').classList.add('active')">
            + Add Invoice to Create Customer
          </button>
        </div>
      `;
      return;
    }

    let filtered = customers.filter(cust => {
      if (uiState.customerSearchQuery) {
        const q = uiState.customerSearchQuery.toLowerCase();
        return (cust.name || '').toLowerCase().includes(q) || (cust.category || '').toLowerCase().includes(q);
      }
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: var(--surface-white); border-radius: 12px;">
          <p style="color: var(--slate-gray);">No customer profiles found matching "${escapeHtml(uiState.customerSearchQuery)}".</p>
        </div>
      `;
      return;
    }

    filtered.forEach(cust => {
      const card = document.createElement('div');
      card.className = 'customer-card';

      const isHighRisk = cust.riskScore >= 80;
      const isMediumRisk = cust.riskScore >= 50 && cust.riskScore < 80;
      const badgeRiskClass = isHighRisk ? 'badge-risk-high' : isMediumRisk ? 'badge-risk-medium' : 'badge-risk-low';

      card.innerHTML = `
        <div class="customer-card-header">
          <div class="customer-avatar-box">${escapeHtml((cust.name || 'C').substring(0, 2).toUpperCase())}</div>
          <span class="badge ${badgeRiskClass}">${cust.riskLevel} RISK (${cust.riskScore}/100)</span>
        </div>
        <div class="customer-company-name">${escapeHtml(cust.name)}</div>
        <div style="font-size:0.82rem; color:var(--slate-gray); margin-bottom:12px;">${escapeHtml(cust.category || '')}</div>
        
        <div class="customer-stats-grid">
          <div class="customer-stat-box">
            <label>Outstanding</label>
            <span style="color: ${isHighRisk ? 'var(--caput-mortuum)' : 'var(--space-cadet)'};">${cust.totalOutstanding}</span>
          </div>
          <div class="customer-stat-box">
            <label>Avg Delay</label>
            <span>${cust.avgDelay}</span>
          </div>
          <div class="customer-stat-box">
            <label>Paid On-Time</label>
            <span>${cust.paidOnTime}</span>
          </div>
          <div class="customer-stat-box">
            <label>Recovered</label>
            <span style="color:var(--coffee);">${cust.totalRecovered ? '₹' + (cust.totalRecovered/100000).toFixed(1) + 'L' : '₹0.0L'}</span>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
          <span style="font-size:0.82rem; color:var(--slate-gray);">${cust.invoicesCount} Invoices Active</span>
          <button class="btn btn-sm btn-primary view-cust-btn">View Intelligence →</button>
        </div>
      `;

      card.addEventListener('click', () => {
        openCustomerModal(cust.id);
      });

      grid.appendChild(card);
    });
  }

  /* ==========================================================================
     5. Notification Feed (Data Isolated)
     ========================================================================== */
  function renderNotificationList() {
    const container = document.getElementById('notifications-list-wrap');
    if (!container) return;

    container.innerHTML = '';

    let notifs = store.state.notifications || [];

    if (uiState.notificationFilter !== 'all') {
      notifs = notifs.filter(n => n.type === uiState.notificationFilter);
    }

    if (notifs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; background: var(--surface-white); border-radius: 12px;">
          <p style="color: var(--slate-gray);">No notifications in this category.</p>
        </div>
      `;
      return;
    }

    notifs.forEach(notif => {
      const item = document.createElement('div');
      item.className = `notification-item ${notif.type} ${notif.read ? 'read' : 'unread'}`;

      let iconHtml = '';
      if (notif.type === 'critical') {
        iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      } else if (notif.type === 'ai-insight') {
        iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`;
      } else {
        iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
      }

      item.innerHTML = `
        <div class="notification-icon-box">${iconHtml}</div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:0.78rem; letter-spacing:0.06em; text-transform:uppercase; color:${notif.type === 'critical' ? 'var(--caput-mortuum)' : 'var(--coffee-dark)'};">
              ${escapeHtml(notif.title)}
            </strong>
            <span style="font-size:0.78rem; color:var(--slate-gray);">${escapeHtml(notif.timestamp || '')}${notif.read ? '' : ' · Unread'}</span>
          </div>
          <p style="margin-top:4px; font-size:0.92rem; color:var(--space-cadet);">${escapeHtml(notif.message)}</p>
          ${notif.invoiceId ? `
            <div style="margin-top: 8px;">
              <button class="btn btn-sm btn-tan inspect-notif-btn" data-id="${notif.invoiceId}">Inspect Invoice #${notif.invoiceId} →</button>
            </div>
          ` : ''}
        </div>
      `;

      const inspectBtn = item.querySelector('.inspect-notif-btn');
      if (inspectBtn) {
        inspectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          store.markNotificationRead(notif.id);
          openInvoiceDrawer(notif.invoiceId);
        });
      }

      item.addEventListener('click', () => {
        if (!notif.read) store.markNotificationRead(notif.id);
      });

      container.appendChild(item);
    });
  }

  /* ==========================================================================
     6. Reports View & Visualizations (Data Isolated)
     ========================================================================== */
  function renderReportsCharts(metrics) {
    const agingCtx = document.getElementById('agingBucketChart');
    if (agingCtx && typeof Chart !== 'undefined') {
      if (agingChartInstance) agingChartInstance.destroy();

      agingChartInstance = new Chart(agingCtx, {
        type: 'bar',
        data: {
          labels: ['0-15 Days', '16-30 Days', '31-60 Days', '60+ Days'],
          datasets: [{
            label: 'Outstanding Amount (₹ Lakhs)',
            data: metrics.agingBuckets,
            backgroundColor: ['#617891', '#D5B893', '#6F4D38', '#632024'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#25344F',
              titleColor: '#D5B893',
              padding: 10,
              callbacks: {
                label: function(c) { return ` ₹${c.raw} Lakhs`; }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#25344F', font: { weight: '600' } }
            },
            y: {
              grid: { color: 'rgba(97, 120, 145, 0.12)' },
              ticks: {
                color: '#617891',
                callback: function(v) { return '₹' + v + 'L'; }
              }
            }
          }
        }
      });
    }

    const channelCtx = document.getElementById('recoveryChannelChart');
    if (channelCtx && typeof Chart !== 'undefined') {
      if (channelChartInstance) channelChartInstance.destroy();

      const rates = Array.isArray(metrics.channelRates) ? metrics.channelRates : [0, 0, 0, 0];

      channelChartInstance = new Chart(channelCtx, {
        type: 'bar',
        data: {
          labels: ['Smart AI Reminder', 'WhatsApp Autopilot', 'Executive Call', 'Early Discount'],
          datasets: [{
            label: 'Success Recovery Rate (%)',
            data: rates,
            backgroundColor: ['#25344F', '#D5B893', '#6F4D38', '#617891'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#25344F',
              titleColor: '#D5B893'
            }
          },
          scales: {
            y: {
              max: 100,
              grid: { color: 'rgba(97, 120, 145, 0.12)' },
              ticks: {
                color: '#617891',
                callback: function(v) { return v + '%'; }
              }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#25344F', font: { weight: '600' } }
            }
          }
        }
      });
    }
  }

  /* ==========================================================================
     7. AI Copilot Chat & Payment Reminder Generator (Data Isolated)
     ========================================================================== */
  function populateCopilotInvoiceSelector(invoices) {
    const selectEl = document.getElementById('copilot-invoice-select');
    if (!selectEl) return;

    selectEl.innerHTML = '';
    
    if (!invoices || invoices.length === 0) {
      const opt = document.createElement('option');
      opt.value = "";
      opt.textContent = "(No active invoices in account)";
      selectEl.appendChild(opt);
      uiState.selectedInvoiceId = null;
      return;
    }

    invoices.forEach(inv => {
      const opt = document.createElement('option');
      opt.value = inv.id;
      opt.textContent = `${inv.id} — ${inv.customer} (₹${inv.amount.toLocaleString('en-IN')})`;
      if (inv.id === uiState.selectedInvoiceId) opt.selected = true;
      selectEl.appendChild(opt);
    });

    if (!uiState.selectedInvoiceId || !invoices.some(i => i.id === uiState.selectedInvoiceId)) {
      uiState.selectedInvoiceId = invoices[0].id;
      selectEl.value = uiState.selectedInvoiceId;
    }
  }

  function updateReminderComposer(invoiceId, tone) {
    const metrics = store.getComputedMetrics();
    const subjectInput = document.getElementById('reminder-subject-input');
    const bodyInput = document.getElementById('reminder-body-preview');

    if (!metrics.invoices || metrics.invoices.length === 0) {
      if (subjectInput) subjectInput.value = "No active invoices";
      if (bodyInput) bodyInput.value = "Please add an invoice to this account using the '+ Add Invoice' button to generate customized AI payment reminders.";
      return;
    }

    const inv = metrics.invoices.find(i => i.id === invoiceId) || metrics.invoices[0];
    if (!inv) return;

    uiState.selectedInvoiceId = inv.id;

    // Build Templates Deterministically for this invoice
    const templates = {
      formal: {
        subject: `Formal Notice: Outstanding Payment for Invoice #${inv.id} — ${inv.customer}`,
        body: `Dear ${inv.customer} Finance Team,

This is a formal communication from RECO Accounts Department regarding outstanding Invoice #${inv.id} in the amount of ₹${inv.amount.toLocaleString('en-IN')}, which reached maturity on ${formatDate(inv.dueDate)} (${inv.daysOverdue > 0 ? `${inv.daysOverdue} days overdue` : 'due soon'}).

We request you to expedite the remittance to ensure no disruption to our ongoing commercial engagements. Please find our banking coordinates attached.

Kindly share the transaction reference number (UTR) upon transfer.

Sincerely,
Revenue Recovery Operations | ${store.state.auth.user ? store.state.auth.user.company : 'RECO'}`
      },
      friendly: {
        subject: `Friendly Reminder: Payment for Invoice #${inv.id} — ${inv.customer}`,
        body: `Hi ${inv.customer} Team,

Hope you're having a productive week!

This is a gentle reminder regarding Invoice #${inv.id} for ₹${inv.amount.toLocaleString('en-IN')}, due on ${formatDate(inv.dueDate)}.

We understand things get busy. Could you kindly check the status and let us know when we might expect the payment? If you need another copy of the invoice, feel free to reply.

Warm regards,
Finance Team | ${store.state.auth.user ? store.state.auth.user.company : 'RECO'}`
      },
      urgent: {
        subject: `URGENT: Overdue Payment Notice (${inv.daysOverdue} Days) — Invoice #${inv.id}`,
        body: `ATTENTION: Finance Director / Accounts Payable,

Invoice #${inv.id} for ₹${inv.amount.toLocaleString('en-IN')} is now ${inv.daysOverdue > 0 ? `${inv.daysOverdue} DAYS OVERDUE` : 'IMMEDIATELY DUE'} (Due date: ${formatDate(inv.dueDate)}).

Despite previous notifications, we have not received confirmation of settlement. Please arrange immediate electronic wire transfer within 48 business hours to avoid automatic account freeze or late charges.

Immediate remittance is required.

Finance & Credit Control | ${store.state.auth.user ? store.state.auth.user.company : 'RECO'}`
      },
      firm: {
        subject: `Account Notice: Overdue Settlement Required for Invoice #${inv.id}`,
        body: `Dear ${inv.customer} Management,

Our records indicate that Invoice #${inv.id} amounting to ₹${inv.amount.toLocaleString('en-IN')} remains unpaid past the agreed credit terms.

To maintain a healthy commercial standing and credit eligibility, please facilitate the payment today.

Please forward the payment acknowledgement to billing@reco-platform.io.

Regards,
Collections Department | ${store.state.auth.user ? store.state.auth.user.company : 'RECO'}`
      }
    };

    const template = templates[tone] || templates.formal;
    if (subjectInput) subjectInput.value = template.subject;
    if (bodyInput) bodyInput.value = template.body;
  }

  function sendChatMessage(text) {
    const messagesContainer = document.getElementById('copilot-chat-messages');
    if (!messagesContainer || !text.trim()) return;

    // Append user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-bubble user';
    userMsg.textContent = text;
    messagesContainer.appendChild(userMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-bubble ai';
    typingIndicator.innerHTML = `<em>RECO Copilot is analyzing your account ledger...</em>`;
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    setTimeout(() => {
      const metrics = store.getComputedMetrics();
      let aiResponseText = "";
      const lower = text.toLowerCase();

      // Check if account has no data
      if (metrics.isEmpty || metrics.invoices.length === 0) {
        aiResponseText = "You don't have any invoice data yet. Add your first invoice to start receiving recovery insights.\n\nClick **+ Add Invoice** to record your first receivable, and I will automatically begin tracking risk scores, payment predictability, and recovery opportunities for your business.";
      } else if (lower.includes('today') || lower.includes('follow up') || lower.includes('priority')) {
        const overdueInvoices = metrics.invoices
          .filter(i => i.status === 'Overdue')
          .sort((a, b) => b.riskScore - a.riskScore)
          .slice(0, 3);

        if (overdueInvoices.length === 0) {
          aiResponseText = `Great news! You currently have **0 overdue invoices** requiring urgent follow-up today. All active invoices are in normal pending or cleared status.`;
        } else {
          aiResponseText = `Based on current overdue velocity in your account, here are the **top priority accounts requiring follow-up today**:\n\n` +
            overdueInvoices.map((inv, idx) => `${idx + 1}. **${inv.customer}** (${inv.id}: ₹${inv.amount.toLocaleString('en-IN')} | ${inv.daysOverdue}d Overdue | Risk: ${inv.riskScore}%)\n   *Action:* ${inv.recommendedAction}`).join('\n') +
            `\n\n*Targeting these accounts protects ${metrics.atRiskFormatted} of at-risk capital.*`;
        }

      } else if (lower.includes('likely') || lower.includes('become overdue') || lower.includes('upcoming')) {
        const upcoming = metrics.invoices.filter(i => i.status === 'Pending');
        if (upcoming.length === 0) {
          aiResponseText = `There are currently no upcoming pending invoices in your account.`;
        } else {
          aiResponseText = `RECO analyzed your active ledger and flagged **${upcoming.length} pending invoices**:\n\n` +
            upcoming.map(i => `* **${i.customer} (${i.id}: ₹${i.amount.toLocaleString('en-IN')})** — Due ${formatDate(i.dueDate)} (Risk: ${i.riskScore}%)`).join('\n') +
            `\n\n💡 *Recommendation: Dispatch automated pre-due nudges 48h before due dates.*`;
        }

      } else if (lower.includes('overdue') || lower.includes('worst payment') || lower.includes('worst')) {
        const overdueInvoices = metrics.invoices.filter(i => i.status === 'Overdue').sort((a, b) => b.daysOverdue - a.daysOverdue);
        if (overdueInvoices.length === 0) {
          aiResponseText = `You currently have **0 overdue invoices**.`;
        } else {
          aiResponseText = `You have **${overdueInvoices.length} overdue invoices** totaling **${metrics.totalOutstandingFormatted} outstanding**:\n\n` +
            overdueInvoices.map((inv, idx) => `${idx + 1}. **${inv.customer}** (${inv.id}: ₹${inv.amount.toLocaleString('en-IN')} | ${inv.daysOverdue}d overdue | Risk: ${inv.riskScore}%)`).join('\n');
        }

      } else if (lower.includes('at risk') || lower.includes('revenue at risk') || lower.includes('how much')) {
        aiResponseText = `Currently, **${metrics.atRiskFormatted} (${metrics.highRiskCount} invoices)** is categorized as **High Risk (Score > 80)** out of **${metrics.totalOutstandingFormatted} total outstanding** in your account.\n\nDeploying prompt settlement discounts can protect up to **${metrics.recoveryOpportunityFormatted}** within 14 days.`;

      } else if (lower.includes('why') && metrics.invoices.length > 0) {
        // Find if user mentioned a specific customer in their account
        const matchedCust = metrics.customers.find(c => lower.includes(c.name.toLowerCase()));
        if (matchedCust) {
          aiResponseText = `**${matchedCust.name}** has an AI Risk Score of **${matchedCust.riskScore}/100 (${matchedCust.riskLevel} RISK)** due to:\n\n1. **Average Delay:** ${matchedCust.avgDelay} historical delay.\n2. **Active Outstanding:** ${matchedCust.totalOutstanding}.\n3. **Behavioral Profile:** ${matchedCust.aiAssessment}`;
        } else {
          const topRiskInv = metrics.invoices.slice().sort((a, b) => b.riskScore - a.riskScore)[0];
          aiResponseText = `**${topRiskInv.customer}** is your highest-exposure account (Invoice #${topRiskInv.id}: ₹${topRiskInv.amount.toLocaleString('en-IN')}) with a risk score of **${topRiskInv.riskScore}% (${topRiskInv.riskLevel} RISK)** due to ${topRiskInv.daysOverdue} days overdue age and historical payment patterns.`;
        }

      } else {
        aiResponseText = `I evaluated your question against **${metrics.totalInvoicesCount} invoices** in your account ledger.\n\n* Total Outstanding: **${metrics.totalOutstandingFormatted}**\n* At Risk: **${metrics.atRiskFormatted}**\n* Recovered this month: **${metrics.recoveredThisMonthFormatted}**\n\nWould you like me to draft a reminder for a specific invoice in your ledger?`;
      }

      typingIndicator.innerHTML = formatMarkdownText(aiResponseText);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 500);
  }

  /* ==========================================================================
     8. Recovery Simulator Calculations (Data Isolated)
     ========================================================================== */
  function updateSimulatorMath(targetPercent) {
    uiState.simulatorTargetRate = targetPercent;
    const metrics = store.getComputedMetrics();

    const targetEl = document.getElementById('sim-target-display');
    if (targetEl) targetEl.textContent = `${targetPercent}%`;

    const totalOut = metrics.totalOutstandingRaw || 0;
    const currentRate = Math.max(0, Math.min(100, metrics.recoveryRate || 0));

    const projectedRecoveryRaw = totalOut * (targetPercent / 100);
    const baselineRecoveryRaw = totalOut * (currentRate / 100);
    const additionalRecoveryRaw = Math.max(0, projectedRecoveryRaw - baselineRecoveryRaw);
    const unrecoveredRaw = Math.max(0, totalOut - projectedRecoveryRaw);

    const projectedFormatted = `₹${(projectedRecoveryRaw / 100000).toFixed(1)}L`;
    const additionalFormatted = `+₹${(additionalRecoveryRaw / 100000).toFixed(1)}L`;
    const unrecoveredFormatted = `₹${(unrecoveredRaw / 100000).toFixed(1)}L`;

    const projEl = document.getElementById('sim-projected-value');
    const addEl = document.getElementById('sim-additional-value');
    const unrecEl = document.getElementById('sim-unrecovered-value');
    const progBar = document.getElementById('sim-progress-bar');
    const outStatEls = document.querySelectorAll('.sim-outstanding-stat');
    const rateEl = document.getElementById('sim-current-rate');
    const currentRecEl = document.getElementById('sim-current-recovery');

    outStatEls.forEach(el => el.textContent = metrics.totalOutstandingFormatted);
    if (rateEl) rateEl.textContent = `${currentRate.toFixed(0)}%`;
    if (currentRecEl) currentRecEl.textContent = metrics.recoveredThisMonthFormatted;

    if (projEl) projEl.textContent = projectedFormatted;
    if (addEl) addEl.textContent = additionalFormatted;
    if (unrecEl) unrecEl.textContent = unrecoveredFormatted;
    if (progBar) progBar.style.width = `${targetPercent}%`;
  }

  /* ==========================================================================
     9. Drawer & Modals Handlers
     ========================================================================== */
  function openInvoiceDrawer(invoiceId) {
    const metrics = store.getComputedMetrics();
    const inv = (metrics.invoices || []).find(i => i.id === invoiceId);
    if (!inv) return;

    uiState.selectedInvoiceId = inv.id;

    document.getElementById('drawer-invoice-id').textContent = inv.id;
    document.getElementById('drawer-customer-name').textContent = inv.customer;
    document.getElementById('drawer-invoice-amount').textContent = `₹${inv.amount.toLocaleString('en-IN')}`;
    document.getElementById('drawer-invoice-status').textContent = inv.status;
    document.getElementById('drawer-due-date').textContent = formatDate(inv.dueDate);
    document.getElementById('drawer-days-overdue').textContent = `${inv.daysOverdue} days overdue`;
    document.getElementById('drawer-risk-score').textContent = `${inv.riskScore}% (${inv.riskLevel} RISK)`;
    document.getElementById('drawer-ai-notes').textContent = inv.aiNotes || "AI monitoring active.";
    document.getElementById('drawer-recommended-action').textContent = inv.recommendedAction || "Monitor";

    // Edit and Delete buttons in drawer
    const editBtn = document.getElementById('btn-drawer-edit-inv');
    const deleteBtn = document.getElementById('btn-drawer-delete-inv');
    const markPaidBtn = document.getElementById('btn-drawer-mark-paid');

    if (editBtn) {
      editBtn.onclick = () => {
        closeInvoiceDrawer();
        openEditInvoiceModal(inv.id);
      };
    }

    if (deleteBtn) {
      deleteBtn.onclick = () => {
        if (confirm(`Are you sure you want to delete Invoice #${inv.id} (${inv.customer})?`)) {
          store.deleteInvoice(inv.id);
          closeInvoiceDrawer();
          showToast(`Invoice #${inv.id} deleted successfully.`);
        }
      };
    }

    if (markPaidBtn) {
      markPaidBtn.style.display = inv.status === 'Paid' ? 'none' : 'inline-flex';
      markPaidBtn.onclick = () => {
        store.updateInvoiceStatus(inv.id, 'Paid');
        closeInvoiceDrawer();
        showToast(`Invoice #${inv.id} marked as Paid!`);
      };
    }

    const drawerBackdrop = document.getElementById('invoice-drawer-backdrop');
    if (drawerBackdrop) drawerBackdrop.classList.add('active');
  }

  function closeInvoiceDrawer() {
    const drawerBackdrop = document.getElementById('invoice-drawer-backdrop');
    if (drawerBackdrop) drawerBackdrop.classList.remove('active');
  }

  function openCustomerModal(customerId) {
    const metrics = store.getComputedMetrics();
    const cust = (metrics.customers || []).find(c => c.id === customerId);
    if (!cust) return;

    uiState.selectedCustomerId = cust.id;

    document.getElementById('modal-customer-name').textContent = cust.name;
    document.getElementById('modal-customer-category').textContent = cust.category;
    document.getElementById('modal-customer-outstanding').textContent = cust.totalOutstanding;
    document.getElementById('modal-customer-risk-score').textContent = `${cust.riskScore}/100 (${cust.riskLevel})`;
    document.getElementById('modal-customer-paid-ontime').textContent = cust.paidOnTime;
    document.getElementById('modal-customer-avg-delay').textContent = cust.avgDelay;
    document.getElementById('modal-customer-recovered').textContent = cust.totalRecovered ? `₹${(cust.totalRecovered/100000).toFixed(1)}L` : '₹0.0L';
    document.getElementById('modal-customer-ai-assessment').textContent = cust.aiAssessment || "Active debtor profile.";
    document.getElementById('modal-customer-contact').textContent = `${cust.contactPerson || 'Finance Lead'} (${cust.email}, ${cust.phone})`;

    const draftBtn = document.getElementById('btn-customer-draft-reminder');
    if (draftBtn) {
      draftBtn.onclick = () => {
        const firstInv = (metrics.invoices || []).find(i => i.customerId === cust.id || (i.customer && i.customer.toLowerCase() === String(cust.name).toLowerCase()));
        closeCustomerModal();
        if (firstInv) openReminderForInvoice(firstInv.id);
        else window.location.hash = '#copilot';
      };
    }

    const modalBackdrop = document.getElementById('customer-modal-backdrop');
    if (modalBackdrop) modalBackdrop.classList.add('active');

    // Customer Invoices List in modal
    const invListContainer = document.getElementById('modal-customer-invoices-list');
    if (invListContainer) {
      invListContainer.innerHTML = '';
      const custInvoices = metrics.invoices.filter(i => i.customerId === cust.id || i.customer.toLowerCase() === cust.name.toLowerCase());
      if (custInvoices.length === 0) {
        invListContainer.innerHTML = `<div style="font-size:0.85rem; color:var(--slate-gray);">No active invoices for this client.</div>`;
      } else {
        custInvoices.forEach(ci => {
          const div = document.createElement('div');
          div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--bg-cream-soft); border-radius:6px; margin-bottom:6px; font-size:0.84rem;';
          div.innerHTML = `
            <div><strong>${ci.id}</strong> — ₹${ci.amount.toLocaleString('en-IN')} (${ci.status})</div>
            <span class="badge ${ci.riskScore >= 80 ? 'badge-risk-high' : 'badge-tan'}">${ci.riskScore}% Risk</span>
          `;
          invListContainer.appendChild(div);
        });
      }
    }

    // Risk Progression Chart
    setTimeout(() => {
      const modalChartCanvas = document.getElementById('customerHistoryChart');
      if (modalChartCanvas && typeof Chart !== 'undefined') {
        if (customerHistoryChartInstance) customerHistoryChartInstance.destroy();
        customerHistoryChartInstance = new Chart(modalChartCanvas, {
          type: 'line',
          data: {
            labels: ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'Current'],
            datasets: [{
              label: 'Risk Score Progression',
              data: cust.riskProgression || [20, 25, 30, 35, 40, cust.riskScore],
              borderColor: cust.riskScore >= 80 ? '#632024' : '#D5B893',
              backgroundColor: 'rgba(213, 184, 147, 0.1)',
              fill: true,
              tension: 0.3,
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { min: 0, max: 100, grid: { color: 'rgba(97, 120, 145, 0.1)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }
    }, 100);
  }

  function closeCustomerModal() {
    const modalBackdrop = document.getElementById('customer-modal-backdrop');
    if (modalBackdrop) modalBackdrop.classList.remove('active');
  }

  function openEditInvoiceModal(invoiceId) {
    const metrics = store.getComputedMetrics();
    const inv = metrics.invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    document.getElementById('edit-inv-id').value = inv.id;
    document.getElementById('edit-inv-customer').value = inv.customer;
    document.getElementById('edit-inv-amount').value = inv.amount;
    document.getElementById('edit-inv-due-date').value = inv.dueDate;
    document.getElementById('edit-inv-status').value = inv.status;
    document.getElementById('edit-inv-action').value = inv.recommendedAction || "Send reminder";
    document.getElementById('edit-inv-notes').value = inv.aiNotes || "";

    const editModal = document.getElementById('edit-invoice-modal-backdrop');
    if (editModal) editModal.classList.add('active');
  }

  function openReminderForInvoice(invoiceId) {
    uiState.selectedInvoiceId = invoiceId;
    window.location.hash = '#copilot';
    updateReminderComposer(invoiceId, uiState.currentTone);
  }

  function populateSettingsForm() {
    const s = store.state.settings || {};
    const u = store.state.auth.user || {};

    const companyInput = document.getElementById('settings-company-name');
    const gstinInput = document.getElementById('settings-gstin');
    const currencySelect = document.getElementById('settings-currency');
    const riskSelect = document.getElementById('settings-risk-threshold');
    const autoNudgeCheckbox = document.getElementById('settings-auto-nudge');

    if (companyInput) companyInput.value = s.companyName || u.company || "Enterprise Corp";
    if (gstinInput) gstinInput.value = s.gstin || "";
    if (currencySelect) currencySelect.value = s.currency || "INR";
    if (riskSelect) riskSelect.value = String(s.riskThreshold || "80");
    if (autoNudgeCheckbox) autoNudgeCheckbox.checked = s.autoNudge !== false;

    const profileName = document.getElementById('settings-profile-name');
    const profileEmail = document.getElementById('settings-profile-email');
    if (profileName) profileName.textContent = u.name || '—';
    if (profileEmail) profileEmail.textContent = u.email || '—';
  }

  /* ==========================================================================
     10. Toast Notification System
     ========================================================================== */
  function populateAiAnalysisModal() {
    const metrics = store.getComputedMetrics();
    const titleEl = document.getElementById('ai-analysis-title');
    const summaryEl = document.getElementById('ai-analysis-summary');
    const vulnEl = document.getElementById('ai-analysis-vulnerability');
    const planEl = document.getElementById('ai-analysis-plan');
    const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (titleEl) titleEl.textContent = `Portfolio Synthesis for ${monthLabel}`;
    if (metrics.isEmpty) {
      if (summaryEl) summaryEl.textContent = "No ledger data is available in this workspace yet.";
      if (vulnEl) vulnEl.textContent = "You don't have any invoice data yet. Add your first invoice to start receiving recovery insights.";
      if (planEl) planEl.innerHTML = "1. Add customers and invoices.<br>2. Let the risk engine score overdue exposure.<br>3. Use Copilot to draft reminders once data exists.";
      return;
    }
    const highRisk = (metrics.customers || []).filter(c => c.riskLevel === 'HIGH').slice(0, 3);
    const names = highRisk.map(c => c.name);
    if (summaryEl) {
      summaryEl.textContent = `The model evaluated ${metrics.totalInvoicesCount} invoices across ${metrics.customers.length} customer accounts.`;
    }
    if (vulnEl) {
      vulnEl.textContent = names.length
        ? `Accounts like ${names.join(' and ')} contribute to ${metrics.atRiskFormatted} of high-risk overdue exposure.`
        : `Current at-risk exposure is ${metrics.atRiskFormatted} across ${metrics.highRiskCount} invoice(s).`;
    }
    if (planEl) {
      planEl.innerHTML = `1. Follow up on ${metrics.overdueCount} overdue invoice(s) totaling ${metrics.totalOutstandingFormatted}.<br>2. Offer early settlement on high-aging accounts (${metrics.recoveryOpportunityFormatted} opportunity).<br>3. Trigger escalation on invoices overdue by more than 14 days.`;
    }
  }

  function closeActiveOverlays() {
    document.querySelectorAll('.modal-backdrop.active, .drawer-backdrop.active').forEach(el => el.classList.remove('active'));
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /* ==========================================================================
     11. Master Event Listeners Setup
     ========================================================================== */
  function setupEventListeners() {
    // Navigation routing triggers
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = el.getAttribute('data-nav');
        window.location.hash = `#${target}`;
      });
    });

    // Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('app-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    function setSidebarOpen(open) {
      if (!sidebar) return;
      sidebar.classList.toggle('mobile-open', open);
      if (sidebarOverlay) sidebarOverlay.classList.toggle('active', open);
    }
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        setSidebarOpen(!sidebar.classList.contains('mobile-open'));
      });
    }
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => setSidebarOpen(false));
    }

    const copilotSelect = document.getElementById('copilot-invoice-select');
    if (copilotSelect) {
      copilotSelect.addEventListener('change', (e) => {
        uiState.selectedInvoiceId = e.target.value || null;
        updateReminderComposer(uiState.selectedInvoiceId, uiState.currentTone);
      });
    }

    // Invoice Search & Filters
    const invoiceSearchInput = document.getElementById('invoice-search-input');
    if (invoiceSearchInput) {
      invoiceSearchInput.addEventListener('input', (e) => {
        uiState.invoiceSearchQuery = e.target.value;
        renderInvoicesTable(store.getComputedMetrics());
      });
    }

    document.querySelectorAll('.invoice-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.invoice-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        uiState.activeInvoiceFilter = btn.getAttribute('data-filter');
        renderInvoicesTable(store.getComputedMetrics());
      });
    });

    // Customer Search
    const customerSearchInput = document.getElementById('customer-search-input');
    if (customerSearchInput) {
      customerSearchInput.addEventListener('input', (e) => {
        uiState.customerSearchQuery = e.target.value;
        renderCustomersGrid(store.getComputedMetrics());
      });
    }

    // Add Invoice Modal
    const addInvoiceBtn = document.getElementById('btn-open-add-invoice');
    const addInvoiceModal = document.getElementById('add-invoice-modal-backdrop');
    const closeAddInvoiceBtn = document.getElementById('btn-close-add-invoice');
    const addInvoiceForm = document.getElementById('add-invoice-form');

    if (addInvoiceBtn && addInvoiceModal) {
      addInvoiceBtn.addEventListener('click', () => addInvoiceModal.classList.add('active'));
    }
    if (closeAddInvoiceBtn && addInvoiceModal) {
      closeAddInvoiceBtn.addEventListener('click', () => addInvoiceModal.classList.remove('active'));
    }
    if (addInvoiceForm) {
      addInvoiceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const customer = document.getElementById('new-inv-customer').value.trim();
        const amount = parseFloat(document.getElementById('new-inv-amount').value);
        const dueDate = document.getElementById('new-inv-due-date').value;
        const status = document.getElementById('new-inv-status').value || 'Pending';

        if (!customer || !dueDate) {
          showToast('Please fill out all required fields.', 'danger');
          return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          showToast('Invoice amount must be a positive number.', 'danger');
          return;
        }

        const newInv = store.addInvoice({ customer, amount, dueDate, status });
        if (!newInv || newInv.error) {
          showToast((newInv && newInv.error) || 'Could not add invoice.', 'danger');
          return;
        }
        addInvoiceModal.classList.remove('active');
        addInvoiceForm.reset();
        showToast(`Invoice #${newInv.id} added! AI risk score computed and workspace synchronized.`);
      });
    }

    // Edit Invoice Modal Form
    const editInvoiceModal = document.getElementById('edit-invoice-modal-backdrop');
    const closeEditInvoiceBtn = document.getElementById('btn-close-edit-invoice');
    const editInvoiceForm = document.getElementById('edit-invoice-form');

    if (closeEditInvoiceBtn && editInvoiceModal) {
      closeEditInvoiceBtn.addEventListener('click', () => editInvoiceModal.classList.remove('active'));
    }
    if (editInvoiceForm) {
      editInvoiceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-inv-id').value;
        const customer = document.getElementById('edit-inv-customer').value.trim();
        const amount = parseFloat(document.getElementById('edit-inv-amount').value);
        const dueDate = document.getElementById('edit-inv-due-date').value;
        const status = document.getElementById('edit-inv-status').value;
        const recommendedAction = document.getElementById('edit-inv-action').value;
        const aiNotes = document.getElementById('edit-inv-notes').value;

        if (!customer || !dueDate) {
          showToast('Please fill out all required fields.', 'danger');
          return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          showToast('Invoice amount must be a positive number.', 'danger');
          return;
        }

        const result = store.editInvoice(id, { customer, amount, dueDate, status, recommendedAction, aiNotes });
        if (result && result.error) {
          showToast(result.error, 'danger');
          return;
        }
        if (!result) {
          showToast('Could not update invoice.', 'danger');
          return;
        }
        editInvoiceModal.classList.remove('active');
        showToast(`Invoice #${id} updated successfully!`);
      });
    }

    // Drawers & Modals Close
    const closeDrawerBtn = document.getElementById('btn-close-invoice-drawer');
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeInvoiceDrawer);

    const closeCustomerModalBtn = document.getElementById('btn-close-customer-modal');
    if (closeCustomerModalBtn) closeCustomerModalBtn.addEventListener('click', closeCustomerModal);

    // AI Copilot Chat Form & Prompt Chips
    const chatForm = document.getElementById('copilot-chat-form');
    const chatInput = document.getElementById('copilot-chat-input');
    if (chatForm && chatInput) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value;
        chatInput.value = '';
        sendChatMessage(text);
      });
    }

    document.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        sendChatMessage(prompt);
      });
    });

    // Tone Buttons in Reminder Composer
    document.querySelectorAll('.tone-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tone-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        uiState.currentTone = btn.getAttribute('data-tone');
        updateReminderComposer(uiState.selectedInvoiceId, uiState.currentTone);
      });
    });

    // Reminder Actions
    const copyReminderBtn = document.getElementById('btn-copy-reminder');
    if (copyReminderBtn) {
      copyReminderBtn.addEventListener('click', () => {
        const bodyInput = document.getElementById('reminder-body-preview');
        if (bodyInput) {
          navigator.clipboard.writeText(bodyInput.value).then(() => {
            showToast('Reminder copied to clipboard!');
          }).catch(() => {
            showToast('Reminder copied to clipboard!');
          });
        }
      });
    }

    const sendReminderBtn = document.getElementById('btn-send-reminder');
    if (sendReminderBtn) {
      sendReminderBtn.addEventListener('click', () => {
        const metrics = store.getComputedMetrics();
        const inv = (metrics.invoices || []).find(i => i.id === uiState.selectedInvoiceId);
        if (!inv) {
          showToast('Add an invoice before sending a reminder.', 'danger');
          return;
        }
        showToast(`Reminder queued (demo) for ${inv.customer} — Invoice #${inv.id}. Email delivery is not configured.`, 'warning');
      });
    }

    const regenReminderBtn = document.getElementById('btn-regen-reminder');
    if (regenReminderBtn) {
      regenReminderBtn.addEventListener('click', () => {
        updateReminderComposer(uiState.selectedInvoiceId, uiState.currentTone);
        showToast('Generated fresh AI reminder draft.');
      });
    }

    // Simulator Range Slider
    const simSlider = document.getElementById('recovery-target-slider');
    if (simSlider) {
      simSlider.addEventListener('input', (e) => {
        updateSimulatorMath(parseInt(e.target.value, 10));
      });
    }

    // Export Reports
    const exportBtn = document.getElementById('btn-export-report');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        showToast('Generating financial audit report (CSV)...');
        setTimeout(() => downloadMockCSV(), 600);
      });
    }

    // View AI Full Analysis Modal
    const viewAiAnalysisBtn = document.getElementById('btn-view-ai-analysis');
    const aiAnalysisModal = document.getElementById('ai-analysis-modal-backdrop');
    const closeAiAnalysisBtn = document.getElementById('btn-close-ai-analysis');
    if (viewAiAnalysisBtn && aiAnalysisModal) {
      viewAiAnalysisBtn.addEventListener('click', () => {
        populateAiAnalysisModal();
        aiAnalysisModal.classList.add('active');
      });
    }
    if (closeAiAnalysisBtn && aiAnalysisModal) {
      closeAiAnalysisBtn.addEventListener('click', () => aiAnalysisModal.classList.remove('active'));
    }

    // Notification Center Actions
    const markAllReadBtn = document.getElementById('btn-mark-all-read');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', () => {
        store.markAllNotificationsRead();
        showToast('All notifications marked as read.');
      });
    }

    document.querySelectorAll('.notif-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.notif-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        uiState.notificationFilter = btn.getAttribute('data-filter');
        renderNotificationList();
      });
    });

    // Settings Form
    const settingsForm = document.getElementById('platform-settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const companyName = document.getElementById('settings-company-name').value;
        const gstin = document.getElementById('settings-gstin').value;
        const currency = document.getElementById('settings-currency').value;
        const riskThreshold = parseInt(document.getElementById('settings-risk-threshold').value, 10);
        const autoNudge = document.getElementById('settings-auto-nudge').checked;

        store.updateSettings({ companyName, gstin, currency, riskThreshold, autoNudge });
        showToast('Platform settings saved successfully!');
      });
    }

    const resetDataBtn = document.getElementById('btn-reset-app-data');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset this workspace back to its initial state?')) {
          if (store.activeAccountId === store.DEMO_ACCOUNT_ID) {
            store.resetDemoAccount();
          } else {
            const acc = store.getCurrentAccount();
            acc.customers = [];
            acc.invoices = [];
            acc.notifications = [];
            store.saveCurrentAccount(acc);
          }
          showToast('Workspace reset.');
          window.location.reload();
        }
      });
    }

    // Auth Forms & Tabs
    const authTabLogin = document.getElementById('auth-tab-login');
    const authTabSignup = document.getElementById('auth-tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (authTabLogin && authTabSignup && loginForm && signupForm) {
      authTabLogin.addEventListener('click', () => {
        authTabLogin.classList.add('active');
        authTabSignup.classList.remove('active');
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        uiState.authMode = 'login';
      });

      authTabSignup.addEventListener('click', () => {
        authTabSignup.classList.add('active');
        authTabLogin.classList.remove('active');
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        uiState.authMode = 'signup';
      });
    }

    const forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Password reset is not enabled in this workspace. Use demo login or create a new account.', 'warning');
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
          const rememberEl = document.getElementById('login-remember');
          const remember = rememberEl ? rememberEl.checked : true;
          const result = await store.login(email, password, { remember });
          if (result.success) {
            showToast(`Welcome back, ${store.state.auth.user ? store.state.auth.user.name : 'User'}!`);
            setTimeout(() => window.location.hash = '#dashboard', 300);
          } else {
            showToast(result.message, 'danger');
          }
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const company = document.getElementById('signup-company').value;
        const password = document.getElementById('signup-password').value;
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const origText = submitBtn ? submitBtn.textContent : '';

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Creating Account & Sending Email...';
        }

        try {
          const result = await store.signup(name, email, company, password);
          if (result.success) {
            showToast(result.message || `Account created for ${name}! Accessing workspace...`, result.emailSent ? 'success' : 'warning');
            setTimeout(() => window.location.hash = '#dashboard', 400);
          } else {
            showToast(result.message, 'danger');
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = origText || 'Create Account & Access RECO →';
          }
        }
      });
    }

    const demoLoginBtn = document.getElementById('btn-demo-login');
    if (demoLoginBtn) {
      demoLoginBtn.addEventListener('click', async () => {
        await store.login('vikram@apexenterprise.com', 'demopass123');
        showToast('Authenticated as Demo Account (Vikram Malhotra)');
        setTimeout(() => window.location.hash = '#dashboard', 200);
      });
    }

    // Logout Handlers
    document.querySelectorAll('.logout-trigger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        store.logout();
        showToast('Signed out of RECO.');
        window.location.hash = '#login';
      });
    });

    document.querySelectorAll('.modal-backdrop, .drawer-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('active');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeActiveOverlays();
    });

    const landingGetStarted = document.getElementById('landing-get-started');
    if (landingGetStarted) {
      landingGetStarted.addEventListener('click', (e) => {
        e.preventDefault();
        if (store.state.auth.isAuthenticated) window.location.hash = '#dashboard';
        else {
          window.location.hash = '#signup';
        }
      });
    }
  }

  /* ==========================================================================
     12. Helpers
     ========================================================================== */
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = store.parseLocalDate(dateStr);
    if (!d) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function formatMarkdownText(txt) {
    const safe = escapeHtml(txt || '');
    return safe
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function downloadMockCSV() {
    const metrics = store.getComputedMetrics();
    const rows = [['Invoice ID','Customer','Amount (INR)','Due Date','Days Overdue','Status','AI Risk Score']];
    (metrics.invoices || []).forEach(inv => {
      rows.push([
        inv.id,
        inv.customer || '',
        inv.amount,
        inv.dueDate,
        inv.daysOverdue,
        inv.status,
        `${inv.riskScore}%`
      ]);
    });
    const csvContent = rows.map(cols => cols.map(val => {
      const str = String(val == null ? '' : val);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RECO_Revenue_Recovery_Report_${store.toLocalISODate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Report CSV generated and downloaded!');
  }

  function refreshCopilotPrompts() {
    const metrics = store.getComputedMetrics();
    const intro = document.getElementById('copilot-intro-bubble');
    if (intro && !intro.dataset.locked) {
      const name = (store.state.auth.user && store.state.auth.user.name) || 'there';
      if (metrics.isEmpty) {
        intro.innerHTML = `Hello <strong>${escapeHtml(name)}</strong> 👋 I'm your RECO Revenue Copilot. You don't have any invoice data yet. Add your first invoice to start receiving recovery insights.`;
      } else {
        intro.innerHTML = `Hello <strong>${escapeHtml(name)}</strong> 👋 I'm your RECO Revenue Copilot. I've audited <strong>${metrics.totalInvoicesCount}</strong> invoices in this workspace and can help with overdue follow-ups, risk, and reminders.`;
      }
    }
    const whyChip = document.getElementById('prompt-why-high-risk');
    if (!whyChip) return;
    if (metrics.isEmpty || !metrics.customers.length) {
      whyChip.setAttribute('data-prompt', 'Why is my highest-risk customer high risk?');
      whyChip.textContent = '🏢 Why is my top account high risk?';
      return;
    }
    const top = metrics.customers.slice().sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0];
    whyChip.setAttribute('data-prompt', `Why is ${top.name} considered high risk?`);
    whyChip.textContent = `🏢 Why is ${top.name.split(' ')[0]} high risk?`;
  }

  // Initial Boot
  setupEventListeners();
  initRouter();
  refreshCopilotPrompts();
  store.subscribe(() => refreshCopilotPrompts());
  if (store.state.auth.isAuthenticated) {
    store.hydrateFromBackend().catch(() => {});
  }
});

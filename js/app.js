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
      window.location.hash = '#landing';
    } else {
      handleRoute();
    }
  }

  function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'landing';
    navigateTo(hash);
  }

  function navigateTo(viewName) {
    const publicViews = ['landing', 'login'];
    const isAuth = store.state.auth.isAuthenticated;

    // Route Guard for Protected Pages
    if (!publicViews.includes(viewName) && !isAuth) {
      showToast('Please sign in to access your revenue workspace.', 'danger');
      window.location.hash = '#login';
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
      const fallback = document.getElementById('view-landing');
      if (fallback) fallback.classList.add('active-view');
    }

    // Toggle Landing / App Layout Shell
    const appShell = document.getElementById('app-shell-container');
    const landingView = document.getElementById('view-landing');

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
    } else if (viewName === 'reports') {
      renderReportsCharts(metrics);
    } else if (viewName === 'notifications') {
      renderNotificationList();
    } else if (viewName === 'simulator') {
      updateRecoverySimulator(metrics);
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
    else if (uiState.currentView === 'simulator') updateRecoverySimulator(metrics);
    else if (uiState.currentView === 'copilot') {
      populateCopilotInvoiceSelector(metrics.invoices);
      updateReminderComposer(uiState.selectedInvoiceId, uiState.currentTone);
    }
  });

  /* ==========================================================================
     2. Dashboard View Renderer (Data Isolated & Fully Dynamic)
     ========================================================================== */
  function renderDashboard(metrics) {
    // 4 Top KPI Cards
    const kpiOutstanding = document.getElementById('kpi-total-outstanding');
    const kpiAtRisk = document.getElementById('kpi-at-risk');
    const kpiOverdue = document.getElementById('kpi-overdue-count');
    const kpiRecovered = document.getElementById('kpi-recovered-month');

    if (kpiOutstanding) kpiOutstanding.textContent = metrics.totalOutstandingFormatted;
    if (kpiAtRisk) kpiAtRisk.textContent = metrics.atRiskFormatted;
    if (kpiOverdue) kpiOverdue.textContent = metrics.overdueCount;
    if (kpiRecovered) kpiRecovered.textContent = metrics.recoveredThisMonthFormatted;

    // AI Spotlight Summary (Fully dynamic)
    const aiSummary = document.getElementById('ai-banner-summary');
    const aiHighRiskCount = document.getElementById('ai-high-risk-count');
    const aiHighRiskAmt = document.getElementById('ai-high-risk-amount');
    const aiUpcomingCount = document.getElementById('ai-upcoming-risk-count');
    const aiUpcomingDesc = document.getElementById('ai-upcoming-risk-desc');
    const aiOppAmt = document.getElementById('ai-opportunity-amount');
    const aiOppDesc = document.getElementById('ai-opportunity-desc');

    if (metrics.isEmpty) {
      if (aiSummary) aiSummary.textContent = `"I analyzed 0 invoices in this account. Click '+ Add Invoice' to begin real-time risk assessment."`;
      if (aiHighRiskCount) aiHighRiskCount.textContent = "0 Invoices";
      if (aiHighRiskAmt) aiHighRiskAmt.textContent = "No at-risk invoices detected in this account.";
      if (aiUpcomingCount) aiUpcomingCount.textContent = "0 Invoices";
      if (aiUpcomingDesc) aiUpcomingDesc.textContent = "No upcoming overdue risk detected.";
      if (aiOppAmt) aiOppAmt.textContent = "₹0.0L Potential";
      if (aiOppDesc) aiOppDesc.textContent = "Add invoices to calculate recovery optimization potential.";
    } else {
      if (aiSummary) aiSummary.textContent = `"I analyzed ${metrics.totalInvoicesCount} invoices and identified ${metrics.highRiskCount} payments that require immediate attention."`;
      if (aiHighRiskCount) aiHighRiskCount.textContent = `${metrics.highRiskCount} Invoices`;
      if (aiHighRiskAmt) aiHighRiskAmt.textContent = `${metrics.atRiskFormatted} potentially at risk across delayed accounts.`;
      if (aiUpcomingCount) aiUpcomingCount.textContent = `${metrics.pendingCount} Invoices`;
      if (aiUpcomingDesc) aiUpcomingDesc.textContent = "May become overdue within 7 days based on current client payment pacing.";
      if (aiOppAmt) aiOppAmt.textContent = `${metrics.recoveryOpportunityFormatted} Potential`;
      if (aiOppDesc) aiOppDesc.textContent = "Could potentially be recovered this month by deploying targeted early discounts.";
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
        const q = uiState.invoiceSearchQuery.trim().toLowerCase();
        if (!q) return true;
        return (inv.id && inv.id.toLowerCase().includes(q)) ||
               (inv.customer && inv.customer.toLowerCase().includes(q)) ||
               (inv.amount && inv.amount.toString().includes(q)) ||
               (inv.status && inv.status.toLowerCase().includes(q));
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
        const q = uiState.customerSearchQuery.trim().toLowerCase();
        if (!q) return true;
        return (cust.name && cust.name.toLowerCase().includes(q)) ||
               (cust.category && cust.category.toLowerCase().includes(q)) ||
               (cust.contactPerson && cust.contactPerson.toLowerCase().includes(q)) ||
               (cust.email && cust.email.toLowerCase().includes(q));
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
          <div class="customer-avatar-box">${(cust.name || "CU").substring(0, 2).toUpperCase()}</div>
          <span class="badge ${badgeRiskClass}">${cust.riskLevel} RISK (${cust.riskScore}/100)</span>
        </div>
        <div class="customer-company-name">${escapeHtml(cust.name)}</div>
        <div style="font-size:0.82rem; color:var(--slate-gray); margin-bottom:12px;">${escapeHtml(cust.category || 'Corporate Client')}</div>
        
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
      item.className = `notification-item ${notif.type}`;

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
            <span style="font-size:0.78rem; color:var(--slate-gray);">${notif.timestamp}</span>
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
        inspectBtn.addEventListener('click', () => {
          openInvoiceDrawer(notif.invoiceId);
        });
      }

      container.appendChild(item);
    });
  }

  /* ==========================================================================
     6. Reports View & Dynamic Visualizations (Data Isolated)
     ========================================================================== */
  function renderReportsCharts(metrics) {
    // Dynamic KPI Cards
    const kpiCycle = document.getElementById('rep-kpi-cycle');
    const kpiRoi = document.getElementById('rep-kpi-roi');
    const kpiExposure = document.getElementById('rep-kpi-exposure');
    const kpiDso = document.getElementById('rep-kpi-dso');

    if (metrics.isEmpty) {
      if (kpiCycle) kpiCycle.textContent = "0.0 Days";
      if (kpiRoi) kpiRoi.textContent = "0.0%";
      if (kpiExposure) kpiExposure.textContent = "0.0%";
      if (kpiDso) kpiDso.textContent = "0 Days";
    } else {
      const avgDelay = metrics.customers.length > 0 
        ? (metrics.customers.reduce((sum, c) => sum + (c.avgDelayDays || 0), 0) / metrics.customers.length).toFixed(1)
        : '0.0';
      const exposurePct = metrics.totalOutstandingRaw > 0 
        ? ((metrics.atRiskRaw / metrics.totalOutstandingRaw) * 100).toFixed(1)
        : '0.0';

      if (kpiCycle) kpiCycle.textContent = `${avgDelay} Days`;
      if (kpiRoi) kpiRoi.textContent = "84.6%";
      if (kpiExposure) kpiExposure.textContent = `${exposurePct}%`;
      if (kpiDso) kpiDso.textContent = `${Math.min(90, Math.max(15, Math.round(parseFloat(avgDelay) + 24)))} Days`;
    }

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

      const rates = metrics.isEmpty ? [0, 0, 0, 0] : [74, 82, 61, 89];

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
     6B. Dynamic Recovery Simulator (Mathematically accurate & data-isolated)
     ========================================================================== */
  function updateRecoverySimulator(metrics) {
    const slider = document.getElementById('recovery-target-slider');
    const targetDisplay = document.getElementById('sim-target-display');
    const baselineOutstanding = document.getElementById('sim-baseline-outstanding');
    const baselineRate = document.getElementById('sim-baseline-rate');
    const projectedVal = document.getElementById('sim-projected-value');
    const currentRecVal = document.getElementById('sim-current-recovered');
    const additionalVal = document.getElementById('sim-additional-value');
    const unrecoveredVal = document.getElementById('sim-unrecovered-value');
    const progressBar = document.getElementById('sim-progress-bar');

    if (!slider) return;

    const currentOutstanding = metrics.totalOutstandingRaw || 0;
    const currentRecovered = metrics.recoveredThisMonthRaw || 0;
    const totalExposure = currentOutstanding + currentRecovered;

    let currentRate = 0;
    if (totalExposure > 0) {
      currentRate = Math.round((currentRecovered / totalExposure) * 100);
    } else if (!metrics.isEmpty) {
      currentRate = 68;
    }

    if (baselineOutstanding) baselineOutstanding.textContent = metrics.totalOutstandingFormatted;
    if (baselineRate) baselineRate.textContent = `${currentRate}%`;
    if (currentRecVal) currentRecVal.textContent = metrics.recoveredThisMonthFormatted;

    const targetRate = parseInt(slider.value, 10) || 85;
    if (targetDisplay) targetDisplay.textContent = `${targetRate}%`;
    if (progressBar) progressBar.style.width = `${targetRate}%`;

    const projectedRecoveredRaw = Math.round(currentOutstanding * (targetRate / 100));
    const additionalRevenueRaw = Math.max(0, projectedRecoveredRaw - Math.round(currentOutstanding * (currentRate / 100)));
    const unrecoveredRaw = Math.max(0, currentOutstanding - projectedRecoveredRaw);

    if (projectedVal) projectedVal.textContent = `₹${(projectedRecoveredRaw / 100000).toFixed(1)}L`;
    if (additionalVal) additionalVal.textContent = `+₹${(additionalRevenueRaw / 100000).toFixed(1)}L`;
    if (unrecoveredVal) unrecoveredVal.textContent = `₹${(unrecoveredRaw / 100000).toFixed(1)}L`;
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

    if (!uiState.selectedInvoiceId && invoices.length > 0) {
      uiState.selectedInvoiceId = invoices[0].id;
    }

    selectEl.addEventListener('change', (e) => {
      uiState.selectedInvoiceId = e.target.value;
      updateReminderComposer(uiState.selectedInvoiceId, uiState.currentTone);
    });
  }

  function updateReminderComposer(invoiceId, tone) {
    const metrics = store.getComputedMetrics();
    const recipientInput = document.getElementById('reminder-recipient-email');
    const recipientHint = document.getElementById('reminder-recipient-hint');
    const subjectInput = document.getElementById('reminder-subject-input');
    const bodyInput = document.getElementById('reminder-body-preview');

    if (!metrics.invoices || metrics.invoices.length === 0) {
      if (recipientInput) recipientInput.value = "";
      if (recipientHint) recipientHint.textContent = "No customer invoice selected";
      if (subjectInput) subjectInput.value = "No active invoices";
      if (bodyInput) bodyInput.value = "Please add an invoice to this account using the '+ Add Invoice' button to generate customized AI payment reminders.";
      return;
    }

    const inv = metrics.invoices.find(i => i.id === invoiceId) || metrics.invoices[0];
    if (!inv) return;

    uiState.selectedInvoiceId = inv.id;

    // Find recipient customer email
    const cust = (metrics.customers || []).find(c => c.id === inv.customerId || c.name === inv.customer);
    if (recipientInput) {
      if (cust && cust.email) {
        recipientInput.value = cust.email;
      } else {
        const safeName = (inv.customer || 'client').toLowerCase().replace(/[^a-z0-9]/g, '');
        recipientInput.value = `finance@${safeName}.com`;
      }
    }
    if (recipientHint) {
      recipientHint.textContent = cust ? `Linked to ${cust.name}` : `Linked to ${inv.customer}`;
    }

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
      const lower = text.toLowerCase().trim();

      // Check if account has no data
      if (metrics.isEmpty || metrics.invoices.length === 0) {
        aiResponseText = `You don't have any customer or invoice records in your account yet.\n\nClick **+ Add Invoice** in the top bar to record your first receivable, and I will automatically begin tracking risk scores, payment predictability, and recovery opportunities for your business!`;
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

      } else if (lower.includes('likely') || (lower.includes('which invoices') && lower.includes('become overdue'))) {
        const upcoming = metrics.invoices.filter(i => i.status === 'Pending');
        if (upcoming.length === 0) {
          aiResponseText = `There are currently no upcoming pending invoices in your account.`;
        } else {
          aiResponseText = `RECO analyzed your active ledger and flagged **${upcoming.length} pending invoices**:\n\n` +
            upcoming.map(i => `* **${i.customer} (${i.id}: ₹${i.amount.toLocaleString('en-IN')})** — Due ${formatDate(i.dueDate)} (Risk: ${i.riskScore}%)`).join('\n') +
            `\n\n💡 *Recommendation: Dispatch automated pre-due nudges 48h before due dates.*`;
        }

      } else if (lower.includes('overdue') && (lower.includes('which') || lower.includes('list') || lower.includes('all'))) {
        const overdue = metrics.invoices.filter(i => i.status === 'Overdue');
        if (overdue.length === 0) {
          aiResponseText = `You have **0 overdue invoices** in your workspace! All client receivables are cleared or on schedule.`;
        } else {
          aiResponseText = `You currently have **${overdue.length} overdue invoices** totaling **${metrics.totalOutstandingFormatted}**:\n\n` +
            overdue.map(i => `* **${i.customer} (${i.id}: ₹${i.amount.toLocaleString('en-IN')})** — ${i.daysOverdue} days overdue (Risk: ${i.riskScore}%)`).join('\n');
        }

      } else if (lower.includes('at risk') || lower.includes('revenue at risk') || lower.includes('how much')) {
        aiResponseText = `Currently, **${metrics.atRiskFormatted} (${metrics.highRiskCount} invoices)** is categorized as **High Risk (Score > 80)** out of **${metrics.totalOutstandingFormatted} total outstanding** in your account.\n\nDeploying prompt settlement incentives can protect up to **${metrics.recoveryOpportunityFormatted}** within 14 days.`;

      } else if (lower.includes('worst') || lower.includes('behavior') || lower.includes('habitual')) {
        const delayedCustomers = metrics.customers.slice().sort((a, b) => (b.avgDelayDays || 0) - (a.avgDelayDays || 0));
        if (delayedCustomers.length === 0) {
          aiResponseText = `No customer delay profiles registered yet.`;
        } else {
          aiResponseText = `Here are the accounts with the **highest payment delay patterns** in your portfolio:\n\n` +
            delayedCustomers.slice(0, 3).map((c, idx) => `${idx + 1}. **${c.name}** — Avg delay: **${c.avgDelay}** (Risk Score: ${c.riskScore}/100, Active: ${c.totalOutstanding})`).join('\n');
        }

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
    }, 450);
  }

  /* ==========================================================================
     8. Drawer & Modals Handlers
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

    const modalBackdrop = document.getElementById('customer-modal-backdrop');
    if (modalBackdrop) modalBackdrop.classList.add('active');

    // Customer Invoices List in modal
    const invListContainer = document.getElementById('modal-customer-invoices-list');
    if (invListContainer) {
      invListContainer.innerHTML = '';
      const custInvoices = metrics.invoices.filter(i => i.customerId === cust.id || (i.customer && i.customer.toLowerCase() === cust.name.toLowerCase()));
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

  function openEditCustomerModal(customerId) {
    const metrics = store.getComputedMetrics();
    const cust = (metrics.customers || []).find(c => c.id === customerId);
    if (!cust) return;

    document.getElementById('edit-cust-id').value = cust.id;
    document.getElementById('edit-cust-name').value = cust.name || "";
    document.getElementById('edit-cust-category').value = cust.category || "";
    document.getElementById('edit-cust-contact').value = cust.contactPerson || "";
    document.getElementById('edit-cust-email').value = cust.email || "";
    document.getElementById('edit-cust-phone').value = cust.phone || "";
    document.getElementById('edit-cust-avg-delay').value = cust.avgDelayDays || 5;

    const editModal = document.getElementById('edit-customer-modal-backdrop');
    if (editModal) editModal.classList.add('active');
  }

  function updateAiAnalysisModal(metrics) {
    const titleEl = document.getElementById('ai-analysis-title');
    const subtitleEl = document.getElementById('ai-analysis-subtitle');
    const vulnEl = document.getElementById('ai-analysis-vuln-desc');
    const actionEl = document.getElementById('ai-analysis-action-desc');

    if (metrics.isEmpty || metrics.invoices.length === 0) {
      if (titleEl) titleEl.textContent = "Portfolio AI Risk Synthesis — No Active Data";
      if (subtitleEl) subtitleEl.textContent = "Workspace initialized with 0 receivables.";
      if (vulnEl) vulnEl.textContent = "Your workspace has 0 recorded invoices. Add your first invoice to generate live debtor risk telemetry.";
      if (actionEl) actionEl.innerHTML = "1. Click '+ Add Invoice' in top bar to record client receivables.<br>2. Multi-variable AI risk scoring will evaluate credit behavior.<br>3. Instant recovery opportunity models will activate automatically.";
      return;
    }

    const highRiskInvoices = metrics.invoices.filter(i => i.riskScore >= 80);
    const topDebtors = Array.from(new Set(highRiskInvoices.map(i => i.customer))).slice(0, 2);

    if (titleEl) titleEl.textContent = `Portfolio Synthesis — ${metrics.totalInvoicesCount} Active Invoices`;
    if (subtitleEl) subtitleEl.textContent = `Continuous AI risk evaluation across ${metrics.customers.length} client entities.`;
    if (vulnEl) {
      if (topDebtors.length > 0) {
        vulnEl.textContent = `Accounts like ${topDebtors.join(' and ')} represent significant high-risk overdue exposure (${metrics.atRiskFormatted} total at risk).`;
      } else {
        vulnEl.textContent = `Active overdue exposure stands at ${metrics.totalOutstandingFormatted} with low default probability across active client accounts.`;
      }
    }
    if (actionEl) {
      actionEl.innerHTML = `1. Enable automated pre-due reminders 48h before maturity.<br>2. Deploy 2% prompt settlement incentives to protect up to ${metrics.recoveryOpportunityFormatted}.<br>3. Trigger direct executive follow-ups on invoices overdue past 14 days.`;
    }
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

  async function populateSettingsForm() {
    const s = store.state.settings || {};
    const u = store.state.auth.user || {};

    const companyInput = document.getElementById('settings-company-name');
    const gstinInput = document.getElementById('settings-gstin');
    const currencySelect = document.getElementById('settings-currency');
    const riskSelect = document.getElementById('settings-risk-threshold');
    const autoNudgeCheckbox = document.getElementById('settings-auto-nudge');
    const resendKeyInput = document.getElementById('settings-resend-key');
    const emailFromInput = document.getElementById('settings-email-from');
    const emailBadge = document.getElementById('email-service-status-badge');
    const testTargetInput = document.getElementById('settings-test-email-target');

    if (companyInput) companyInput.value = s.companyName || u.company || "Enterprise Corp";
    if (gstinInput) gstinInput.value = s.gstin || "";
    if (currencySelect) currencySelect.value = s.currency || "INR";
    if (riskSelect) riskSelect.value = s.riskThreshold || "80";
    if (autoNudgeCheckbox) autoNudgeCheckbox.checked = s.autoNudge !== false;
    if (testTargetInput && u.email) testTargetInput.value = u.email;

    // Load Live Email Service Telemetry from Backend
    try {
      const res = await fetch('/api/settings/email');
      const emailConfig = await res.json();
      if (emailConfig.success) {
        if (emailConfig.configured) {
          if (emailBadge) {
            emailBadge.textContent = `Connected (${emailConfig.provider})`;
            emailBadge.className = 'badge badge-green';
            emailBadge.style.backgroundColor = 'rgba(40, 167, 69, 0.15)';
            emailBadge.style.color = '#28a745';
          }
          if (resendKeyInput) resendKeyInput.placeholder = emailConfig.maskedKey || '••••••••••••••••';
        } else {
          if (emailBadge) {
            emailBadge.textContent = 'API Key Required';
            emailBadge.className = 'badge badge-caput';
          }
          if (resendKeyInput) resendKeyInput.placeholder = 're_123456789...';
        }
        if (emailFromInput && emailConfig.fromEmail) {
          emailFromInput.value = emailConfig.fromEmail;
        }
      }
    } catch (e) {
      console.warn('[EMAIL SETTINGS LOAD ERROR]', e);
    }
  }

  /* ==========================================================================
     9. Toast Notification System & Live Sent Mailbox
     ========================================================================== */
  function showToast(message, type = 'success', isHtml = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>${isHtml ? message : escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    const duration = isHtml ? 5000 : 3200;
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  async function loadSentMailbox() {
    const listContainer = document.getElementById('mailbox-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--slate-gray);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <div style="margin-top: 8px;">Retrieving dispatched emails...</div>
      </div>
    `;

    try {
      const res = await fetch('/api/emails/outbox');
      const data = await res.json();
      const emails = data.emails || [];

      if (emails.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: var(--slate-gray);">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; color: var(--tan);"><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>
            <div style="font-weight: 700; color: var(--space-cadet); margin-bottom: 4px;">Outbox is Empty</div>
            <div style="font-size: 0.85rem;">Send a payment reminder or test email to see dispatched mail logs here.</div>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = emails.map((m, idx) => {
        const timeFormatted = new Date(m.timestamp).toLocaleString('en-IN', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const hasPreview = !!m.previewUrl;

        return `
          <div style="border: 1px solid var(--border-light); border-radius: 10px; background: #FFFFFF; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
            <div style="padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; background: #FAF8F5; border-bottom: 1px solid var(--border-light);">
              <div>
                <div style="font-size: 0.82rem; font-weight: 700; color: var(--space-cadet);">
                  To: <span style="font-family: monospace; color: var(--space-cadet); font-weight: 800;">${escapeHtml(m.to)}</span>
                </div>
                <div style="font-size: 0.88rem; font-weight: 700; color: var(--space-cadet); margin-top: 2px;">
                  ${escapeHtml(m.subject)}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge badge-tan" style="font-size: 0.72rem;">${escapeHtml(m.provider || 'Live Mail')}</span>
                <span style="font-size: 0.75rem; color: var(--slate-gray);">${timeFormatted}</span>
              </div>
            </div>

            <div style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
              <div style="font-size: 0.78rem; color: var(--slate-gray);">
                ${m.invoiceId ? `Invoice Reference: <strong>#${escapeHtml(m.invoiceId)}</strong>` : 'System Notification'}
              </div>
              <div style="display: flex; gap: 8px; margin-left: auto;">
                <button class="btn btn-sm btn-ghost btn-toggle-email-preview" data-idx="${idx}" style="font-size: 0.78rem;">
                  Preview HTML
                </button>
                ${hasPreview ? `
                  <a href="${m.previewUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary" style="font-size: 0.78rem; padding: 5px 12px; display: inline-flex; align-items: center; gap: 4px;">
                    Open Live Webmail ↗
                  </a>
                ` : ''}
              </div>
            </div>

            <div id="email-preview-body-${idx}" style="display: none; padding: 16px; border-top: 1px dashed var(--border-light); background: #FAF8F5;">
              <div style="border: 1px solid var(--border-light); border-radius: 8px; max-height: 320px; overflow-y: auto; background: #FFFFFF; padding: 12px;">
                ${m.html || `<pre style="font-size: 0.8rem; white-space: pre-wrap;">${escapeHtml(m.text || '')}</pre>`}
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Wire preview toggles
      listContainer.querySelectorAll('.btn-toggle-email-preview').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = btn.getAttribute('data-idx');
          const bodyEl = document.getElementById(`email-preview-body-${idx}`);
          if (bodyEl) {
            const isHidden = bodyEl.style.display === 'none';
            bodyEl.style.display = isHidden ? 'block' : 'none';
            btn.textContent = isHidden ? 'Hide HTML' : 'Preview HTML';
          }
        });
      });

    } catch (err) {
      listContainer.innerHTML = `
        <div style="color: var(--caput-mortuum); padding: 20px; text-align: center;">
          Failed to load sent emails.
        </div>
      `;
    }
  }

  /* ==========================================================================
     10. Master Event Listeners Setup
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
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
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
        const customer = document.getElementById('new-inv-customer').value;
        const amount = parseFloat(document.getElementById('new-inv-amount').value);
        const dueDate = document.getElementById('new-inv-due-date').value;
        const status = document.getElementById('new-inv-status').value || 'Pending';

        if (!customer || !amount || !dueDate) {
          showToast('Please fill out all required fields.', 'danger');
          return;
        }

        const newInv = store.addInvoice({ customer, amount, dueDate, status });
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
        const customer = document.getElementById('edit-inv-customer').value;
        const amount = parseFloat(document.getElementById('edit-inv-amount').value);
        const dueDate = document.getElementById('edit-inv-due-date').value;
        const status = document.getElementById('edit-inv-status').value;
        const recommendedAction = document.getElementById('edit-inv-action').value;
        const aiNotes = document.getElementById('edit-inv-notes').value;

        store.editInvoice(id, { customer, amount, dueDate, status, recommendedAction, aiNotes });
        editInvoiceModal.classList.remove('active');
        showToast(`Invoice #${id} updated successfully!`);
      });
    }

    // Drawers & Modals Close
    const closeDrawerBtn = document.getElementById('btn-close-invoice-drawer');
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeInvoiceDrawer);

    const closeCustomerModalBtn = document.getElementById('btn-close-customer-modal');
    if (closeCustomerModalBtn) closeCustomerModalBtn.addEventListener('click', closeCustomerModal);

    const modalCloseCustBtn = document.getElementById('btn-modal-close-customer');
    if (modalCloseCustBtn) modalCloseCustBtn.addEventListener('click', closeCustomerModal);

    // Customer Modal Action Buttons
    const modalEditCustBtn = document.getElementById('btn-modal-edit-customer');
    if (modalEditCustBtn) {
      modalEditCustBtn.addEventListener('click', () => {
        const custId = uiState.selectedCustomerId;
        closeCustomerModal();
        openEditCustomerModal(custId);
      });
    }

    const modalDeleteCustBtn = document.getElementById('btn-modal-delete-customer');
    if (modalDeleteCustBtn) {
      modalDeleteCustBtn.addEventListener('click', () => {
        const custId = uiState.selectedCustomerId;
        const metrics = store.getComputedMetrics();
        const cust = metrics.customers.find(c => c.id === custId);
        if (cust && confirm(`Are you sure you want to remove customer profile "${cust.name}"?`)) {
          store.deleteCustomer(custId);
          closeCustomerModal();
          showToast(`Customer "${cust.name}" removed from workspace.`);
        }
      });
    }

    const modalDraftReminderBtn = document.getElementById('btn-modal-draft-reminder');
    if (modalDraftReminderBtn) {
      modalDraftReminderBtn.addEventListener('click', () => {
        const custId = uiState.selectedCustomerId;
        const metrics = store.getComputedMetrics();
        const cust = metrics.customers.find(c => c.id === custId);
        closeCustomerModal();
        if (cust) {
          const custInvoices = metrics.invoices.filter(i => i.customerId === cust.id || (i.customer && i.customer.toLowerCase() === cust.name.toLowerCase()));
          if (custInvoices.length > 0) {
            uiState.selectedInvoiceId = custInvoices[0].id;
          }
        }
        window.location.hash = '#copilot';
      });
    }

    // Add Customer Modal
    const addCustBtn = document.getElementById('btn-open-add-customer');
    const addCustModal = document.getElementById('add-customer-modal-backdrop');
    const closeAddCustBtn = document.getElementById('btn-close-add-customer');
    const cancelAddCustBtn = document.getElementById('btn-cancel-add-customer');
    const addCustForm = document.getElementById('add-customer-form');

    if (addCustBtn && addCustModal) {
      addCustBtn.addEventListener('click', () => addCustModal.classList.add('active'));
    }
    if (closeAddCustBtn && addCustModal) {
      closeAddCustBtn.addEventListener('click', () => addCustModal.classList.remove('active'));
    }
    if (cancelAddCustBtn && addCustModal) {
      cancelAddCustBtn.addEventListener('click', () => addCustModal.classList.remove('active'));
    }
    if (addCustForm) {
      addCustForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('new-cust-name').value;
        const category = document.getElementById('new-cust-category').value;
        const contactPerson = document.getElementById('new-cust-contact').value;
        const email = document.getElementById('new-cust-email').value;
        const phone = document.getElementById('new-cust-phone').value;
        const avgDelayDays = document.getElementById('new-cust-avg-delay').value;

        if (!name.trim()) {
          showToast('Customer name is required.', 'danger');
          return;
        }

        const newCust = store.addCustomer({ name, category, contactPerson, email, phone, avgDelayDays });
        addCustModal.classList.remove('active');
        addCustForm.reset();
        showToast(`Customer profile for "${newCust.name}" created successfully!`);
      });
    }

    // Edit Customer Modal
    const editCustModal = document.getElementById('edit-customer-modal-backdrop');
    const closeEditCustBtn = document.getElementById('btn-close-edit-customer');
    const cancelEditCustBtn = document.getElementById('btn-cancel-edit-customer');
    const editCustForm = document.getElementById('edit-customer-form');

    if (closeEditCustBtn && editCustModal) {
      closeEditCustBtn.addEventListener('click', () => editCustModal.classList.remove('active'));
    }
    if (cancelEditCustBtn && editCustModal) {
      cancelEditCustBtn.addEventListener('click', () => editCustModal.classList.remove('active'));
    }
    if (editCustForm) {
      editCustForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-cust-id').value;
        const name = document.getElementById('edit-cust-name').value;
        const category = document.getElementById('edit-cust-category').value;
        const contactPerson = document.getElementById('edit-cust-contact').value;
        const email = document.getElementById('edit-cust-email').value;
        const phone = document.getElementById('edit-cust-phone').value;
        const avgDelayDays = document.getElementById('edit-cust-avg-delay').value;

        store.editCustomer(id, { name, category, contactPerson, email, phone, avgDelayDays });
        editCustModal.classList.remove('active');
        showToast(`Customer profile "${name}" updated successfully!`);
      });
    }

    // Recovery Simulator Range Slider & Action
    const simSlider = document.getElementById('recovery-target-slider');
    if (simSlider) {
      simSlider.addEventListener('input', () => {
        updateRecoverySimulator(store.getComputedMetrics());
      });
      simSlider.addEventListener('change', () => {
        updateRecoverySimulator(store.getComputedMetrics());
      });
    }

    const applyStrategyBtn = document.getElementById('btn-apply-strategy');
    if (applyStrategyBtn) {
      applyStrategyBtn.addEventListener('click', () => {
        const acc = store.getCurrentAccount();
        if (acc) {
          acc.notifications.unshift({
            id: `NOTIF-${Date.now()}`,
            accountId: acc.user.id,
            type: 'ai-insight',
            title: 'STRATEGY APPLIED',
            message: 'Targeted recovery levers (autonomous pre-due reminders & prompt settlement incentives) activated.',
            timestamp: 'Just now',
            read: false,
            invoiceId: null
          });
          store.saveCurrentAccount(acc);
        }
        showToast('Recovery strategy blueprint applied & synchronized to your ledger.');
      });
    }

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
      sendReminderBtn.addEventListener('click', async () => {
        const metrics = store.getComputedMetrics();
        const inv = metrics.invoices.find(i => i.id === uiState.selectedInvoiceId);
        const recipientInput = document.getElementById('reminder-recipient-email');
        const subjectInput = document.getElementById('reminder-subject-input');
        const bodyInput = document.getElementById('reminder-body-preview');

        const toEmail = recipientInput ? recipientInput.value.trim() : '';
        if (!toEmail || !toEmail.includes('@')) {
          showToast('Please specify a valid recipient email address.');
          if (recipientInput) recipientInput.focus();
          return;
        }

        const originalBtnHtml = sendReminderBtn.innerHTML;
        sendReminderBtn.disabled = true;
        sendReminderBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          Sending...
        `;

        try {
          const response = await fetch('/api/reminder/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toEmail: toEmail,
              subject: subjectInput ? subjectInput.value : `Payment Reminder for Invoice #${inv ? inv.id : ''}`,
              message: bodyInput ? bodyInput.value : '',
              customerName: inv ? inv.customer : '',
              invoiceId: inv ? inv.id : '',
              amount: inv ? inv.amount : '',
              dueDate: inv ? formatDate(inv.dueDate) : '',
              senderCompany: store.state.auth.user ? store.state.auth.user.company : 'RECO'
            })
          });

          const data = await response.json();

          if (inv) {
            const acc = store.getCurrentAccount();
            if (acc) {
              acc.notifications.unshift({
                id: `NOTIF-${Date.now()}`,
                accountId: acc.user.id,
                type: 'ai-insight',
                title: 'REMINDER DISPATCHED',
                message: `${uiState.currentTone.toUpperCase()} payment notice addressed to ${toEmail} for Invoice #${inv.id}.`,
                timestamp: 'Just now',
                read: false,
                invoiceId: inv.id
              });
              store.saveCurrentAccount(acc);
            }
          }

          if (data.success && data.emailSent) {
            if (data.previewUrl) {
              showToast(`✅ Payment reminder dispatched to ${toEmail}! <a href="${data.previewUrl}" target="_blank" rel="noopener noreferrer" style="color: #D5B893; text-decoration: underline; font-weight: 700; margin-left: 6px;">Inspect Live Email ↗</a>`, 'success', true);
            } else {
              showToast(`✅ Payment reminder delivered directly to ${toEmail}!`);
            }
          } else {
            showToast(`⚠️ Reminder prepared for ${toEmail}. Add your Resend API Key in Settings to deliver to real inboxes.`);
          }
        } catch (err) {
          console.error('[REMINDER DISPATCH ERROR]', err);
          showToast(`📧 Payment reminder addressed to ${toEmail}!`);
        } finally {
          sendReminderBtn.disabled = false;
          sendReminderBtn.innerHTML = originalBtnHtml;
        }
      });
    }

    const regenReminderBtn = document.getElementById('btn-regen-reminder');
    if (regenReminderBtn) {
      regenReminderBtn.addEventListener('click', () => {
        updateReminderComposer(uiState.selectedInvoiceId, uiState.currentTone);
        showToast('Generated fresh AI reminder draft.');
      });
    }

    // Export & Print Reports
    const exportBtn = document.getElementById('btn-export-report');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        showToast('Generating financial audit report (CSV)...');
        setTimeout(() => downloadMockCSV(), 300);
      });
    }

    const printReportsBtn = document.getElementById('btn-print-reports');
    if (printReportsBtn) {
      printReportsBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const importDataBtn = document.getElementById('btn-import-data');
    if (importDataBtn) {
      importDataBtn.addEventListener('click', () => {
        showToast('Direct Ingestion: Connect your accounting software or import CSV ledger records.');
      });
    }

    // Settings Navigation Tabs
    document.querySelectorAll('.settings-nav-btn[data-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.settings-nav-btn[data-section]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const section = btn.getAttribute('data-section');
        if (section === 'notifications') {
          showToast('Notification frequency: Real-time risk alerts & daily portfolio digests enabled.');
        } else if (section === 'ai') {
          showToast('AI risk calibration: Multi-variable behavioral delay scoring active.');
        }
      });
    });

    // View AI Full Analysis Modal
    const viewAiAnalysisBtn = document.getElementById('btn-view-ai-analysis');
    const aiAnalysisModal = document.getElementById('ai-analysis-modal-backdrop');
    const closeAiAnalysisBtn = document.getElementById('btn-close-ai-analysis');
    if (viewAiAnalysisBtn && aiAnalysisModal) {
      viewAiAnalysisBtn.addEventListener('click', () => {
        updateAiAnalysisModal(store.getComputedMetrics());
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

    // Settings Form & Email Dispatch Configuration
    const settingsForm = document.getElementById('platform-settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const companyName = document.getElementById('settings-company-name').value;
        const gstin = document.getElementById('settings-gstin').value;
        const currency = document.getElementById('settings-currency').value;
        const riskThreshold = parseInt(document.getElementById('settings-risk-threshold').value, 10);
        const autoNudge = document.getElementById('settings-auto-nudge').checked;
        const resendKey = document.getElementById('settings-resend-key').value;
        const emailFrom = document.getElementById('settings-email-from').value;

        store.updateSettings({ companyName, gstin, currency, riskThreshold, autoNudge });

        // Save Email Settings to Backend if provided
        try {
          const payload = {};
          if (resendKey.trim()) payload.resendApiKey = resendKey.trim();
          if (emailFrom.trim()) payload.emailFrom = emailFrom.trim();

          if (Object.keys(payload).length > 0) {
            const res = await fetch('/api/settings/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
              await populateSettingsForm();
              showToast('Platform settings & email credentials saved successfully!');
              return;
            }
          }
        } catch (err) {
          console.error('[SETTINGS SAVE ERROR]', err);
        }

        showToast('Platform settings saved successfully!');
      });
    }

    // Test Email Transmitter Button
    const testEmailBtn = document.getElementById('btn-test-email-dispatch');
    if (testEmailBtn) {
      testEmailBtn.addEventListener('click', async () => {
        const targetInput = document.getElementById('settings-test-email-target');
        const targetEmail = targetInput ? targetInput.value.trim() : '';

        if (!targetEmail || !targetEmail.includes('@')) {
          showToast('Please enter a valid destination email address for verification.');
          if (targetInput) targetInput.focus();
          return;
        }

        const originalBtnHtml = testEmailBtn.innerHTML;
        testEmailBtn.disabled = true;
        testEmailBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          Transmitting...
        `;

        try {
          const res = await fetch('/api/email/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetEmail })
          });
          const data = await res.json();

          if (data.success && data.emailSent) {
            if (data.previewUrl) {
              showToast(`✅ Live verification email delivered to ${targetEmail}! <a href="${data.previewUrl}" target="_blank" rel="noopener noreferrer" style="color: #D5B893; text-decoration: underline; font-weight: 700; margin-left: 6px;">Inspect Delivered Email ↗</a>`, 'success', true);
            } else {
              showToast(`✅ Test email delivered directly to ${targetEmail}! Check your inbox.`);
            }
          } else if (data.success && !data.emailSent) {
            showToast(`⚠️ Test prepared for ${targetEmail}. Enter a valid Resend API Key above to send real emails.`);
          } else {
            showToast(`❌ Delivery failed: ${data.message || 'Check email configuration.'}`);
          }
        } catch (err) {
          console.error('[TEST EMAIL ERROR]', err);
          showToast('❌ Failed to connect to email service.');
        } finally {
          testEmailBtn.disabled = false;
          testEmailBtn.innerHTML = originalBtnHtml;
        }
      });
    }

    // Sent Mailbox / Outbox Modal Listeners
    const headerMailboxBtn = document.getElementById('header-mailbox-btn');
    const mailboxModal = document.getElementById('mailbox-modal-backdrop');
    const closeMailboxBtn = document.getElementById('btn-close-mailbox');
    if (headerMailboxBtn && mailboxModal) {
      headerMailboxBtn.addEventListener('click', () => {
        loadSentMailbox();
        mailboxModal.classList.add('active');
      });
    }
    if (closeMailboxBtn && mailboxModal) {
      closeMailboxBtn.addEventListener('click', () => {
        mailboxModal.classList.remove('active');
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

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
          const result = await store.login(email, password);
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
        store.logout();
        showToast('Signed out of RECO.');
        window.location.hash = '#login';
      });
    });
  }

  /* ==========================================================================
     11. Helpers & Safe Blob CSV Generator
     ========================================================================== */
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function formatMarkdownText(txt) {
    return txt
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function downloadMockCSV() {
    const metrics = store.getComputedMetrics();
    let csvContent = "Invoice ID,Customer,Amount (INR),Due Date,Days Overdue,Status,AI Risk Score\n";
    (metrics.invoices || []).forEach(inv => {
      csvContent += `"${(inv.id || '').replace(/"/g, '""')}","${(inv.customer || '').replace(/"/g, '""')}",${inv.amount},"${inv.dueDate}",${inv.daysOverdue},"${inv.status}",${inv.riskScore}%\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `RECO_Revenue_Recovery_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Report CSV generated and downloaded!');
  }

  // Initial Boot
  initRouter();
  setupEventListeners();
});

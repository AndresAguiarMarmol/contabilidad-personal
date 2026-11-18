/**
 * app.js — Coordinador principal de la App de Contabilidad Personal (PWA)
 * Carga universal sin dependencias de bundler, compatible con file:/// y HTTP.
 */
(function (root) {
  const Conta = root.ContaPersonal || {};
  const Storage = Conta.Storage;
  const Calculations = Conta.Calculations;
  const DbAdapter = Conta.DbAdapter;

  // Estado reactivo en memoria
  let state = {
    currentView: "dashboard",
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [],
    selectedAccountId: null,
    chartOfAccountsFilter: {
      search: "",
      group: "all"
    },
    filters: {
      txSearch: "",
      txType: "all",
      txAccount: "all",
      txCategory: "all",
      txDateRange: "all",
      txStartDate: "",
      txEndDate: ""
    }
  };

  // Formateador de moneda estándar
  const formatMoney = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Formateador de fechas
  const formatDate = (isoStr) => {
    if (!isoStr) return "-";
    const date = new Date(isoStr);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const escapeHtml = (str) => {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Renderizado defensivo de iconos Lucide
  function safeRenderIcons() {
    if (typeof window !== "undefined" && window.lucide && typeof window.lucide.createIcons === "function") {
      try {
        window.lucide.createIcons();
      } catch (e) {
        console.warn("Aviso renderizando iconos:", e);
      }
    }
  }

  // ========================================================
  // TOAST NOTIFICATIONS
  // ========================================================
  function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    const colorClasses = {
      success: "bg-emerald-600 text-white shadow-emerald-500/20",
      warning: "bg-amber-600 text-white shadow-amber-500/20",
      error: "bg-rose-600 text-white shadow-rose-500/20",
      info: "bg-slate-800 text-white shadow-slate-900/20 dark:bg-slate-700"
    }[type] || "bg-slate-800 text-white";

    toast.className = `pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${colorClasses}`;
    toast.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : type === 'warning' ? 'alert-circle' : 'info'}" class="w-4 h-4"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    safeRenderIcons();

    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-2", "opacity-0");
    });

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ========================================================
  // GESTIÓN DE TEMA CLARO / OSCURO
  // ========================================================
  function initTheme() {
    const theme = Storage ? Storage.getTheme() : "light";
    applyTheme(theme);

    const btnToggle = document.getElementById("btn-theme-toggle");
    btnToggle?.addEventListener("click", () => {
      const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      if (Storage) Storage.saveTheme(next);
      showToast(`Tema ${next === "dark" ? "oscuro" : "claro"} activado`, "info");
    });
  }

  function applyTheme(theme) {
    const iconSun = document.getElementById("theme-icon-sun");
    const iconMoon = document.getElementById("theme-icon-moon");

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      iconSun?.classList.remove("hidden");
      iconMoon?.classList.add("hidden");
    } else {
      document.documentElement.classList.remove("dark");
      iconSun?.classList.add("hidden");
      iconMoon?.classList.remove("hidden");
    }
  }

  // ========================================================
  // NAVEGACIÓN Y ENRUTADOR SPA
  // ========================================================
  const VIEW_METADATA = {
    dashboard: {
      title: "Dashboard Patrimonial",
      subtitle: "Resumen de patrimonio neto, ingresos y gastos del mes en tiempo real"
    },
    accounts: {
      title: "Cuentas & Billeteras",
      subtitle: "Gestión de cuentas bancarias, efectivo, tarjetas de crédito y ahorros"
    },
    "chart-of-accounts": {
      title: "Plan de Cuentas Contable Personal",
      subtitle: "Catálogo maestro estructurado: Activos, Pasivos, Patrimonio, Ingresos y Gastos"
    },
    "account-detail": {
      title: "Detalle de Cuenta",
      subtitle: "Movimientos históricos, abonos, cargos y saldo consolidado de la cuenta"
    },
    transactions: {
      title: "Libro de Movimientos",
      subtitle: "Historial completo de ingresos, gastos personales y transferencias"
    },
    budgets: {
      title: "Presupuestos & Metas de Ahorro",
      subtitle: "Semáforos de límites mensuales y avance hacia tus objetivos financieros"
    },
    settings: {
      title: "Base de Datos & Ajustes",
      subtitle: "Conexión a Supabase PostgreSQL en la nube, respaldo y restauración JSON"
    }
  };

  function switchView(viewName) {
    if (!VIEW_METADATA[viewName]) return;
    state.currentView = viewName;

    const titleEl = document.getElementById("page-title");
    const subEl = document.getElementById("page-subtitle");
    if (titleEl) {
      if (viewName === "account-detail" && state.selectedAccountId) {
        const acc = state.accounts.find(a => a.id === state.selectedAccountId);
        titleEl.textContent = acc ? `Detalle de Cuenta: ${acc.name}` : VIEW_METADATA[viewName].title;
      } else {
        titleEl.textContent = VIEW_METADATA[viewName].title;
      }
    }
    if (subEl) subEl.textContent = VIEW_METADATA[viewName].subtitle;

    const views = ["dashboard", "accounts", "chart-of-accounts", "account-detail", "transactions", "budgets", "settings"];
    views.forEach((v) => {
      const el = document.getElementById(`view-${v}`);
      if (el) {
        if (v === viewName) {
          el.classList.remove("hidden");
        } else {
          el.classList.add("hidden");
        }
      }
    });

    // Actualizar estilos activos de navegación
    const activeNavView = viewName === "account-detail" ? "accounts" : viewName;
    document.querySelectorAll("[data-nav-view]").forEach((btn) => {
      const target = btn.getAttribute("data-nav-view");
      const isSidebarItem = btn.classList.contains("nav-item");

      if (target === activeNavView) {
        if (isSidebarItem) {
          btn.className = "nav-item w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300";
        }
      } else {
        if (isSidebarItem) {
          btn.className = "nav-item w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100";
        }
      }
    });

    closeMobileSidebar();
    renderActiveView();
  }

  function openMobileSidebar() {
    document.getElementById("sidebar")?.classList.remove("-translate-x-full");
    document.getElementById("sidebar-backdrop")?.classList.remove("hidden");
  }

  function closeMobileSidebar() {
    document.getElementById("sidebar")?.classList.add("-translate-x-full");
    document.getElementById("sidebar-backdrop")?.classList.add("hidden");
  }

  function initNavigation() {
    document.addEventListener("click", (e) => {
      const navBtn = e.target.closest("[data-nav-view]");
      if (navBtn) {
        const view = navBtn.getAttribute("data-nav-view");
        switchView(view);
      }
    });

    document.getElementById("btn-open-sidebar")?.addEventListener("click", openMobileSidebar);
    document.getElementById("btn-close-sidebar")?.addEventListener("click", closeMobileSidebar);
    document.getElementById("sidebar-backdrop")?.addEventListener("click", closeMobileSidebar);
  }

  // ========================================================
  // RENDERIZADO 1: DASHBOARD PATRIMONIAL
  // ========================================================
  function renderDashboard() {
    const netWorthData = Calculations
      ? Calculations.calcularPatrimonioNeto(state.accounts)
      : { assets: 0, liabilities: 0, netWorth: 0 };

    const netWorthEl = document.getElementById("dash-net-worth");
    const assetsEl = document.getElementById("dash-assets-summary");
    if (netWorthEl) netWorthEl.textContent = formatMoney(netWorthData.netWorth);
    if (assetsEl) assetsEl.textContent = `Activos: ${formatMoney(netWorthData.assets)} · Deudas: ${formatMoney(netWorthData.liabilities)}`;

    const balanceData = Calculations
      ? Calculations.calcularBalanceMes(state.transactions)
      : { income: 0, expense: 0, netSavings: 0, savingsRate: 0, categoryExpenses: {} };

    const incomeEl = document.getElementById("dash-month-income");
    const expenseEl = document.getElementById("dash-month-expense");
    const rateEl = document.getElementById("dash-savings-rate");
    const savingsAmtEl = document.getElementById("dash-savings-amount");

    if (incomeEl) incomeEl.textContent = formatMoney(balanceData.income);
    if (expenseEl) expenseEl.textContent = formatMoney(balanceData.expense);
    if (rateEl) rateEl.textContent = `${balanceData.savingsRate}%`;
    if (savingsAmtEl) savingsAmtEl.textContent = `Ahorro neto: ${formatMoney(balanceData.netSavings)}`;

    // Alertas de Presupuestos
    let budgetAlertsCount = 0;
    const budgetListEl = document.getElementById("dash-budget-progress-list");
    if (budgetListEl) {
      budgetListEl.innerHTML = state.budgets.map((b) => {
        const ejecucion = Calculations
          ? Calculations.calcularEjecucionPresupuesto(b.spentAmount, b.limitAmount)
          : { percentage: 0, status: "optimal" };

        let colorClass = "bg-emerald-500";
        let textClass = "text-emerald-600 dark:text-emerald-400";
        let badgeLabel = "Óptimo";

        if (ejecucion.status === "exceeded") {
          colorClass = "bg-rose-600";
          textClass = "text-rose-600 dark:text-rose-400";
          badgeLabel = "Excedido";
          budgetAlertsCount++;
        } else if (ejecucion.status === "warning") {
          colorClass = "bg-amber-500";
          textClass = "text-amber-600 dark:text-amber-400";
          badgeLabel = "Alerta 80%";
          budgetAlertsCount++;
        }

        return `
          <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-slate-800 dark:text-slate-200 truncate">${b.category}</span>
              <span class="text-[10px] font-bold uppercase ${textClass}">${badgeLabel}</span>
            </div>
            <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full ${colorClass} transition-all duration-300" style="width: ${Math.min(ejecucion.percentage, 100)}%"></div>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>${formatMoney(b.spentAmount)}</span>
              <span class="font-medium">de ${formatMoney(b.limitAmount)} (${ejecucion.percentage}%)</span>
            </div>
          </div>
        `;
      }).join("");
    }

    const budgetBadge = document.getElementById("sidebar-budget-alert-badge");
    if (budgetBadge) {
      if (budgetAlertsCount > 0) {
        budgetBadge.textContent = budgetAlertsCount;
        budgetBadge.classList.remove("hidden");
      } else {
        budgetBadge.classList.add("hidden");
      }
    }

    // Distribución de Gastos por Categoría
    const catDistEl = document.getElementById("dash-category-distribution");
    if (catDistEl) {
      const sortedCats = Object.entries(balanceData.categoryExpenses).sort((a, b) => b[1] - a[1]);
      if (sortedCats.length === 0) {
        catDistEl.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Sin gastos registrados en el período.</p>`;
      } else {
        catDistEl.innerHTML = sortedCats.map(([catName, amount]) => {
          const pct = balanceData.expense > 0 ? Math.round((amount / balanceData.expense) * 100) : 0;
          return `
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-slate-700 dark:text-slate-300">${catName}</span>
                <span class="font-bold tabular-nums text-slate-900 dark:text-white">${formatMoney(amount)} <span class="text-[11px] font-normal text-slate-400">(${pct}%)</span></span>
              </div>
              <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
              </div>
            </div>
          `;
        }).join("");
      }
    }

    // Últimos Movimientos
    const recentTxEl = document.getElementById("dash-recent-transactions");
    if (recentTxEl) {
      const recent = state.transactions.slice(0, 5);
      recentTxEl.innerHTML = recent.map((tx) => {
        const isIncome = tx.type === "income";
        const isTransfer = tx.type === "transfer";
        const isSplit = Boolean(tx.isSplit && Array.isArray(tx.splitLines) && tx.splitLines.length > 0);
        
        const iconName = isSplit ? "split" : (isIncome ? "arrow-down-left" : isTransfer ? "arrow-left-right" : "arrow-up-right");
        const iconClass = isSplit ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400" : (isIncome ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400" : isTransfer ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400" : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400");
        const amountColor = isIncome ? "text-emerald-600 dark:text-emerald-400" : isTransfer ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400";
        const splitBadge = isSplit ? `<span class="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">Split (${tx.splitLines.length})</span>` : '';

        return `
          <div class="py-2.5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg ${iconClass} flex items-center justify-center">
                <i data-lucide="${iconName}" class="w-4 h-4"></i>
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-800 dark:text-slate-200">${tx.description} ${splitBadge}</p>
                <p class="text-[10px] text-slate-400">${formatDate(tx.date)} · ${tx.category}</p>
              </div>
            </div>
            <p class="text-xs font-bold tabular-nums ${amountColor}">
              ${isIncome ? '+' : isTransfer ? '↔' : '-'}${formatMoney(tx.amount)}
            </p>
          </div>
        `;
      }).join("");
    }
  }

  // ========================================================
  // RENDERIZADO 2: CUENTAS & BILLETERAS
  // ========================================================
  function renderAccounts() {
    const container = document.getElementById("accounts-grid");
    if (!container) return;

    const accounts = state.accounts;

    container.innerHTML = accounts.map((acc) => {
      const isCredit = acc.type === "credit_card";
      const balanceColor = isCredit 
        ? (acc.currentBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white")
        : (acc.currentBalance >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600 dark:text-rose-400");

      const typeLabels = {
        bank: "Cuenta Bancaria",
        cash: "Efectivo",
        wallet: "Billetera Digital",
        savings: "Ahorro / Inversión",
        credit_card: "Tarjeta de Crédito"
      };

      return `
        <div data-account-id="${acc.id}" class="account-card cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 hover:shadow-md shadow-sm flex flex-col justify-between space-y-4 transition-all duration-200 group" title="Haz clic para abrir la pantalla de movimientos de ${acc.name}">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style="background-color: ${acc.color || '#10b981'}">
              <i data-lucide="${acc.icon || 'wallet'}" class="w-5 h-5"></i>
            </div>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              ${typeLabels[acc.type] || acc.type}
            </span>
          </div>

          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <span>${acc.name}</span>
              <i data-lucide="arrow-right" class="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-1 group-hover:text-emerald-500 transition-all"></i>
            </h3>
            <p class="text-xs text-slate-400">${acc.currency || 'CLP'}</p>
            <div class="mt-2 flex items-baseline justify-between">
              <div>
                <span class="text-xs text-slate-500">${isCredit ? 'Saldo adeudado:' : 'Saldo disponible:'}</span>
                <p class="text-xl font-bold tabular-nums ${balanceColor}">${formatMoney(acc.currentBalance)}</p>
              </div>
              <span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Ver detalle →
              </span>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Al hacer clic en una tarjeta de cuenta, se abre en la pantalla adicional
    container.querySelectorAll(".account-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-account-id");
        openAccountDetail(id);
      });
    });

    safeRenderIcons();
  }

  // ========================================================
  // PANTALLA ADICIONAL: DETALLE DE CUENTA & MOVIMIENTOS (SPEC 009)
  // ========================================================
  function openAccountDetail(accountId) {
    state.selectedAccountId = accountId;
    if (!state.accountDetailFilter) {
      state.accountDetailFilter = { search: "", type: "all" };
    } else {
      state.accountDetailFilter.search = "";
      state.accountDetailFilter.type = "all";
    }
    switchView("account-detail");
  }

  function renderAccountDetailView() {
    const container = document.getElementById("view-account-detail");
    if (!container) return;

    if (!state.selectedAccountId) {
      switchView("accounts");
      return;
    }

    const account = state.accounts.find((a) => a.id === state.selectedAccountId);
    if (!account) {
      switchView("accounts");
      return;
    }

    const isCredit = account.type === "credit_card";
    const balanceColor = isCredit 
      ? (account.currentBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white")
      : (account.currentBalance >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600 dark:text-rose-400");

    const typeLabels = {
      bank: "Cuenta Bancaria",
      cash: "Efectivo",
      wallet: "Billetera Digital",
      savings: "Ahorro / Inversión",
      credit_card: "Tarjeta de Crédito"
    };

    // Obtener todos los movimientos asociados a esta cuenta
    const allAccountMovements = Calculations && Calculations.obtenerMovimientosDeCuenta
      ? Calculations.obtenerMovimientosDeCuenta(state.transactions, account.id)
      : [];

    const resumen = Calculations && Calculations.calcularResumenCuenta
      ? Calculations.calcularResumenCuenta(state.transactions, account.id)
      : { totalAbonos: 0, totalCargos: 0, neto: 0, cantidadMovimientos: 0 };

    // Filtros internos de la pantalla
    const searchVal = (state.accountDetailFilter?.search || "").toLowerCase().trim();
    const typeVal = state.accountDetailFilter?.type || "all";

    const filteredMovements = allAccountMovements.filter((tx) => {
      if (typeVal !== "all" && tx.type !== typeVal) return false;
      if (searchVal) {
        const matchDesc = (tx.description || "").toLowerCase().includes(searchVal);
        const matchCat = (tx.category || "").toLowerCase().includes(searchVal);
        if (!matchDesc && !matchCat) return false;
      }
      return true;
    });

    let tableContent = "";
    if (filteredMovements.length === 0) {
      tableContent = `
        <div class="py-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <i data-lucide="receipt" class="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto"></i>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">
            ${allAccountMovements.length === 0 ? 'Esta cuenta no registra movimientos todavía.' : 'No hay movimientos que coincidan con los filtros aplicados.'}
          </p>
          <p class="text-xs text-slate-400">
            ${allAccountMovements.length === 0 ? 'Registra un primer movimiento para comenzar a visualizar su historial.' : 'Prueba cambiando el tipo o limpiando el texto de búsqueda.'}
          </p>
          <button type="button" id="btn-screen-empty-tx" class="mt-2 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all inline-flex items-center gap-1.5">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Registrar Movimiento en ${account.name}</span>
          </button>
        </div>
      `;
    } else {
      tableContent = `
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="py-3 px-4 whitespace-nowrap">Fecha</th>
                  <th class="py-3 px-4 whitespace-nowrap">Tipo</th>
                  <th class="py-3 px-4">Concepto / Detalle</th>
                  <th class="py-3 px-4 whitespace-nowrap">Categoría</th>
                  <th class="py-3 px-4 text-right whitespace-nowrap">Monto</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                ${filteredMovements.map((tx) => {
                  const isSplit = Boolean(tx.isSplit && Array.isArray(tx.splitLines) && tx.splitLines.length > 0);
                  
                  let isAbono = false;
                  let displayAmount = tx.amount;
                  let relLabel = "";

                  if (isSplit) {
                    if (tx.accountId === account.id) {
                      isAbono = false;
                      displayAmount = tx.amount;
                      relLabel = "Cargo Pago Global (Split)";
                    } else {
                      const myLine = tx.splitLines.find(l => l.targetAccountId === account.id);
                      if (myLine) {
                        isAbono = true;
                        displayAmount = myLine.amount;
                        relLabel = "Partida recibida en esta cuenta";
                      }
                    }
                  } else if (tx.type === "income") {
                    isAbono = true;
                  } else if (tx.type === "expense") {
                    isAbono = false;
                  } else if (tx.type === "transfer") {
                    isAbono = tx.toAccountId === account.id;
                    relLabel = isAbono ? "Transferencia Recibida (+)" : "Transferencia Enviada (-)";
                  }

                  const typeBadgeClass = isSplit
                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300"
                    : (tx.type === "income" 
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300" 
                      : (tx.type === "transfer" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"));

                  const splitDetailsHtml = isSplit ? `
                    <div class="mt-2 space-y-1 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p class="font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wider">Desglose de Partidas (${tx.splitLines.length}):</p>
                      ${tx.splitLines.map(l => {
                        const isThisAcc = l.targetAccountId === account.id;
                        return `
                          <div class="flex items-center justify-between text-slate-600 dark:text-slate-300 ${isThisAcc ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}">
                            <span>• ${l.description || 'Partida'} ${isThisAcc ? '⭐ (Asignado a esta cuenta)' : ''}</span>
                            <span class="tabular-nums font-semibold">${formatMoney(l.amount)}</span>
                          </div>
                        `;
                      }).join("")}
                    </div>
                  ` : "";

                  return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td class="py-3 px-4 text-slate-500 whitespace-nowrap">${formatDate(tx.date)}</td>
                      <td class="py-3 px-4 whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${typeBadgeClass}">
                          ${isSplit ? 'Split' : (tx.type === 'income' ? 'Ingreso' : tx.type === 'transfer' ? 'Transfer' : 'Gasto')}
                        </span>
                      </td>
                      <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        <div>${tx.description}</div>
                        ${relLabel ? `<span class="text-[10px] font-normal text-slate-400">${relLabel}</span>` : ''}
                        ${splitDetailsHtml}
                      </td>
                      <td class="py-3 px-4 text-slate-500 whitespace-nowrap">${tx.category}</td>
                      <td class="py-3 px-4 text-right font-bold tabular-nums ${isAbono ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} whitespace-nowrap text-sm">
                        ${isAbono ? '+' : '-'}${formatMoney(displayAmount)}
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- Barra Superior: Botón Volver y Acción Rápida -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button type="button" id="btn-back-to-accounts" class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start active:scale-95">
          <i data-lucide="arrow-left" class="w-4 h-4 text-slate-500"></i>
          <span>Volver a Cuentas & Billeteras</span>
        </button>

        <button type="button" id="btn-account-screen-new-tx" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all self-start sm:self-auto active:scale-95">
          <i data-lucide="plus" class="w-4 h-4"></i>
          <span>Nuevo Movimiento en esta Cuenta</span>
        </button>
      </div>

      <!-- Ficha de Cabecera de la Cuenta -->
      <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0" style="background-color: ${account.color || '#10b981'}">
            <i data-lucide="${account.icon || 'wallet'}" class="w-7 h-7"></i>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-xl font-bold text-slate-900 dark:text-white">${account.name}</h2>
              <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                ${typeLabels[account.type] || account.type}
              </span>
              <span class="text-[11px] font-semibold text-slate-400">
                ${account.currency || 'CLP'}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pantalla de consulta de balance, abonos, cargos y movimientos asociados
            </p>
          </div>
        </div>

        <div class="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
          <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">
            ${isCredit ? 'Saldo Adeudado Actual' : 'Saldo Disponible Contable'}
          </span>
          <p class="text-2xl md:text-3xl font-extrabold tabular-nums ${balanceColor}">
            ${formatMoney(account.currentBalance)}
          </p>
        </div>
      </div>

      <!-- Tarjetas KPI Acumuladas -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Abonos / Entradas</span>
            <div class="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <i data-lucide="arrow-down-left" class="w-4 h-4"></i>
            </div>
          </div>
          <p class="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +${formatMoney(resumen.totalAbonos)}
          </p>
          <p class="text-[10px] text-slate-400">Ingresos directos y transferencias recibidas</p>
        </div>

        <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Cargos / Salidas</span>
            <div class="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <i data-lucide="arrow-up-right" class="w-4 h-4"></i>
            </div>
          </div>
          <p class="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            -${formatMoney(resumen.totalCargos)}
          </p>
          <p class="text-[10px] text-slate-400">Gastos pagados y transferencias enviadas</p>
        </div>

        <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Historial Registrado</span>
            <div class="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <i data-lucide="file-text" class="w-4 h-4"></i>
            </div>
          </div>
          <p class="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            ${resumen.cantidadMovimientos}
          </p>
          <p class="text-[10px] text-slate-400">Movimientos totales asociados a esta cuenta</p>
        </div>
      </div>

      <!-- Barra de Filtros Interna de la Cuenta -->
      <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div class="relative flex-1">
          <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="account-detail-search" value="${state.accountDetailFilter?.search || ''}" placeholder="Buscar en movimientos de ${account.name}..." class="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
        </div>

        <div class="flex items-center gap-2">
          <select id="account-detail-type" class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="all" ${typeVal === 'all' ? 'selected' : ''}>Todos los tipos</option>
            <option value="expense" ${typeVal === 'expense' ? 'selected' : ''}>Gastos (-)</option>
            <option value="income" ${typeVal === 'income' ? 'selected' : ''}>Ingresos (+)</option>
            <option value="transfer" ${typeVal === 'transfer' ? 'selected' : ''}>Transferencias (↔)</option>
          </select>
        </div>
      </div>

      <!-- Tabla de Movimientos de la Cuenta -->
      ${tableContent}
    `;

    // Vincular botón Volver a Cuentas
    document.getElementById("btn-back-to-accounts")?.addEventListener("click", () => {
      switchView("accounts");
    });

    // Vincular búsqueda y tipo en la pantalla de la cuenta
    document.getElementById("account-detail-search")?.addEventListener("input", (e) => {
      if (!state.accountDetailFilter) state.accountDetailFilter = {};
      state.accountDetailFilter.search = e.target.value;
      renderAccountDetailView();
    });

    document.getElementById("account-detail-type")?.addEventListener("change", (e) => {
      if (!state.accountDetailFilter) state.accountDetailFilter = {};
      state.accountDetailFilter.type = e.target.value;
      renderAccountDetailView();
    });

    // Vincular botones para crear nuevo movimiento en esta cuenta
    const setupNewTxBtn = (btnId) => {
      document.getElementById(btnId)?.addEventListener("click", () => {
        openTransactionModal("expense");
        setTimeout(() => {
          const sel = document.getElementById("tx-input-account");
          if (sel) sel.value = account.id;
        }, 50);
      });
    };
    setupNewTxBtn("btn-account-screen-new-tx");
    setupNewTxBtn("btn-screen-empty-tx");

    safeRenderIcons();
  }

  // ========================================================
  // RENDERIZADO: PLAN DE CUENTAS PERSONAL (CRUD) - SPEC 011
  // ========================================================
  function renderChartOfAccounts() {
    const container = document.getElementById("view-chart-of-accounts");
    if (!container) return;

    const fullCatalog = Calculations && Calculations.obtenerCatalogoPlanCuentas
      ? Calculations.obtenerCatalogoPlanCuentas(state.planAccounts, state.accounts, state.transactions)
      : [];

    const metrics = Calculations && Calculations.calcularResumenPlanCuentas
      ? Calculations.calcularResumenPlanCuentas(fullCatalog)
      : { totalAssets: 0, totalLiabilities: 0, netWorth: 0, totalIncome: 0, totalExpenses: 0, netResult: 0 };

    const search = (state.chartOfAccountsFilter.search || "").toLowerCase().trim();
    const groupFilter = state.chartOfAccountsFilter.group || "all";

    const filterAcc = (acc) => {
      if (groupFilter !== "all" && String(acc.classNumber) !== String(groupFilter)) return false;
      if (!search) return true;
      const matchName = (acc.name || "").toLowerCase().includes(search);
      const matchCode = (acc.code || "").toLowerCase().includes(search);
      const matchGroup = (acc.groupName || "").toLowerCase().includes(search);
      return matchName || matchCode || matchGroup;
    };

    const filteredCatalog = fullCatalog.filter(filterAcc);

    const CLASSES_CONFIG = {
      1: {
        name: "CLASE 1: ACTIVOS",
        subtitle: "Disponible, Cuentas Bancarias, Billeteras, Ahorro e Inversiones y Bienes Personales",
        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
        borderClass: "border-emerald-500/30",
        total: metrics.totalAssets,
        totalLabel: "Total Activos"
      },
      2: {
        name: "CLASE 2: PASIVOS",
        subtitle: "Tarjetas de Crédito, Sobregiros y Obligaciones Financieras",
        badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
        borderClass: "border-rose-500/30",
        total: metrics.totalLiabilities,
        totalLabel: "Total Pasivos"
      },
      3: {
        name: "CLASE 3: PATRIMONIO NETO",
        subtitle: "Capital Inicial, Fondos Propios y Resultados Históricos Acumulados",
        badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
        borderClass: "border-indigo-500/30",
        total: metrics.netWorth,
        totalLabel: "Patrimonio Neto"
      },
      4: {
        name: "CLASE 4: INGRESOS",
        subtitle: "Ingresos Laborales, Honorarios, Rendimientos de Capital y Otros Ingresos",
        badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
        borderClass: "border-teal-500/30",
        total: metrics.totalIncome,
        totalLabel: "Total Ingresos Acumulados"
      },
      5: {
        name: "CLASE 5: GASTOS",
        subtitle: "Vivienda, Alimentación, Transporte, Salud, Educación, Ocio y Financieros",
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
        borderClass: "border-amber-500/30",
        total: metrics.totalExpenses,
        totalLabel: "Total Gastos Acumulados"
      }
    };

    const renderAccountRow = (acc) => {
      const isBalanceClass = [1, 2, 3].includes(acc.classNumber);
      const displayAmount = isBalanceClass ? formatMoney(acc.balance) : formatMoney(acc.periodMovement);
      const amountColor = [1, 4].includes(acc.classNumber)
        ? "text-emerald-600 dark:text-emerald-400 font-bold"
        : [2, 5].includes(acc.classNumber)
          ? "text-rose-600 dark:text-rose-400 font-bold"
          : "text-slate-900 dark:text-white font-bold";

      const isSub = Boolean(acc.isSubaccount || acc.parentCode || (acc.code && acc.code.split('.').length > 3));
      const canHaveSubaccounts = Boolean(acc.isSystem || !acc.parentCode || (acc.code && acc.code.split('.').length <= 3));

      return `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0 ${isSub ? 'bg-slate-50/40 dark:bg-slate-900/40' : ''}">
          <td class="px-4 py-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-200 w-32 ${isSub ? 'pl-8' : ''}">
            ${isSub ? '<span class="text-indigo-400 font-bold mr-1">↳</span>' : ''}${escapeHtml(acc.code)}
          </td>
          <td class="px-4 py-3 ${isSub ? 'pl-8' : ''}">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSub ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">
                <i data-lucide="${acc.icon || (isSub ? 'corner-down-right' : 'file-text')}" class="w-3.5 h-3.5"></i>
              </div>
              <div class="min-w-0">
                <span class="font-semibold text-slate-800 dark:text-slate-100 block truncate">${escapeHtml(acc.name)}</span>
                <div class="flex items-center gap-1.5 mt-0.5">
                  ${isSub 
                    ? `<span class="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">Subcuenta ${acc.parentCode ? `de ${acc.parentCode}` : ''}</span>`
                    : (acc.isSystem ? '<span class="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Cuenta Base</span>' : (acc.financialAccountId ? '<span class="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">Billetera / Banco</span>' : '<span class="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">Personalizada</span>'))}
                </div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
            ${escapeHtml(acc.groupName || "—")}
          </td>
          <td class="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 w-28">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${acc.nature === 'debit' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'}">
              ${acc.nature === 'debit' ? 'Deudora (+)' : 'Acreedora (-)'}
            </span>
          </td>
          <td class="px-4 py-3 text-right text-xs font-mono tabular-nums ${amountColor} w-36">
            ${displayAmount}
          </td>
          <td class="px-4 py-3 text-right w-28">
            <div class="flex items-center justify-end gap-1">
              ${canHaveSubaccounts ? `
                <button data-parent-code="${acc.code}" class="btn-add-subaccount p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors" title="Crear Subcuenta para ${acc.code} (${escapeHtml(acc.name)})">
                  <i data-lucide="plus-circle" class="w-4 h-4"></i>
                </button>
              ` : ''}
              <button data-plan-id="${acc.id}" class="btn-edit-plan-account p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors" title="Editar Cuenta Contable">
                <i data-lucide="pencil" class="w-4 h-4"></i>
              </button>
              ${!acc.isSystem && !acc.financialAccountId ? `
                <button data-plan-id="${acc.id}" class="btn-delete-plan-account p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors" title="Eliminar Cuenta Contable">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    };

    // Agrupación por clases a renderizar
    const classesToRender = groupFilter === "all" ? [1, 2, 3, 4, 5] : [Number(groupFilter)];

    container.innerHTML = `
      <!-- Toolbar y KPIs Contables del Plan de Cuentas Personal -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <!-- KPI 1: Activos -->
        <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">1. Activos</span>
            <div class="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <i data-lucide="trending-up" class="w-3.5 h-3.5"></i>
            </div>
          </div>
          <p class="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-2">${formatMoney(metrics.totalAssets)}</p>
        </div>

        <!-- KPI 2: Pasivos -->
        <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">2. Pasivos</span>
            <div class="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <i data-lucide="credit-card" class="w-3.5 h-3.5"></i>
            </div>
          </div>
          <p class="text-base font-bold text-rose-600 dark:text-rose-400 font-mono mt-2">${formatMoney(metrics.totalLiabilities)}</p>
        </div>

        <!-- KPI 3: Patrimonio Neto -->
        <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">3. Patrimonio</span>
            <div class="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <i data-lucide="shield" class="w-3.5 h-3.5"></i>
            </div>
          </div>
          <p class="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-2">${formatMoney(metrics.netWorth)}</p>
        </div>

        <!-- KPI 4: Ingresos -->
        <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">4. Ingresos</span>
            <div class="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <i data-lucide="arrow-down-left" class="w-3.5 h-3.5"></i>
            </div>
          </div>
          <p class="text-base font-bold text-teal-600 dark:text-teal-400 font-mono mt-2">${formatMoney(metrics.totalIncome)}</p>
        </div>

        <!-- KPI 5: Gastos -->
        <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">5. Gastos</span>
            <div class="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
            </div>
          </div>
          <p class="text-base font-bold text-amber-600 dark:text-amber-400 font-mono mt-2">${formatMoney(metrics.totalExpenses)}</p>
        </div>

        <!-- KPI 6: Resultado Neto -->
        <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Resultado Neto</span>
            <div class="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <i data-lucide="award" class="w-3.5 h-3.5"></i>
            </div>
          </div>
          <p class="text-base font-bold font-mono mt-2 ${metrics.netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${formatMoney(metrics.netResult)}</p>
        </div>
      </div>

      <!-- Barra de Filtros, Pestañas y Botones de Creación -->
      <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div class="flex flex-1 flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <!-- Buscador -->
          <div class="relative flex-1">
            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" id="chart-search-input" value="${escapeHtml(state.chartOfAccountsFilter.search || '')}" placeholder="Buscar por código, nombre o rubro contable..." class="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>

          <!-- Selector de Clase Contable -->
          <select id="chart-group-filter-select" class="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="all" ${groupFilter === "all" ? "selected" : ""}>Todas las Clases (1 a 5) · ${fullCatalog.length} cuentas</option>
            <option value="1" ${groupFilter === "1" ? "selected" : ""}>1. Activos (${fullCatalog.filter(c => c.classNumber === 1).length})</option>
            <option value="2" ${groupFilter === "2" ? "selected" : ""}>2. Pasivos (${fullCatalog.filter(c => c.classNumber === 2).length})</option>
            <option value="3" ${groupFilter === "3" ? "selected" : ""}>3. Patrimonio Neto (${fullCatalog.filter(c => c.classNumber === 3).length})</option>
            <option value="4" ${groupFilter === "4" ? "selected" : ""}>4. Ingresos (${fullCatalog.filter(c => c.classNumber === 4).length})</option>
            <option value="5" ${groupFilter === "5" ? "selected" : ""}>5. Gastos (${fullCatalog.filter(c => c.classNumber === 5).length})</option>
          </select>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button id="btn-chart-new-plan-account" class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all whitespace-nowrap active:scale-95">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Nueva Cuenta Contable</span>
          </button>
          <button id="btn-chart-new-account" class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 shadow-sm transition-all whitespace-nowrap" title="Añadir Banco, Billetera o Tarjeta">
            <i data-lucide="landmark" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
            <span>Nueva Cuenta Tesorería</span>
          </button>
        </div>
      </div>

      <!-- Tablas agrupadas por Clase Contable -->
      <div class="space-y-6">
        ${classesToRender.map(clsNum => {
          const cfg = CLASSES_CONFIG[clsNum];
          const classAccounts = filteredCatalog.filter(c => c.classNumber === clsNum);
          if (classAccounts.length === 0 && search) return '';

          return `
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div class="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${cfg.badgeClass} font-mono text-[11px] font-bold">${clsNum}</span>
                  <div>
                    <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100">${cfg.name}</h3>
                    <p class="text-[11px] text-slate-400">${cfg.subtitle}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 self-end sm:self-auto">
                  <span class="text-xs font-mono font-bold ${[1, 4].includes(clsNum) ? 'text-emerald-600 dark:text-emerald-400' : [2, 5].includes(clsNum) ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}">
                    Subtotal: ${formatMoney(cfg.total)}
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono">(${classAccounts.length} cuentas)</span>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                      <th class="px-4 py-2.5 w-28">Código</th>
                      <th class="px-4 py-2.5">Cuenta Contable</th>
                      <th class="px-4 py-2.5">Rubro / Subgrupo</th>
                      <th class="px-4 py-2.5 w-28">Naturaleza</th>
                      <th class="px-4 py-2.5 text-right w-36">${[1, 2, 3].includes(clsNum) ? 'Saldo Contable' : 'Movimiento Acum.'}</th>
                      <th class="px-4 py-2.5 text-right w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${classAccounts.length > 0
                      ? classAccounts.map(acc => renderAccountRow(acc)).join("")
                      : `<tr><td colspan="6" class="px-4 py-6 text-center text-slate-400 text-xs">No hay cuentas en esta clase que coincidan con la búsqueda.</td></tr>`}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    safeRenderIcons();

    // Eventos de Toolbar
    document.getElementById("btn-chart-new-plan-account")?.addEventListener("click", () => {
      openPlanAccountModal();
    });

    document.getElementById("btn-chart-new-account")?.addEventListener("click", () => {
      openAccountModal();
    });

    const searchInput = document.getElementById("chart-search-input");
    searchInput?.addEventListener("input", (e) => {
      state.chartOfAccountsFilter.search = e.target.value;
      renderChartOfAccounts();
      const el = document.getElementById("chart-search-input");
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });

    const groupSelect = document.getElementById("chart-group-filter-select");
    groupSelect?.addEventListener("change", (e) => {
      state.chartOfAccountsFilter.group = e.target.value;
      renderChartOfAccounts();
    });

    // Eventos de botones Añadir Subcuenta (Spec 013)
    container.querySelectorAll(".btn-add-subaccount").forEach((btn) => {
      btn.addEventListener("click", () => {
        const parentCode = btn.getAttribute("data-parent-code");
        if (parentCode) {
          openPlanAccountModal(null, parentCode);
        }
      });
    });

    // Eventos de botones Editar
    container.querySelectorAll(".btn-edit-plan-account").forEach((btn) => {
      btn.addEventListener("click", () => {
        const planId = btn.getAttribute("data-plan-id");
        if (!planId) return;

        const target = fullCatalog.find(c => c.id === planId);
        if (target && target.financialAccountId) {
          openAccountEditModal(target.financialAccountId);
        } else {
          openPlanAccountModal(planId);
        }
      });
    });

    // Eventos de botones Eliminar
    container.querySelectorAll(".btn-delete-plan-account").forEach((btn) => {
      btn.addEventListener("click", () => {
        const planId = btn.getAttribute("data-plan-id");
        if (!planId) return;

        const target = fullCatalog.find(c => c.id === planId);
        if (!target) return;

        const check = Calculations && Calculations.puedeEliminarCuentaPlan
          ? Calculations.puedeEliminarCuentaPlan(target)
          : { puede: false, motivo: "Validación no disponible." };

        if (!check.puede) {
          showToast(`No se puede eliminar la cuenta: ${check.motivo}`, "error");
          return;
        }

        const confirmacion = window.confirm(`¿Estás seguro de que deseas eliminar la cuenta "${target.code} - ${target.name}" del catálogo?`);
        if (!confirmacion) return;

        state.planAccounts = state.planAccounts.filter(p => p.id !== planId && p.code !== target.code);
        if (Storage && Storage.savePlanAccounts) {
          Storage.savePlanAccounts(state.planAccounts);
        }

        renderActiveView();
        showToast(`Cuenta "${target.name}" eliminada del catálogo.`, "success");
      });
    });
  }

  // ========================================================
  // RENDERIZADO 3: TRANSACCIONES
  // ========================================================
  function renderTransactions() {
    const tbody = document.getElementById("transactions-table-body");
    if (!tbody) return;

    // Actualizar selector de cuentas en filtros
    const accountFilterEl = document.getElementById("tx-account-filter");
    if (accountFilterEl) {
      const currentVal = state.filters.txAccount || "all";
      const opts = ['<option value="all">Todas las cuentas</option>'];
      (state.accounts || []).forEach(acc => {
        opts.push(`<option value="${acc.id}" ${currentVal === acc.id ? 'selected' : ''}>${acc.name}</option>`);
      });
      accountFilterEl.innerHTML = opts.join("");
    }

    // Actualizar selector de categorías en filtros (Spec 012)
    const categoryFilterEl = document.getElementById("tx-category-filter");
    if (categoryFilterEl) {
      const currentVal = state.filters.txCategory || "all";
      const catalog = getPlanCatalog();
      const planCats = Calculations && Calculations.obtenerCategoriasDesdePlan
        ? Calculations.obtenerCategoriasDesdePlan(catalog, "all")
        : [];
      
      const categoryMap = new Map(); // name -> code
      planCats.forEach(c => categoryMap.set(c.name, c.code));

      (state.transactions || []).forEach(tx => {
        if (tx.category && !categoryMap.has(tx.category)) {
          categoryMap.set(tx.category, tx.categoryCode || "");
        }
        if (Array.isArray(tx.splitLines)) {
          tx.splitLines.forEach(l => {
            if (l.category && !categoryMap.has(l.category)) {
              categoryMap.set(l.category, l.categoryCode || "");
            }
          });
        }
      });

      const opts = ['<option value="all">Todas las categorías</option>'];
      Array.from(categoryMap.entries())
        .sort((a, b) => {
          if (a[1] && b[1]) return a[1].localeCompare(b[1]);
          return a[0].localeCompare(b[0]);
        })
        .forEach(([catName, catCode]) => {
          const label = catCode ? `${catCode} · ${catName}` : catName;
          opts.push(`<option value="${catName}" ${currentVal === catName ? 'selected' : ''}>${label}</option>`);
        });
      categoryFilterEl.innerHTML = opts.join("");
    }

    const filtered = Calculations && Calculations.filtrarTransacciones
      ? Calculations.filtrarTransacciones(state.transactions, state.filters)
      : state.transactions;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">No hay movimientos que coincidan con los filtros aplicados.</td></tr>`;
      return;
    }

    const catalog = getPlanCatalog();

    tbody.innerHTML = filtered.map((tx) => {
      const isIncome = tx.type === "income";
      const isTransfer = tx.type === "transfer";
      const isSplit = Boolean(tx.isSplit && Array.isArray(tx.splitLines) && tx.splitLines.length > 0);
      const typeLabel = isSplit ? "Split" : (isIncome ? "Ingreso" : isTransfer ? "Transferencia" : "Gasto");
      const typeBadge = isSplit
        ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300"
        : (isIncome 
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
          : isTransfer ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300");

      const account = state.accounts.find(a => a.id === tx.accountId);
      const accountName = account ? account.name : "Cuenta";

      // Resolver código contable para mostrar badge elegante
      let displayCode = tx.categoryCode;
      if (!displayCode && !isSplit && !isTransfer && tx.category && Calculations && Calculations.resolverCategoriaPlan) {
        const resolved = Calculations.resolverCategoriaPlan(tx.category, catalog);
        if (resolved) displayCode = resolved.code;
      }

      const splitDetailsHtml = isSplit ? `
        <div class="mt-2 space-y-1 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
          <p class="font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wider mb-1">Desglose de Partidas (${tx.splitLines.length}):</p>
          ${tx.splitLines.map(l => {
            const destAcc = l.targetAccountId ? state.accounts.find(a => a.id === l.targetAccountId) : null;
            let lineCatCode = l.categoryCode;
            if (!lineCatCode && l.category && !destAcc && Calculations && Calculations.resolverCategoriaPlan) {
              const res = Calculations.resolverCategoriaPlan(l.category, catalog);
              if (res) lineCatCode = res.code;
            }
            const catBadge = lineCatCode ? `[${lineCatCode}] ${l.category}` : l.category;
            const destLabel = destAcc ? `→ Cuenta: ${destAcc.name}` : `(${catBadge})`;
            return `
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>• <strong class="text-slate-700 dark:text-slate-200">${l.description || 'Partida'}</strong> <span class="text-slate-400 font-normal">${destLabel}</span></span>
                <span class="font-bold tabular-nums">${formatMoney(l.amount)}</span>
              </div>
            `;
          }).join("")}
        </div>
      ` : '';

      const categoryCellHtml = isTransfer ? `
        <span class="text-slate-400 dark:text-slate-500 italic text-xs">Transferencia</span>
      ` : isSplit ? `
        <div class="flex flex-col">
          <span class="font-medium text-slate-700 dark:text-slate-200">${tx.category}</span>
          <span class="text-[10px] text-indigo-500 font-mono font-semibold">Desglose múltiple</span>
        </div>
      ` : `
        <div class="flex flex-col">
          <span class="font-medium text-slate-700 dark:text-slate-200">${tx.category}</span>
          ${displayCode ? `<span class="text-[10px] text-slate-400 font-mono font-semibold">${displayCode}</span>` : ''}
        </div>
      `;

      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <td class="py-3 px-4 text-slate-500 whitespace-nowrap">${formatDate(tx.date)}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${typeBadge}">
              ${typeLabel}
            </span>
          </td>
          <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
            <div>${tx.description}</div>
            ${splitDetailsHtml}
          </td>
          <td class="py-3 px-4">${categoryCellHtml}</td>
          <td class="py-3 px-4 text-slate-500">${accountName}</td>
          <td class="py-3 px-4 text-right font-bold tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : isTransfer ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}">
            ${isIncome ? '+' : isTransfer ? '↔' : '-'}${formatMoney(tx.amount)}
          </td>
        </tr>
      `;
    }).join("");
  }

  // ========================================================
  // RENDERIZADO 4: PRESUPUESTOS & METAS
  // ========================================================
  function renderBudgets() {
    const budgetsContainer = document.getElementById("budgets-grid");
    if (budgetsContainer) {
      // Sincronizar dinámicamente con transacciones reales del mes
      if (Calculations && Calculations.sincronizarPresupuestosConTransacciones) {
        state.budgets = Calculations.sincronizarPresupuestosConTransacciones(state.budgets, state.transactions);
        if (Storage) Storage.saveBudgets(state.budgets);
      }

      if (state.budgets.length === 0) {
        budgetsContainer.innerHTML = `
          <div class="col-span-full py-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <i data-lucide="piggy-bank" class="w-8 h-8 text-slate-400 mx-auto"></i>
            <p class="text-xs">No tienes presupuestos mensuales definidos.</p>
            <button type="button" id="btn-empty-new-budget" class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
              Crear tu primer presupuesto
            </button>
          </div>
        `;
        document.getElementById("btn-empty-new-budget")?.addEventListener("click", () => openBudgetModal());
        safeRenderIcons();
      } else {
        budgetsContainer.innerHTML = state.budgets.map((b) => {
          const ejecucion = Calculations
            ? Calculations.calcularEjecucionPresupuesto(b.spentAmount, b.limitAmount)
            : { percentage: 0, status: "optimal" };

          let colorClass = "bg-emerald-500";
          let statusText = "🟢 Dentro del presupuesto";

          if (ejecucion.status === "exceeded") {
            colorClass = "bg-rose-600";
            statusText = "🔴 Presupuesto Excedido";
          } else if (ejecucion.status === "warning") {
            colorClass = "bg-amber-500";
            statusText = "🟡 En Advertencia (>75%)";
          }

          const limit = Number(b.limitAmount) || 0;
          const spent = Number(b.spentAmount) || 0;
          const restante = limit - spent;

          return `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white">${b.category}</h3>
                    <p class="text-[10px] text-slate-400">${b.month || 'Período actual'}</p>
                  </div>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${ejecucion.status === 'exceeded' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300' : ejecucion.status === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'} font-bold tabular-nums">
                    ${ejecucion.percentage}%
                  </span>
                </div>

                <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full ${colorClass} rounded-full transition-all duration-300" style="width: ${Math.min(ejecucion.percentage, 100)}%"></div>
                </div>

                <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Gastado: <strong class="text-slate-800 dark:text-slate-200">${formatMoney(b.spentAmount)}</strong></span>
                  <span>Límite: ${formatMoney(b.limitAmount)}</span>
                </div>

                <div class="text-[11px] pt-1">
                  ${restante >= 0 
                    ? `<span class="text-emerald-600 dark:text-emerald-400 font-semibold">Disponible: ${formatMoney(restante)}</span>` 
                    : `<span class="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i> Sobregiro: ${formatMoney(Math.abs(restante))}</span>`}
                </div>
              </div>

              <div class="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span class="text-[11px] font-medium text-slate-500">${statusText}</span>
                <div class="flex items-center gap-1.5">
                  <button type="button" class="btn-edit-budget p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" data-budget-id="${b.id}" title="Editar límite">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                  </button>
                  <button type="button" class="btn-delete-budget p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors" data-budget-id="${b.id}" title="Eliminar presupuesto">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join("");

        safeRenderIcons();

        // Enlazar botones de edición
        budgetsContainer.querySelectorAll(".btn-edit-budget").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-budget-id");
            openBudgetModal(id);
          });
        });

        // Enlazar botones de eliminación
        budgetsContainer.querySelectorAll(".btn-delete-budget").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-budget-id");
            const targetBudget = state.budgets.find(b => b.id === id);
            const catName = targetBudget ? targetBudget.category : "este presupuesto";
            if (confirm(`¿Estás seguro de eliminar el presupuesto para "${catName}"?`)) {
              state.budgets = state.budgets.filter(b => b.id !== id);
              if (Storage) Storage.saveBudgets(state.budgets);
              renderActiveView();
              showToast("Presupuesto eliminado con éxito.", "info");
            }
          });
        });
      }
    }

    const goalsContainer = document.getElementById("goals-grid");
    if (goalsContainer) {
      if (state.goals.length === 0) {
        goalsContainer.innerHTML = `
          <div class="col-span-full py-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <i data-lucide="target" class="w-8 h-8 text-slate-400 mx-auto"></i>
            <p class="text-xs">No tienes metas de ahorro definidas todavía.</p>
            <button type="button" id="btn-empty-new-goal" class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Crear tu primera meta
            </button>
          </div>
        `;
        document.getElementById("btn-empty-new-goal")?.addEventListener("click", () => openGoalModal());
        safeRenderIcons();
      } else {
        goalsContainer.innerHTML = state.goals.map((g) => {
          const progreso = Calculations
            ? Calculations.calcularProgresoMeta(g.currentAmount, g.targetAmount)
            : { percentage: 0, remainingAmount: g.targetAmount, isCompleted: false };

          const barColor = g.color || '#2563eb';

          return `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${barColor}"></span>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white">${g.title}</h3>
                  </div>
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full ${progreso.isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'} tabular-nums">
                    ${progreso.percentage}%
                  </span>
                </div>

                <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-300" style="width: ${Math.min(progreso.percentage, 100)}%; background-color: ${barColor}"></div>
                </div>

                <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Ahorrado: <strong class="text-slate-800 dark:text-slate-200">${formatMoney(g.currentAmount)}</strong></span>
                  <span>Meta: ${formatMoney(g.targetAmount)}</span>
                </div>

                <div class="text-[11px] pt-1">
                  ${progreso.isCompleted 
                    ? `<span class="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">🏆 ¡Meta Cumplida con éxito!</span>` 
                    : `<span class="text-slate-500 dark:text-slate-400">Faltan: <strong class="text-slate-700 dark:text-slate-300">${formatMoney(progreso.remainingAmount)}</strong></span>`}
                </div>

                ${g.deadlineDate ? `<p class="text-[10px] text-slate-400">Fecha objetivo: ${formatDate(g.deadlineDate)}</p>` : ''}
              </div>

              <div class="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button type="button" class="btn-contribute-goal px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors flex items-center gap-1" data-goal-id="${g.id}">
                  <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                  <span>Aportar</span>
                </button>
                <div class="flex items-center gap-1.5">
                  <button type="button" class="btn-edit-goal p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" data-goal-id="${g.id}" title="Editar meta">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                  </button>
                  <button type="button" class="btn-delete-goal p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors" data-goal-id="${g.id}" title="Eliminar meta">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join("");

        safeRenderIcons();

        // Enlazar botones de aporte
        goalsContainer.querySelectorAll(".btn-contribute-goal").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-goal-id");
            openContributeGoalModal(id);
          });
        });

        // Enlazar botones de edición
        goalsContainer.querySelectorAll(".btn-edit-goal").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-goal-id");
            openGoalModal(id);
          });
        });

        // Enlazar botones de eliminación
        goalsContainer.querySelectorAll(".btn-delete-goal").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-goal-id");
            const targetGoal = state.goals.find(g => g.id === id);
            const title = targetGoal ? targetGoal.title : "esta meta";
            if (confirm(`¿Estás seguro de eliminar la meta de ahorro "${title}"?`)) {
              state.goals = state.goals.filter(g => g.id !== id);
              if (Storage) Storage.saveGoals(state.goals);
              renderActiveView();
              showToast("Meta de ahorro eliminada.", "info");
            }
          });
        });
      }
    }
  }

  // ========================================================
  // RENDERIZADO 5: CONFIGURACIÓN & BASE DE DATOS
  // ========================================================
  function renderSettings() {
    const config = Storage ? Storage.getDbConfig() : null;
    const urlInput = document.getElementById("supabase-url");
    const keyInput = document.getElementById("supabase-key");

    const firebaseProjectInput = document.getElementById("firebase-project-id");
    const firebaseKeyInput = document.getElementById("firebase-api-key");
    const firebaseAuthDomainInput = document.getElementById("firebase-auth-domain");
    const firebaseStorageBucketInput = document.getElementById("firebase-storage-bucket");

    if (config) {
      if (urlInput) urlInput.value = config.url || "";
      if (keyInput) keyInput.value = config.anonKey || "";

      if (firebaseProjectInput && config.projectId) firebaseProjectInput.value = config.projectId;
      if (firebaseKeyInput && config.apiKey) firebaseKeyInput.value = config.apiKey;
      if (firebaseAuthDomainInput && config.authDomain) firebaseAuthDomainInput.value = config.authDomain;
      if (firebaseStorageBucketInput && config.storageBucket) firebaseStorageBucketInput.value = config.storageBucket;
    }

    const dbStatusPill = document.getElementById("db-status-text");
    const firebaseStatusBadge = document.getElementById("firebase-status-badge");

    const isFirebase = config && config.provider === "firebase" && config.projectId && config.apiKey;
    const isSupabase = config && config.provider === "supabase" && config.url;

    if (dbStatusPill) {
      if (isFirebase) {
        dbStatusPill.textContent = "Firebase Firestore";
      } else if (isSupabase) {
        dbStatusPill.textContent = "Supabase Conectado";
      } else {
        dbStatusPill.textContent = "Local Storage";
      }
    }

    if (firebaseStatusBadge) {
      if (isFirebase) {
        firebaseStatusBadge.textContent = "Configurado";
        firebaseStatusBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300";
      } else {
        firebaseStatusBadge.textContent = "Listo para conectar";
        firebaseStatusBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300";
      }
    }
  }

  // ========================================================
  // PLANILLA INTERACTIVA: NUEVO MOVIMIENTO (SPEC 002 & 012)
  // ========================================================
  const EXPENSE_CATEGORIES = [
    "Alimentación & Supermercado",
    "Vivienda & Servicios",
    "Transporte & Combustible",
    "Salud & Bienestar",
    "Ocio, Salidas & Restaurantes",
    "Ropa & Cuidado Personal",
    "Educación & Cursos",
    "Otros Gastos"
  ];

  const INCOME_CATEGORIES = [
    "Sueldo & Salario",
    "Honorarios & Freelance",
    "Rendimientos & Inversiones",
    "Otros Ingresos / Reembolsos"
  ];

  function getPlanCatalog() {
    if (Calculations && Calculations.obtenerCatalogoPlanCuentas) {
      return Calculations.obtenerCatalogoPlanCuentas(state.planAccounts, state.accounts, state.transactions);
    }
    return Calculations?.CATALOGO_PLAN_CUENTAS_PERSONAL_BASE || [];
  }

  function getCategoriesForType(tipo = "all") {
    if (Calculations && Calculations.obtenerCategoriasDesdePlan) {
      return Calculations.obtenerCategoriasDesdePlan(getPlanCatalog(), tipo);
    }
    if (tipo === "income") return INCOME_CATEGORIES.map(c => ({ code: "", name: c, label: c, classNumber: 4 }));
    return EXPENSE_CATEGORIES.map(c => ({ code: "", name: c, label: c, classNumber: 5 }));
  }

  function openTransactionModal(initialType = "expense") {
    const modal = document.getElementById("app-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = "Registrar Nuevo Movimiento";

    const today = new Date().toISOString().slice(0, 10);
    let selectedType = initialType;
    let isSplitActive = false;
    let splitLines = [
      { id: "spl-1", description: "", amount: "", target: "" },
      { id: "spl-2", description: "", amount: "", target: "" }
    ];

    // Generar opciones de cuenta origen
    const accountOptions = state.accounts.map((acc) => {
      return `<option value="${acc.id}">${acc.name} (${formatMoney(acc.currentBalance)})</option>`;
    }).join("");

    modalBody.innerHTML = `
      <form id="form-new-tx" class="space-y-4">
        <!-- Selector de Tipo -->
        <div class="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button type="button" id="btn-type-expense" data-type="expense" class="tx-type-tab flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5">
            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
            <span>Gasto</span>
          </button>
          <button type="button" id="btn-type-income" data-type="income" class="tx-type-tab flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5">
            <i data-lucide="arrow-down-left" class="w-3.5 h-3.5"></i>
            <span>Ingreso</span>
          </button>
          <button type="button" id="btn-type-transfer" data-type="transfer" class="tx-type-tab flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5">
            <i data-lucide="arrow-left-right" class="w-3.5 h-3.5"></i>
            <span>Transferencia</span>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <!-- Monto -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Monto Total ($) *</label>
            <input type="number" id="tx-input-amount" min="1" step="any" placeholder="Ej. 1000000" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>

          <!-- Fecha -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Fecha *</label>
            <input type="date" id="tx-input-date" value="${today}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>

          <!-- Concepto / Descripción -->
          <div class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Concepto / Detalle Global *</label>
            <input type="text" id="tx-input-desc" placeholder="Ej. Compra Grandes Tiendas, Pago Tarjeta..." required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>

          <!-- Cuenta Origen -->
          <div id="col-source-account" class="space-y-1">
            <label id="lbl-source-account" class="font-semibold text-slate-700 dark:text-slate-300">Cuenta de Pago *</label>
            <select id="tx-input-account" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              ${accountOptions}
            </select>
          </div>

          <!-- Cuenta Destino (solo transferencias) -->
          <div id="col-dest-account" class="space-y-1 hidden">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Cuenta Receptora *</label>
            <select id="tx-input-to-account" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            </select>
          </div>

          <!-- Categoría (para gasto / ingreso) -->
          <div id="col-category" class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Categoría *</label>
            <select id="tx-input-category" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            </select>
          </div>

          <!-- Medio de Pago -->
          <div id="col-method" class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Forma / Medio de Pago</label>
            <select id="tx-input-method" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="credit">Tarjeta de Crédito</option>
              <option value="debit">Tarjeta de Débito / Redcompra</option>
              <option value="transfer">Transferencia Bancaria</option>
              <option value="cash">Efectivo</option>
            </select>
          </div>

          <!-- Opción Dividir Movimiento / Split (Spec 004 / RF-1) -->
          <div id="col-split-toggle" class="sm:col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <label class="relative flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <i data-lucide="split" class="w-4 h-4"></i>
                </div>
                <div>
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Dividir movimiento (Split)</span>
                  <p class="text-[10px] text-slate-400">Desglosa este pago en múltiples partidas afectando varias cuentas o categorías</p>
                </div>
              </div>
              <input type="checkbox" id="tx-toggle-split" class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer">
            </label>
          </div>

          <!-- Sección de Partidas Dinámicas Split (Spec 004 / RF-1, RF-2, RF-3) -->
          <div id="tx-split-section" class="sm:col-span-2 space-y-3 p-3 bg-slate-50/90 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hidden">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <i data-lucide="layers" class="w-3.5 h-3.5 text-indigo-500"></i>
                <span>Partidas del Movimiento (mínimo 2)</span>
              </span>
              <button type="button" id="btn-add-split-line" class="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors flex items-center gap-1">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                <span>Añadir partida</span>
              </button>
            </div>

            <div id="tx-split-lines-container" class="space-y-2">
              <!-- Renderizado dinámico de filas -->
            </div>

            <!-- Resumen y Cuadratura Contable en Vivo (RF-2) -->
            <div id="tx-split-balance-bar" class="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs flex flex-wrap items-center justify-between gap-2 shadow-sm">
              <!-- Actualizado dinámicamente -->
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" id="tx-form-cancel" class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" id="tx-form-submit" class="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            <span>Guardar Movimiento</span>
          </button>
        </div>
      </form>
    `;

    safeRenderIcons();

    // Referencias de elementos de la planilla
    const colDest = document.getElementById("col-dest-account");
    const colCat = document.getElementById("col-category");
    const colMethod = document.getElementById("col-method");
    const colSplitToggle = document.getElementById("col-split-toggle");
    const toggleSplit = document.getElementById("tx-toggle-split");
    const splitSection = document.getElementById("tx-split-section");
    const selAccount = document.getElementById("tx-input-account");
    const selToAccount = document.getElementById("tx-input-to-account");
    const selCategory = document.getElementById("tx-input-category");
    const lblSource = document.getElementById("lbl-source-account");
    const amountInput = document.getElementById("tx-input-amount");

    // Función interna para refrescar categorías y cuentas destino
    function updateFormTabs(type) {
      selectedType = type;

      const btnExpense = document.getElementById("btn-type-expense");
      const btnIncome = document.getElementById("btn-type-income");
      const btnTransfer = document.getElementById("btn-type-transfer");

      // Resetear clases
      const resetClass = "text-slate-600 dark:text-slate-400 hover:text-slate-900 bg-transparent";
      btnExpense.className = `tx-type-tab flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${type === 'expense' ? 'bg-rose-600 text-white shadow-sm' : resetClass}`;
      btnIncome.className = `tx-type-tab flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${type === 'income' ? 'bg-emerald-600 text-white shadow-sm' : resetClass}`;
      btnTransfer.className = `tx-type-tab flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${type === 'transfer' ? 'bg-blue-600 text-white shadow-sm' : resetClass}`;

      if (type === "expense") {
        if (lblSource) lblSource.textContent = "Cuenta de Pago *";
        if (colDest) colDest.classList.add("hidden");
        if (colSplitToggle) colSplitToggle.classList.remove("hidden");
        if (colMethod) colMethod.classList.remove("hidden");
        if (!isSplitActive && colCat) colCat.classList.remove("hidden");
        if (selCategory) {
          const expenseCats = getCategoriesForType("expense");
          selCategory.innerHTML = expenseCats.map(c => `<option value="${c.code || c.name}">${c.label || c.name}</option>`).join("");
        }
      } else if (type === "income") {
        if (lblSource) lblSource.textContent = "Cuenta Receptora *";
        if (colDest) colDest.classList.add("hidden");
        if (colSplitToggle) colSplitToggle.classList.remove("hidden");
        if (colMethod) colMethod.classList.remove("hidden");
        if (!isSplitActive && colCat) colCat.classList.remove("hidden");
        if (selCategory) {
          const incomeCats = getCategoriesForType("income");
          selCategory.innerHTML = incomeCats.map(c => `<option value="${c.code || c.name}">${c.label || c.name}</option>`).join("");
        }
      } else if (type === "transfer") {
        if (lblSource) lblSource.textContent = "Cuenta de Origen *";
        if (colDest) colDest.classList.remove("hidden");
        if (colCat) colCat.classList.add("hidden");
        if (colSplitToggle) colSplitToggle.classList.remove("hidden");
        if (colMethod) colMethod.classList.add("hidden");
        updateDestinationAccounts();
      }
      safeRenderIcons();
    }

    function updateDestinationAccounts() {
      if (!selToAccount || !selAccount) return;
      const currentOrigin = selAccount.value;
      const destAccounts = state.accounts.filter(a => a.id !== currentOrigin);
      selToAccount.innerHTML = destAccounts.map(a => `<option value="${a.id}">${a.name} (${formatMoney(a.currentBalance)})</option>`).join("");
    }

    // Generador de opciones para el selector de destino en cada línea Split (Spec 004 & 012)
    function getSplitTargetOptionsHtml(selectedTarget, currentOriginId) {
      const destAccounts = state.accounts.filter(a => a.id !== currentOriginId);
      const accOptions = destAccounts.map(a => {
        const val = `acc:${a.id}`;
        const sel = val === selectedTarget ? "selected" : "";
        return `<option value="${val}" ${sel}>🏦 Cuenta: ${a.name} (${formatMoney(a.currentBalance)})</option>`;
      }).join("");

      const splitItems = getCategoriesForType("split");
      const assetItems = splitItems.filter(c => c.classNumber === 1 || String(c.code).startsWith("1.3"));
      const expenseItems = splitItems.filter(c => c.classNumber === 5 || !String(c.code).startsWith("1.3"));

      const assetOptions = assetItems.map(c => {
        const val = `plan:${c.code}`;
        const sel = (val === selectedTarget || c.code === selectedTarget || c.name === selectedTarget) ? "selected" : "";
        return `<option value="${val}" ${sel}>📦 Bien/Activo: ${c.label}</option>`;
      }).join("");

      const expenseOptions = expenseItems.map(c => {
        const val = `plan:${c.code}`;
        const sel = (val === selectedTarget || c.code === selectedTarget || c.name === selectedTarget || `cat:${c.name}` === selectedTarget) ? "selected" : "";
        return `<option value="${val}" ${sel}>📁 Gasto: ${c.label}</option>`;
      }).join("");

      return `
        <optgroup label="Cuentas Receptores / Tesorería">
          ${accOptions}
        </optgroup>
        ${assetOptions ? `<optgroup label="Bienes & Activos Fijos del Hogar (Clase 1.3)">${assetOptions}</optgroup>` : ''}
        <optgroup label="Cuentas de Gastos (Clase 5)">
          ${expenseOptions}
        </optgroup>
      `;
    }

    // Renderizador de filas split
    function renderSplitLines() {
      const container = document.getElementById("tx-split-lines-container");
      if (!container) return;

      const originId = selAccount ? selAccount.value : "";

      container.innerHTML = splitLines.map((line, idx) => {
        const canDelete = splitLines.length > 2;
        return `
          <div class="split-line-row flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs" data-line-index="${idx}">
            <span class="w-5 text-[10px] font-bold text-slate-400 text-center sm:text-left">#${idx + 1}</span>
            <input type="text" value="${line.description || ''}" placeholder="Concepto (ej. Aspiradora, TV...)" data-field="description" class="split-input-desc flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <input type="number" min="1" step="any" value="${line.amount || ''}" placeholder="Monto ($)" data-field="amount" class="split-input-amount w-full sm:w-28 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <select data-field="target" class="split-select-target w-full sm:w-56 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              ${getSplitTargetOptionsHtml(line.target, originId)}
            </select>
            <button type="button" data-del-index="${idx}" ${canDelete ? '' : 'disabled'} class="btn-del-split p-1.5 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors self-end sm:self-center" title="${canDelete ? 'Eliminar partida' : 'Se requieren al menos 2 partidas'}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `;
      }).join("");

      safeRenderIcons();
      updateSplitBalanceBar();
      attachSplitLineEvents();
    }

    // Actualizador reactivo de la barra de cuadratura contable (RF-2)
    function updateSplitBalanceBar() {
      const bar = document.getElementById("tx-split-balance-bar");
      if (!bar) return;

      const totalAmount = Number(amountInput?.value) || 0;
      let sumLines = 0;
      splitLines.forEach(l => {
        sumLines += Number(l.amount) || 0;
      });

      const difference = Math.round((totalAmount - sumLines) * 100) / 100;

      let statusBadge = "";
      if (totalAmount === 0 && sumLines === 0) {
        statusBadge = `<span class="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">Ingresa los montos</span>`;
      } else if (Math.abs(difference) <= 0.001 && totalAmount > 0) {
        statusBadge = `<span class="px-2.5 py-1 rounded font-bold text-[11px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center gap-1"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Cuadrado exacto</span>`;
      } else if (difference > 0) {
        statusBadge = `<span class="px-2.5 py-1 rounded font-bold text-[11px] bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Faltan ${formatMoney(difference)}</span>`;
      } else {
        statusBadge = `<span class="px-2.5 py-1 rounded font-bold text-[11px] bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Excedido por ${formatMoney(Math.abs(difference))}</span>`;
      }

      bar.innerHTML = `
        <div class="flex items-center gap-3">
          <div><span class="text-slate-400">Total Cabecera:</span> <strong class="text-slate-800 dark:text-slate-200 tabular-nums">${formatMoney(totalAmount)}</strong></div>
          <div><span class="text-slate-400">Desglosado:</span> <strong class="text-slate-800 dark:text-slate-200 tabular-nums">${formatMoney(sumLines)}</strong></div>
        </div>
        <div>${statusBadge}</div>
      `;
      safeRenderIcons();
    }

    // Eventos internos de las filas split
    function attachSplitLineEvents() {
      const container = document.getElementById("tx-split-lines-container");
      if (!container) return;

      container.querySelectorAll(".split-line-row").forEach(row => {
        const idx = Number(row.dataset.lineIndex);
        const descInput = row.querySelector(".split-input-desc");
        const amtInput = row.querySelector(".split-input-amount");
        const targetSelect = row.querySelector(".split-select-target");

        descInput?.addEventListener("input", (e) => {
          splitLines[idx].description = e.target.value;
        });

        amtInput?.addEventListener("input", (e) => {
          splitLines[idx].amount = e.target.value;
          updateSplitBalanceBar();
        });

        targetSelect?.addEventListener("change", (e) => {
          splitLines[idx].target = e.target.value;
        });
      });

      container.querySelectorAll(".btn-del-split").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.delIndex);
          if (splitLines.length > 2) {
            splitLines.splice(idx, 1);
            renderSplitLines();
          }
        });
      });
    }

    // Conmutador Split
    toggleSplit?.addEventListener("change", (e) => {
      isSplitActive = Boolean(e.target.checked);
      if (isSplitActive) {
        splitSection?.classList.remove("hidden");
        colCat?.classList.add("hidden");
        // Establecer opciones iniciales por defecto si están vacías
        const defaultOrigin = selAccount ? selAccount.value : "";
        const defaultSplitCats = getCategoriesForType("split");
        const defaultTargetCat = defaultSplitCats[0] ? `plan:${defaultSplitCats[0].code}` : `cat:${EXPENSE_CATEGORIES[0]}`;
        splitLines.forEach((l) => {
          if (!l.target) {
            const firstDest = state.accounts.find(a => a.id !== defaultOrigin);
            l.target = firstDest ? `acc:${firstDest.id}` : defaultTargetCat;
          }
        });
        renderSplitLines();
      } else {
        splitSection?.classList.add("hidden");
        if (selectedType !== "transfer") colCat?.classList.remove("hidden");
      }
    });

    // Botón "+ Añadir partida"
    document.getElementById("btn-add-split-line")?.addEventListener("click", () => {
      const originId = selAccount ? selAccount.value : "";
      const defaultDest = state.accounts.find(a => a.id !== originId);
      const defaultSplitCats = getCategoriesForType("split");
      const defaultTargetCat = defaultSplitCats[0] ? `plan:${defaultSplitCats[0].code}` : `cat:${EXPENSE_CATEGORIES[0]}`;
      splitLines.push({
        id: `spl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: "",
        amount: "",
        target: defaultDest ? `acc:${defaultDest.id}` : defaultTargetCat
      });
      renderSplitLines();
    });

    // Escuchar cambios en el monto total para actualizar la barra en tiempo real
    amountInput?.addEventListener("input", () => {
      if (isSplitActive) updateSplitBalanceBar();
    });

    selAccount?.addEventListener("change", () => {
      if (selectedType === "transfer") updateDestinationAccounts();
      if (isSplitActive) renderSplitLines();
    });

    document.getElementById("btn-type-expense")?.addEventListener("click", () => updateFormTabs("expense"));
    document.getElementById("btn-type-income")?.addEventListener("click", () => updateFormTabs("income"));
    document.getElementById("btn-type-transfer")?.addEventListener("click", () => updateFormTabs("transfer"));
    document.getElementById("tx-form-cancel")?.addEventListener("click", () => modal.close());

    // Inicializar estado del tab
    updateFormTabs(selectedType);

    // Manejo de envío del formulario (submit)
    const form = document.getElementById("form-new-tx");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const amountVal = Number(document.getElementById("tx-input-amount")?.value);
      const dateVal = document.getElementById("tx-input-date")?.value;
      const descVal = document.getElementById("tx-input-desc")?.value.trim();
      const accountVal = document.getElementById("tx-input-account")?.value;
      const toAccountVal = selectedType === "transfer" ? document.getElementById("tx-input-to-account")?.value : undefined;
      const rawCategoryVal = selectedType === "transfer" ? "Ahorro / Transferencia" : (document.getElementById("tx-input-category")?.value || "Otros");
      const methodVal = document.getElementById("tx-input-method")?.value || "credit";

      const catalog = getPlanCatalog();

      if (isSplitActive) {
        // Parsear líneas split desde el array reactivo
        const parsedSplitLines = splitLines.map((line, idx) => {
          const descEl = document.querySelector(`[data-line-index="${idx}"] .split-input-desc`);
          const amtEl = document.querySelector(`[data-line-index="${idx}"] .split-input-amount`);
          const targetEl = document.querySelector(`[data-line-index="${idx}"] .split-select-target`);

          const desc = descEl ? descEl.value.trim() : (line.description || "");
          const amt = amtEl ? Number(amtEl.value) : Number(line.amount);
          const targetVal = targetEl ? targetEl.value : (line.target || "");

          let targetAccountId = null;
          let cat = "Varios";
          let catCode = null;

          if (targetVal.startsWith("acc:")) {
            targetAccountId = targetVal.replace("acc:", "");
            const targetAcc = state.accounts.find(a => a.id === targetAccountId);
            cat = targetAcc ? targetAcc.name : "Activos";
          } else if (targetVal.startsWith("plan:")) {
            const planCode = targetVal.replace("plan:", "");
            const resolvedPlan = Calculations ? Calculations.resolverCategoriaPlan(planCode, catalog) : null;
            if (resolvedPlan) {
              cat = resolvedPlan.name;
              catCode = resolvedPlan.code;
            } else {
              cat = planCode;
              catCode = planCode;
            }
          } else if (targetVal.startsWith("cat:")) {
            const rawCat = targetVal.replace("cat:", "");
            const resolvedPlan = Calculations ? Calculations.resolverCategoriaPlan(rawCat, catalog) : null;
            if (resolvedPlan) {
              cat = resolvedPlan.name;
              catCode = resolvedPlan.code;
            } else {
              cat = rawCat;
            }
          }

          return {
            id: line.id || `SPL-${idx + 1}`,
            description: desc || `Partida #${idx + 1}`,
            amount: amt,
            category: cat,
            categoryCode: catCode,
            targetAccountId: targetAccountId
          };
        });

        const tx = {
          id: `TX-${Date.now()}`,
          date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
          type: selectedType,
          amount: amountVal,
          description: descVal,
          accountId: accountVal,
          category: "Varios (Split)",
          categoryCode: null,
          paymentMethod: methodVal,
          isSplit: true,
          splitLines: parsedSplitLines
        };

        // Validar con la lógica pura desacoplada (Spec 004 / RF-3)
        const validacion = Calculations ? Calculations.validarMovimientoSplit(tx, state.accounts) : { valida: true };
        if (!validacion.valida) {
          showToast(validacion.error || "Datos inválidos en las partidas.", "error");
          return;
        }

        // Aplicar impacto atómico en cuentas usando lógica pura (Spec 004 / RF-4)
        if (Calculations && Calculations.aplicarMovimientoSplitEnCuentas) {
          state.accounts = Calculations.aplicarMovimientoSplitEnCuentas(state.accounts, tx);
        }

        // Si alguna línea es gasto puro de consumo, actualizar presupuesto de categoría
        parsedSplitLines.forEach(l => {
          if (!l.targetAccountId && l.category) {
            const matchingBudget = state.budgets.find(b => b.category === l.category || (l.categoryCode && b.categoryCode === l.categoryCode));
            if (matchingBudget) {
              matchingBudget.spentAmount = (Number(matchingBudget.spentAmount) || 0) + l.amount;
            }
          }
        });

        state.transactions.unshift(tx);

        if (Storage) {
          Storage.saveAccounts(state.accounts);
          Storage.saveTransactions(state.transactions);
          Storage.saveBudgets(state.budgets);
        }

        modal.close();
        renderActiveView();
        showToast(`Movimiento dividido de ${formatMoney(tx.amount)} registrado con éxito (${tx.splitLines.length} partidas).`, "success");
        triggerAutoSync({ notify: false });
        return;
      }

      // Transacción estándar (no split)
      let resolvedCategoryName = rawCategoryVal;
      let resolvedCategoryCode = null;

      if (selectedType !== "transfer") {
        const resolvedPlan = Calculations ? Calculations.resolverCategoriaPlan(rawCategoryVal, catalog) : null;
        if (resolvedPlan) {
          resolvedCategoryName = resolvedPlan.name;
          resolvedCategoryCode = resolvedPlan.code;
        }
      }

      const tx = {
        id: `TX-${Date.now()}`,
        date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
        type: selectedType,
        amount: amountVal,
        description: descVal,
        accountId: accountVal,
        toAccountId: toAccountVal,
        category: resolvedCategoryName,
        categoryCode: resolvedCategoryCode,
        paymentMethod: methodVal
      };

      // Validar con lógica pura desacoplada
      const validacion = Calculations ? Calculations.validarTransaccion(tx) : { valida: true };
      if (!validacion.valida) {
        showToast(validacion.error || "Datos inválidos", "error");
        return;
      }

      // Aplicar impacto atómico en cuentas usando lógica pura
      if (Calculations && Calculations.aplicarTransaccionEnCuentas) {
        state.accounts = Calculations.aplicarTransaccionEnCuentas(state.accounts, tx);
      }

      // Añadir movimiento al historial (al inicio)
      state.transactions.unshift(tx);

      // Si es un gasto, actualizar el gasto acumulado en el presupuesto correspondiente
      if (tx.type === "expense") {
        const matchingBudget = state.budgets.find(b => b.category === tx.category);
        if (matchingBudget) {
          matchingBudget.spentAmount = (Number(matchingBudget.spentAmount) || 0) + tx.amount;
        }
      }

      // Persistir todo en Storage
      if (Storage) {
        Storage.saveAccounts(state.accounts);
        Storage.saveTransactions(state.transactions);
        Storage.saveBudgets(state.budgets);
      }

      // Cerrar modal y refrescar la vista
      modal.close();
      renderActiveView();

      const typeWord = tx.type === "income" ? "Ingreso" : tx.type === "transfer" ? "Transferencia" : "Gasto";
      showToast(`${typeWord} de ${formatMoney(tx.amount)} registrado con éxito.`, "success");
      triggerAutoSync({ notify: false });
    });

    modal.showModal();
    // Enfocar monto
    setTimeout(() => document.getElementById("tx-input-amount")?.focus(), 50);
  }

  // ========================================================
  // PLANILLA INTERACTIVA: NUEVA CUENTA (SPEC 003)
  // ========================================================
  const DEFAULT_COLORS = {
    bank: "#2563eb",
    cash: "#16a34a",
    wallet: "#0284c7",
    savings: "#7c3aed",
    credit_card: "#e11d48"
  };

  function openAccountModal() {
    const modal = document.getElementById("app-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = "Crear Nueva Cuenta Financiera";

    modalBody.innerHTML = `
      <form id="form-new-account" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <!-- Nombre de la cuenta -->
          <div class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Nombre de la Cuenta *</label>
            <input type="text" id="acc-input-name" placeholder="Ej. Banco Santander, Billetera Dólares, Tarjeta Visa..." required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>

          <!-- Tipo de Cuenta -->
          <div class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Tipo de Cuenta *</label>
            <select id="acc-input-type" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="bank">🏦 Cuenta Bancaria (Corriente / Vista / Débito)</option>
              <option value="cash">💵 Efectivo (Billetera física / Caja)</option>
              <option value="wallet">📱 Billetera Digital (MercadoPago / MACH / Fpay)</option>
              <option value="savings">📈 Ahorro / Inversión (Fondo Mutuo / Depósito)</option>
              <option value="credit_card">💳 Tarjeta de Crédito (Deuda / Pasivo)</option>
            </select>
          </div>

          <!-- Saldo Inicial -->
          <div class="space-y-1">
            <label id="acc-balance-label" class="font-semibold text-slate-700 dark:text-slate-300">Saldo Inicial ($) *</label>
            <input type="number" id="acc-input-balance" value="0" step="any" placeholder="0" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <p id="acc-balance-hint" class="text-[10px] text-slate-400">Saldo con el que comienzas en esta cuenta.</p>
          </div>

          <!-- Moneda -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Moneda *</label>
            <select id="acc-input-currency" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="CLP">CLP ($ - Peso Chileno)</option>
              <option value="ARS">ARS ($ - Peso Argentino)</option>
              <option value="USD">USD ($ - Dólar)</option>
              <option value="EUR">EUR (€ - Euro)</option>
            </select>
          </div>

          <!-- Color Identificador -->
          <div class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Color Identificador</label>
            <div class="flex items-center gap-3">
              <input type="color" id="acc-input-color" value="#2563eb" class="w-10 h-9 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent">
              <span class="text-xs text-slate-500 dark:text-slate-400">Color distintivo para las tarjetas del dashboard</span>
            </div>
          </div>

          <!-- Excluir del total -->
          <div class="sm:col-span-2 pt-1 flex items-start gap-2">
            <input type="checkbox" id="acc-input-exclude" class="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500">
            <label for="acc-input-exclude" class="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              Excluir del cálculo del Patrimonio Neto <span class="text-[10px] text-slate-400 block">(útil para fondos de terceros o garantías no computables)</span>
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" id="acc-form-cancel" class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" id="acc-form-submit" class="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            <span>Guardar Cuenta</span>
          </button>
        </div>
      </form>
    `;

    safeRenderIcons();

    const typeSelect = document.getElementById("acc-input-type");
    const colorInput = document.getElementById("acc-input-color");
    const balanceHint = document.getElementById("acc-balance-hint");
    const balanceLabel = document.getElementById("acc-balance-label");

    typeSelect?.addEventListener("change", (e) => {
      const selectedType = e.target.value;
      if (colorInput && DEFAULT_COLORS[selectedType]) {
        colorInput.value = DEFAULT_COLORS[selectedType];
      }
      if (selectedType === "credit_card") {
        if (balanceLabel) balanceLabel.textContent = "Saldo Adeudado Inicial ($) *";
        if (balanceHint) balanceHint.textContent = "Monto adeudado actual en la tarjeta (se computará como deuda / pasivo).";
      } else {
        if (balanceLabel) balanceLabel.textContent = "Saldo Inicial ($) *";
        if (balanceHint) balanceHint.textContent = "Saldo con el que comienzas en esta cuenta.";
      }
    });

    document.getElementById("acc-form-cancel")?.addEventListener("click", () => modal.close());

    // Submit handler
    const form = document.getElementById("form-new-account");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const nameVal = document.getElementById("acc-input-name")?.value.trim();
      const typeVal = document.getElementById("acc-input-type")?.value;
      const balanceVal = Number(document.getElementById("acc-input-balance")?.value);
      const currencyVal = document.getElementById("acc-input-currency")?.value || "CLP";
      const colorVal = document.getElementById("acc-input-color")?.value || DEFAULT_COLORS[typeVal] || "#2563eb";
      const excludeVal = Boolean(document.getElementById("acc-input-exclude")?.checked);

      const accountData = {
        name: nameVal,
        type: typeVal,
        initialBalance: balanceVal,
        currency: currencyVal,
        color: colorVal,
        isExcludedFromTotal: excludeVal
      };

      // Validar usando lógica pura
      const validacion = Calculations ? Calculations.validarNuevaCuenta(accountData, state.accounts) : { valida: true };
      if (!validacion.valida) {
        showToast(validacion.error || "Datos de cuenta inválidos.", "error");
        return;
      }

      // Crear objeto usando fábrica pura
      const newAccount = Calculations ? Calculations.crearCuentaObjeto(accountData) : accountData;

      // Actualizar estado y persistir
      state.accounts.push(newAccount);
      if (Storage) {
        Storage.saveAccounts(state.accounts);
      }

      modal.close();
      renderActiveView();
      showToast(`Cuenta "${newAccount.name}" creada con éxito.`, "success");
      if (typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
        DbAdapter.syncBidirectional().catch(() => {});
      }
    });

    modal.showModal();
    setTimeout(() => document.getElementById("acc-input-name")?.focus(), 50);
  }

  // ========================================================
  // PLANILLA INTERACTIVA: EDITAR CUENTA (SPEC 010)
  // ========================================================
  function openAccountEditModal(accountId) {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account) {
      showToast("No se encontró la cuenta seleccionada.", "error");
      return;
    }

    const modal = document.getElementById("app-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = `Editar Cuenta Contable: ${account.name}`;

    modalBody.innerHTML = `
      <form id="form-edit-account" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <!-- Código Contable -->
          <div class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Código Contable (Opcional / Sugerido)</label>
            <input type="text" id="acc-edit-input-code" value="${escapeHtml(account.codigoContable || '')}" placeholder="Ej. 1.1.02.01" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <p class="text-[10px] text-slate-400">Identificador contable dentro del catálogo patrimonial.</p>
          </div>

          <!-- Nombre de la cuenta -->
          <div class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Nombre de la Cuenta *</label>
            <input type="text" id="acc-edit-input-name" value="${escapeHtml(account.name)}" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>

          <!-- Tipo de Cuenta -->
          <div class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Tipo de Cuenta / Rubro *</label>
            <select id="acc-edit-input-type" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="bank" ${account.type === "bank" ? "selected" : ""}>🏦 Cuenta Bancaria (1.1.02 - Activo)</option>
              <option value="cash" ${account.type === "cash" ? "selected" : ""}>💵 Efectivo (1.1.01 - Activo)</option>
              <option value="wallet" ${account.type === "wallet" ? "selected" : ""}>📱 Billetera Digital (1.1.03 - Activo)</option>
              <option value="savings" ${account.type === "savings" ? "selected" : ""}>📈 Ahorro / Inversión (1.2.01 - Activo)</option>
              <option value="credit_card" ${account.type === "credit_card" ? "selected" : ""}>💳 Tarjeta de Crédito (2.1.01 - Pasivo)</option>
            </select>
          </div>

          <!-- Moneda -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Moneda *</label>
            <select id="acc-edit-input-currency" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="CLP" ${account.currency === "CLP" ? "selected" : ""}>CLP ($ - Peso Chileno)</option>
              <option value="ARS" ${account.currency === "ARS" ? "selected" : ""}>ARS ($ - Peso Argentino)</option>
              <option value="USD" ${account.currency === "USD" ? "selected" : ""}>USD ($ - Dólar)</option>
              <option value="EUR" ${account.currency === "EUR" ? "selected" : ""}>EUR (€ - Euro)</option>
            </select>
          </div>

          <!-- Color Identificador -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Color Identificador</label>
            <div class="flex items-center gap-3">
              <input type="color" id="acc-edit-input-color" value="${account.color || '#2563eb'}" class="w-10 h-9 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent">
              <span class="text-xs text-slate-500 dark:text-slate-400">Color distintivo</span>
            </div>
          </div>

          <!-- Excluir del total -->
          <div class="sm:col-span-2 pt-1 flex items-start gap-2">
            <input type="checkbox" id="acc-edit-input-exclude" ${account.isExcludedFromTotal ? "checked" : ""} class="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500">
            <label for="acc-edit-input-exclude" class="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              Excluir del cálculo del Patrimonio Neto <span class="text-[10px] text-slate-400 block">(fondos de terceros o garantías no computables)</span>
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" id="acc-edit-form-cancel" class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" id="acc-edit-form-submit" class="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            <span>Guardar Cambios</span>
          </button>
        </div>
      </form>
    `;

    safeRenderIcons();

    document.getElementById("acc-edit-form-cancel")?.addEventListener("click", () => modal.close());

    const form = document.getElementById("form-edit-account");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const nameVal = document.getElementById("acc-edit-input-name")?.value.trim();
      const codeVal = document.getElementById("acc-edit-input-code")?.value.trim();
      const typeVal = document.getElementById("acc-edit-input-type")?.value;
      const currencyVal = document.getElementById("acc-edit-input-currency")?.value || "CLP";
      const colorVal = document.getElementById("acc-edit-input-color")?.value || account.color;
      const excludeVal = Boolean(document.getElementById("acc-edit-input-exclude")?.checked);

      const editData = {
        name: nameVal,
        type: typeVal,
        codigoContable: codeVal,
        currency: currencyVal,
        color: colorVal,
        isExcludedFromTotal: excludeVal
      };

      const validacion = Calculations
        ? Calculations.validarEdicionCuenta(editData, state.accounts, account.id)
        : { valida: true };

      if (!validacion.valida) {
        showToast(validacion.error || "Datos inválidos para actualizar la cuenta.", "error");
        return;
      }

      // Actualizar campos
      account.name = nameVal;
      account.type = typeVal;
      account.currency = currencyVal;
      account.color = colorVal;
      account.isExcludedFromTotal = excludeVal;
      if (codeVal) {
        account.codigoContable = codeVal;
      }

      // Actualizar icono según tipo
      const iconMap = {
        bank: "landmark",
        cash: "banknote",
        wallet: "wallet",
        savings: "trending-up",
        credit_card: "credit-card"
      };
      account.icon = iconMap[typeVal] || account.icon || "wallet";

      if (Storage) {
        Storage.saveAccounts(state.accounts);
      }

      modal.close();
      renderActiveView();
      showToast(`Cuenta "${account.name}" actualizada con éxito.`, "success");
      if (typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
        DbAdapter.syncBidirectional().catch(() => {});
      }
    });

    modal.showModal();
    setTimeout(() => document.getElementById("acc-edit-input-name")?.focus(), 50);
  }

  // ========================================================
  // PLANILLA INTERACTIVA: NUEVA / EDITAR CUENTA CONTABLE (SPEC 011 & 013)
  // ========================================================
  function openPlanAccountModal(planAccountId = null, preselectedParentCode = null) {
    const fullCatalog = Calculations && Calculations.obtenerCatalogoPlanCuentas
      ? Calculations.obtenerCatalogoPlanCuentas(state.planAccounts, state.accounts, state.transactions)
      : [];

    const existing = planAccountId ? fullCatalog.find(c => c.id === planAccountId) : null;
    const initialParentCode = existing ? (existing.parentCode || "") : (preselectedParentCode || "");
    const parentAccount = initialParentCode ? fullCatalog.find(c => c.code === initialParentCode) : null;

    const modal = document.getElementById("app-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = existing 
      ? `Editar Cuenta Contable: ${existing.code}` 
      : (initialParentCode ? `Nueva Subcuenta de ${initialParentCode}` : "Nueva Cuenta Contable Personal");

    const defaultClass = existing 
      ? existing.classNumber 
      : (parentAccount ? parentAccount.classNumber : (state.chartOfAccountsFilter.group !== "all" ? Number(state.chartOfAccountsFilter.group) : 1));

    const defaultGroup = existing
      ? existing.groupName
      : (parentAccount ? parentAccount.groupName : "");

    const defaultNature = existing
      ? existing.nature
      : (parentAccount ? parentAccount.nature : ([1, 5].includes(defaultClass) ? "debit" : "credit"));

    const initialCode = existing 
      ? existing.code 
      : (initialParentCode && Calculations && Calculations.generarSiguienteCodigoSubcuenta 
        ? Calculations.generarSiguienteCodigoSubcuenta(initialParentCode, fullCatalog) 
        : "");

    // Cuentas elegibles como padres (cuentas base o de nivel <= 3)
    const baseParentAccounts = fullCatalog.filter(c => !c.parentCode && (!c.code || c.code.split('.').length <= 3));

    modalBody.innerHTML = `
      <form id="form-plan-account" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <!-- Cuenta Base Padre (Spec 013) -->
          <div class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Cuenta Base Padre (Opcional / Crear como Subcuenta)</label>
            <select id="plan-input-parent" ${existing && existing.isSystem ? 'disabled' : ''} class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— Ninguna (Cuenta Principal / Base Independiente) —</option>
              ${baseParentAccounts.map(b => `
                <option value="${b.code}" ${initialParentCode === b.code ? 'selected' : ''}>
                  ${b.code} · ${b.name} (${b.groupName || 'Clase ' + b.classNumber})
                </option>
              `).join("")}
            </select>
            <p class="text-[10px] text-slate-400">Al seleccionar una Cuenta Base, la subcuenta hereda su clase, rubro contable y se genera el siguiente código correlativo automáticamente.</p>
          </div>

          <!-- Clase Contable -->
          <div class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Clase Contable *</label>
            <select id="plan-input-class" required ${(existing && existing.isSystem) || Boolean(initialParentCode) ? 'disabled' : ''} class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="1" ${defaultClass === 1 ? 'selected' : ''}>1. ACTIVOS (Disponible, Inversiones, Bienes)</option>
              <option value="2" ${defaultClass === 2 ? 'selected' : ''}>2. PASIVOS (Tarjetas, Deudas, Compromisos)</option>
              <option value="3" ${defaultClass === 3 ? 'selected' : ''}>3. PATRIMONIO NETO (Capital y Ahorro Acumulado)</option>
              <option value="4" ${defaultClass === 4 ? 'selected' : ''}>4. INGRESOS (Sueldos, Honorarios, Rendimientos)</option>
              <option value="5" ${defaultClass === 5 ? 'selected' : ''}>5. GASTOS (Vivienda, Alimentación, Movilidad, etc.)</option>
            </select>
          </div>

          <!-- Código Contable -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Código Contable *</label>
            <input type="text" id="plan-input-code" value="${escapeHtml(initialCode)}" placeholder="Ej. 1.3.05 o 5.2.01.01" required ${existing && existing.isSystem ? 'readonly' : ''} class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <p id="plan-code-hint" class="text-[10px] text-slate-400">Jerarquía contable sugerida.</p>
          </div>

          <!-- Naturaleza Habitual -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Naturaleza Contable *</label>
            <select id="plan-input-nature" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="debit" ${defaultNature === "debit" ? 'selected' : ''}>Deudora (Aumenta al Débito / Disminuye al Crédito)</option>
              <option value="credit" ${defaultNature === "credit" ? 'selected' : ''}>Acreedora (Aumenta al Crédito / Disminuye al Débito)</option>
            </select>
          </div>

          <!-- Nombre de la Cuenta -->
          <div class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Nombre de la Cuenta / Subcuenta *</label>
            <input type="text" id="plan-input-name" value="${escapeHtml(existing ? existing.name : '')}" placeholder="Ej. Alquiler Depto, Gasto Común, Panadería, Luz..." required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>

          <!-- Rubro / Subgrupo -->
          <div class="sm:col-span-2 space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Rubro o Subgrupo Contable</label>
            <input type="text" id="plan-input-group" value="${escapeHtml(defaultGroup)}" placeholder="Ej. 5.1 Vivienda y Hogar" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <p class="text-[10px] text-slate-400">Grupo contable superior para organizar el catálogo.</p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" id="plan-form-cancel" class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" id="plan-form-submit" class="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            <span>${existing ? 'Actualizar Cuenta' : 'Guardar Cuenta'}</span>
          </button>
        </div>
      </form>
    `;

    safeRenderIcons();

    // Eventos reactivos de cambio de Cuenta Base Padre
    const parentSelect = document.getElementById("plan-input-parent");
    const classSelect = document.getElementById("plan-input-class");
    const codeInput = document.getElementById("plan-input-code");
    const groupInput = document.getElementById("plan-input-group");
    const natureSelect = document.getElementById("plan-input-nature");

    parentSelect?.addEventListener("change", (e) => {
      const selectedParentCode = e.target.value;
      if (selectedParentCode) {
        const pAcc = fullCatalog.find(c => c.code === selectedParentCode);
        if (pAcc) {
          if (classSelect) {
            classSelect.value = String(pAcc.classNumber);
            classSelect.disabled = true;
          }
          if (groupInput) groupInput.value = pAcc.groupName || "";
          if (natureSelect) natureSelect.value = pAcc.nature || ([1, 5].includes(pAcc.classNumber) ? "debit" : "credit");
          if (codeInput && (!existing || existing.parentCode !== selectedParentCode)) {
            const nextCode = Calculations && Calculations.generarSiguienteCodigoSubcuenta
              ? Calculations.generarSiguienteCodigoSubcuenta(selectedParentCode, fullCatalog)
              : `${selectedParentCode}.01`;
            codeInput.value = nextCode;
          }
        }
      } else {
        if (classSelect) classSelect.disabled = false;
      }
    });

    document.getElementById("plan-form-cancel")?.addEventListener("click", () => modal.close());

    const form = document.getElementById("form-plan-account");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const parentCodeVal = document.getElementById("plan-input-parent")?.value.trim() || null;
      let classNum = Number(document.getElementById("plan-input-class")?.value || defaultClass);
      if (parentCodeVal) {
        const pAcc = fullCatalog.find(c => c.code === parentCodeVal);
        if (pAcc) classNum = pAcc.classNumber;
      }

      const codeVal = document.getElementById("plan-input-code")?.value.trim();
      const nameVal = document.getElementById("plan-input-name")?.value.trim();
      const groupVal = document.getElementById("plan-input-group")?.value.trim() || `Clase ${classNum}`;
      const natureVal = document.getElementById("plan-input-nature")?.value || ([1, 5].includes(classNum) ? "debit" : "credit");

      const classTypeMap = { 1: "asset", 2: "liability", 3: "equity", 4: "income", 5: "expense" };

      const accountData = {
        code: codeVal,
        name: nameVal,
        parentCode: parentCodeVal,
        isSubaccount: Boolean(parentCodeVal),
        classNumber: classNum,
        classType: classTypeMap[classNum] || "asset",
        groupName: groupVal,
        nature: natureVal
      };

      const validacion = Calculations
        ? Calculations.validarCuentaPlan(accountData, fullCatalog, existing ? existing.id : null)
        : { valida: true };

      if (!validacion.valida) {
        showToast(validacion.error || "Datos inválidos para la cuenta contable.", "error");
        return;
      }

      if (existing) {
        const targetIdx = state.planAccounts.findIndex(p => p.id === existing.id || p.code === existing.code);
        if (targetIdx >= 0) {
          state.planAccounts[targetIdx].code = codeVal;
          state.planAccounts[targetIdx].name = nameVal;
          state.planAccounts[targetIdx].parentCode = parentCodeVal;
          state.planAccounts[targetIdx].isSubaccount = Boolean(parentCodeVal);
          state.planAccounts[targetIdx].groupName = groupVal;
          state.planAccounts[targetIdx].nature = natureVal;
        } else {
          state.planAccounts.push({
            id: existing.id || `PLAN-${Date.now()}`,
            code: codeVal,
            name: nameVal,
            parentCode: parentCodeVal,
            isSubaccount: Boolean(parentCodeVal),
            classNumber: classNum,
            classType: classTypeMap[classNum] || "asset",
            groupName: groupVal,
            nature: natureVal,
            balance: existing.balance || 0,
            periodMovement: existing.periodMovement || 0,
            isSystem: false
          });
        }
      } else {
        state.planAccounts.push({
          id: `PLAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          code: codeVal,
          name: nameVal,
          parentCode: parentCodeVal,
          isSubaccount: Boolean(parentCodeVal),
          classNumber: classNum,
          classType: classTypeMap[classNum] || "asset",
          groupName: groupVal,
          nature: natureVal,
          balance: 0,
          periodMovement: 0,
          isSystem: false,
          icon: parentCodeVal ? "corner-down-right" : (classNum === 1 ? "box" : classNum === 2 ? "credit-card" : classNum === 3 ? "shield" : classNum === 4 ? "plus-circle" : "tag")
        });
      }

      if (Storage && Storage.savePlanAccounts) {
        Storage.savePlanAccounts(state.planAccounts);
      }

      modal.close();
      renderActiveView();
      const successMsg = parentCodeVal 
        ? `Subcuenta "${nameVal}" (${codeVal}) creada exitosamente bajo ${parentCodeVal}.`
        : `Cuenta contable "${nameVal}" guardada con éxito.`;
      showToast(successMsg, "success");
      if (typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
        DbAdapter.syncBidirectional().catch(() => {});
      }
    });

    modal.showModal();
    setTimeout(() => document.getElementById("plan-input-name")?.focus(), 50);
  }

  // ========================================================
  // PLANILLA INTERACTIVA: NUEVO/EDITAR PRESUPUESTO (SPEC 005)
  // ========================================================
  function openBudgetModal(budgetIdToEdit = null) {
    const modal = document.getElementById("app-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    if (!modal || !modalTitle || !modalBody) return;

    const existing = budgetIdToEdit ? state.budgets.find(b => b.id === budgetIdToEdit) : null;
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const selectedMonth = existing ? existing.month : currentMonth;
    const expenseCats = getCategoriesForType("expense");
    const initialCategory = existing ? existing.category : (expenseCats[0]?.name || EXPENSE_CATEGORIES[0]);

    modalTitle.textContent = existing ? "Editar Presupuesto Mensual" : "Nuevo Presupuesto Mensual";

    modalBody.innerHTML = `
      <form id="form-new-budget" class="space-y-4">
        <div class="space-y-3 text-xs">
          <!-- Categoría -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Cuenta de Gasto / Categoría (Clase 5) *</label>
            <select id="budget-input-category" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              ${expenseCats.map(c => `
                <option value="${c.name}" data-code="${c.code}" ${(existing ? (existing.category === c.name || existing.categoryCode === c.code) : c.name === initialCategory) ? 'selected' : ''}>${c.label}</option>
              `).join("")}
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Límite de Gasto -->
            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Límite Mensual ($) *</label>
              <input type="number" id="budget-input-limit" min="1" step="any" required placeholder="Ej. 250000" value="${existing ? existing.limitAmount : ''}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500">
            </div>

            <!-- Período / Mes -->
            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Mes del Presupuesto *</label>
              <input type="month" id="budget-input-month" required value="${selectedMonth}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            </div>
          </div>

          <!-- Vista previa del gasto acumulado actual en esa categoría y mes -->
          <div id="budget-spent-preview" class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <!-- Actualizado dinámicamente -->
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" id="budget-form-cancel" class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" id="budget-form-submit" class="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            <span>${existing ? 'Actualizar Presupuesto' : 'Guardar Presupuesto'}</span>
          </button>
        </div>
      </form>
    `;

    safeRenderIcons();

    const selCat = document.getElementById("budget-input-category");
    const inputMonth = document.getElementById("budget-input-month");
    const previewEl = document.getElementById("budget-spent-preview");

    function updateSpentPreview() {
      if (!previewEl || !selCat || !inputMonth) return;
      const cat = selCat.value;
      const m = inputMonth.value;
      const spent = Calculations ? Calculations.calcularGastoCategoriaMes(state.transactions, cat, m) : 0;
      previewEl.innerHTML = `
        <span class="text-slate-500">Gasto detectado en ${m || 'este mes'}:</span>
        <strong class="text-slate-900 dark:text-white font-bold tabular-nums">${formatMoney(spent)}</strong>
      `;
    }

    selCat?.addEventListener("change", updateSpentPreview);
    inputMonth?.addEventListener("change", updateSpentPreview);
    updateSpentPreview();

    document.getElementById("budget-form-cancel")?.addEventListener("click", () => modal.close());

    const form = document.getElementById("form-new-budget");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const category = selCat?.value;
      const selectedOption = selCat?.options ? selCat.options[selCat.selectedIndex] : null;
      const categoryCode = selectedOption ? selectedOption.getAttribute("data-code") : null;
      const limitAmount = Number(document.getElementById("budget-input-limit")?.value);
      const month = inputMonth?.value || currentMonth;

      const budgetData = { category, categoryCode, limitAmount, month };

      const validacion = Calculations ? Calculations.validarPresupuesto(budgetData) : { valida: true };
      if (!validacion.valida) {
        showToast(validacion.error || "Datos inválidos", "error");
        return;
      }

      const spentAmount = Calculations ? Calculations.calcularGastoCategoriaMes(state.transactions, category, month) : 0;

      if (existing) {
        // Edición de presupuesto existente
        existing.category = category;
        existing.categoryCode = categoryCode;
        existing.limitAmount = limitAmount;
        existing.month = month;
        existing.spentAmount = spentAmount;
        showToast(`Presupuesto de "${category}" actualizado.`, "success");
      } else {
        // Verificar si ya existe para este mes y categoría
        const alreadyExists = state.budgets.find(b => b.category === category && b.month === month);
        if (alreadyExists) {
          alreadyExists.limitAmount = limitAmount;
          alreadyExists.categoryCode = categoryCode;
          alreadyExists.spentAmount = spentAmount;
          showToast(`Presupuesto de "${category}" actualizado al nuevo límite.`, "success");
        } else {
          const newBudget = {
            id: `BUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            category,
            categoryCode,
            limitAmount,
            spentAmount,
            month
          };
          state.budgets.push(newBudget);
          showToast(`Presupuesto para "${category}" establecido con éxito.`, "success");
        }
      }

      if (Storage) {
        Storage.saveBudgets(state.budgets);
      }

      modal.close();
      renderActiveView();
      if (typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
        DbAdapter.syncBidirectional().catch(() => {});
      }
    });

    modal.showModal();
    setTimeout(() => document.getElementById("budget-input-limit")?.focus(), 50);
  }

  // ========================================================
  // PLANILLA INTERACTIVA: NUEVA/EDITAR META DE AHORRO (SPEC 006)
  // ========================================================
  function openGoalModal(goalIdToEdit = null) {
    const modal = document.getElementById("app-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    if (!modal || !modalTitle || !modalBody) return;

    const existing = goalIdToEdit ? state.goals.find(g => g.id === goalIdToEdit) : null;
    modalTitle.textContent = existing ? "Editar Meta de Ahorro" : "Crear Nueva Meta de Ahorro";

    const currentColor = existing ? (existing.color || "#2563eb") : "#2563eb";

    modalBody.innerHTML = `
      <form id="form-new-goal" class="space-y-4">
        <div class="space-y-3 text-xs">
          <!-- Título de la meta -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Objetivo / Nombre de la Meta *</label>
            <input type="text" id="goal-input-title" required placeholder="Ej. Fondo de Emergencia, Vacaciones en Familia..." value="${existing ? existing.title : ''}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Monto Objetivo -->
            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Monto Objetivo ($) *</label>
              <input type="number" id="goal-input-target" min="1" step="any" required placeholder="Ej. 1500000" value="${existing ? existing.targetAmount : ''}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <!-- Monto Ahorrado Inicial -->
            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Monto Ahorrado Inicial ($)</label>
              <input type="number" id="goal-input-current" min="0" step="any" placeholder="0" value="${existing ? existing.currentAmount : 0}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <!-- Fecha Límite -->
            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Fecha Objetivo (Opcional)</label>
              <input type="date" id="goal-input-deadline" value="${existing && existing.deadlineDate ? existing.deadlineDate.slice(0, 10) : ''}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <!-- Color Identificador -->
            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Color Identificador</label>
              <div class="flex items-center gap-2">
                <input type="color" id="goal-input-color" value="${currentColor}" class="w-9 h-9 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent">
                <span class="text-[11px] text-slate-400">Color de la barra de progreso</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" id="goal-form-cancel" class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" id="goal-form-submit" class="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            <span>${existing ? 'Actualizar Meta' : 'Crear Meta de Ahorro'}</span>
          </button>
        </div>
      </form>
    `;

    safeRenderIcons();

    document.getElementById("goal-form-cancel")?.addEventListener("click", () => modal.close());

    const form = document.getElementById("form-new-goal");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const title = document.getElementById("goal-input-title")?.value.trim();
      const targetAmount = Number(document.getElementById("goal-input-target")?.value);
      const currentAmount = Number(document.getElementById("goal-input-current")?.value) || 0;
      const deadlineDate = document.getElementById("goal-input-deadline")?.value || null;
      const color = document.getElementById("goal-input-color")?.value || "#2563eb";

      const goalData = { title, targetAmount, currentAmount, deadlineDate, color };

      const validacion = Calculations ? Calculations.validarMetaAhorro(goalData) : { valida: true };
      if (!validacion.valida) {
        showToast(validacion.error || "Datos inválidos", "error");
        return;
      }

      if (existing) {
        existing.title = title;
        existing.targetAmount = targetAmount;
        existing.currentAmount = currentAmount;
        existing.deadlineDate = deadlineDate;
        existing.color = color;
        showToast(`Meta "${title}" actualizada con éxito.`, "success");
      } else {
        const newGoal = {
          id: `GOAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title,
          targetAmount,
          currentAmount,
          deadlineDate,
          color
        };
        state.goals.push(newGoal);
        showToast(`Meta de ahorro "${title}" creada con éxito.`, "success");
      }

      if (Storage) {
        Storage.saveGoals(state.goals);
      }

      modal.close();
      renderActiveView();
      if (typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
        DbAdapter.syncBidirectional().catch(() => {});
      }
    });

    modal.showModal();
    setTimeout(() => document.getElementById("goal-input-title")?.focus(), 50);
  }

  // Modal para Aportar a una Meta existente (RF-4)
  function openContributeGoalModal(goalId) {
    const modal = document.getElementById("app-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    if (!modal || !modalTitle || !modalBody) return;

    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;

    modalTitle.textContent = `Aportar a "${goal.title}"`;

    const progreso = Calculations
      ? Calculations.calcularProgresoMeta(goal.currentAmount, goal.targetAmount)
      : { percentage: 0, remainingAmount: goal.targetAmount, isCompleted: false };

    modalBody.innerHTML = `
      <form id="form-contribute-goal" class="space-y-4">
        <div class="space-y-3 text-xs">
          <div class="p-3 bg-blue-50/70 dark:bg-blue-950/50 rounded-xl border border-blue-100 dark:border-blue-900/60 space-y-1.5">
            <div class="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span class="font-semibold">Progreso actual:</span>
              <strong class="text-blue-600 dark:text-blue-400 font-bold">${progreso.percentage}%</strong>
            </div>
            <div class="flex items-center justify-between text-slate-500 text-[11px]">
              <span>Ahorrado: ${formatMoney(goal.currentAmount)}</span>
              <span>Meta: ${formatMoney(goal.targetAmount)}</span>
            </div>
            ${!progreso.isCompleted ? `<div class="text-[11px] text-slate-500">Faltante: <strong class="text-slate-800 dark:text-slate-200">${formatMoney(progreso.remainingAmount)}</strong></div>` : ''}
          </div>

          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Monto a Aportar ($) *</label>
            <input type="number" id="contribute-input-amount" min="1" step="any" required placeholder="Ej. 50000" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" id="contribute-form-cancel" class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" id="contribute-form-submit" class="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95">
            <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
            <span>Confirmar Aporte</span>
          </button>
        </div>
      </form>
    `;

    safeRenderIcons();

    document.getElementById("contribute-form-cancel")?.addEventListener("click", () => modal.close());

    const form = document.getElementById("form-contribute-goal");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const aporte = Number(document.getElementById("contribute-input-amount")?.value);
      if (isNaN(aporte) || aporte <= 0) {
        showToast("Ingresa un monto de aporte mayor a cero.", "error");
        return;
      }

      try {
        const goalActualizada = Calculations ? Calculations.aplicarAporteMeta(goal, aporte) : { ...goal, currentAmount: (goal.currentAmount || 0) + aporte };
        const idx = state.goals.findIndex(g => g.id === goalId);
        if (idx !== -1) {
          state.goals[idx] = goalActualizada;
        }

        if (Storage) {
          Storage.saveGoals(state.goals);
        }

        modal.close();
        renderActiveView();

        const nuevoProgreso = Calculations ? Calculations.calcularProgresoMeta(goalActualizada.currentAmount, goalActualizada.targetAmount) : { isCompleted: false };
        if (nuevoProgreso.isCompleted) {
          showToast(`🎉 ¡Felicitaciones! Has completado tu meta "${goal.title}" con ${formatMoney(goalActualizada.currentAmount)}.`, "success");
        } else {
          showToast(`Aporte de ${formatMoney(aporte)} sumado a "${goal.title}".`, "success");
        }
        if (typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
          DbAdapter.syncBidirectional().catch(() => {});
        }
      } catch (err) {
        showToast(err.message || "Error al aplicar aporte", "error");
      }
    });

    modal.showModal();
    setTimeout(() => document.getElementById("contribute-input-amount")?.focus(), 50);
  }

  // ========================================================
  // RENDERIZADO GENERAL Y CICLO DE VIDA
  // ========================================================
  function renderActiveView() {
    switch (state.currentView) {
      case "dashboard":
        renderDashboard();
        break;
      case "accounts":
        renderAccounts();
        break;
      case "chart-of-accounts":
        renderChartOfAccounts();
        break;
      case "account-detail":
        renderAccountDetailView();
        break;
      case "transactions":
        renderTransactions();
        break;
      case "budgets":
        renderBudgets();
        break;
      case "settings":
        renderSettings();
        break;
    }
    safeRenderIcons();
  }

  function loadStateFromStorage() {
    if (Storage) {
      state.accounts = Storage.getAccounts();
      state.transactions = Storage.getTransactions();
      state.budgets = Storage.getBudgets();
      state.goals = Storage.getGoals();
      state.planAccounts = Storage.getPlanAccounts ? Storage.getPlanAccounts() : [];
    }
  }

  // ========================================================
  // AUTO-SINCRONIZACIÓN BIDIRECCIONAL CON FIREBASE (SPEC 015)
  // Declarada en ámbito superior para acceso desde cualquier modal
  // ========================================================
  let isSyncing = false;
  async function triggerAutoSync(options = {}) {
    if (isSyncing) return;
    if (!DbAdapter || DbAdapter.getProvider() !== "firebase") return;

    const quickIcon = document.getElementById("quick-sync-icon");
    const quickText = document.getElementById("quick-sync-text");

    try {
      isSyncing = true;
      if (quickIcon) quickIcon.classList.add("animate-spin");
      if (quickText && options.manual) quickText.textContent = "Sincronizando...";

      const res = await DbAdapter.syncBidirectional();
      if (res && res.synced) {
        if (res.mergedState) {
          state.accounts = res.mergedState.accounts;
          state.transactions = res.mergedState.transactions;
          state.budgets = res.mergedState.budgets;
          state.goals = res.mergedState.goals;
          state.planAccounts = res.mergedState.planAccounts;
        } else {
          loadStateFromStorage();
        }

        renderActiveView();

        if (res.hasChangesFromRemote || res.newTransactionsFromRemote > 0) {
          if (options.notify !== false) {
            showToast(res.message, "success");
          }
        } else if (options.manual) {
          showToast("Datos al día con la nube.", "info");
        }
      }
    } catch (err) {
      if (options.manual) {
        showToast("Error de sincronización con la nube.", "error");
      }
    } finally {
      isSyncing = false;
      if (quickIcon) quickIcon.classList.remove("animate-spin");
      if (quickText) quickText.textContent = "Sincronizar";
    }
  }

  // ========================================================
  // FILTROS Y EVENTOS GLOBALES
  // ========================================================
  function initFiltersAndEvents() {
    document.getElementById("tx-search")?.addEventListener("input", (e) => {
      state.filters.txSearch = e.target.value.trim();
      renderTransactions();
    });

    document.getElementById("tx-type-filter")?.addEventListener("change", (e) => {
      state.filters.txType = e.target.value;
      renderTransactions();
    });

    document.getElementById("tx-account-filter")?.addEventListener("change", (e) => {
      state.filters.txAccount = e.target.value;
      renderTransactions();
    });

    document.getElementById("tx-category-filter")?.addEventListener("change", (e) => {
      state.filters.txCategory = e.target.value;
      renderTransactions();
    });

    const daterangeEl = document.getElementById("tx-daterange-filter");
    const customDateContainer = document.getElementById("tx-custom-date-container");
    daterangeEl?.addEventListener("change", (e) => {
      state.filters.txDateRange = e.target.value;
      if (e.target.value === "custom") {
        customDateContainer?.classList.remove("hidden");
        state.filters.txStartDate = document.getElementById("tx-date-start")?.value || "";
        state.filters.txEndDate = document.getElementById("tx-date-end")?.value || "";
      } else {
        customDateContainer?.classList.add("hidden");
        state.filters.txStartDate = "";
        state.filters.txEndDate = "";
      }
      renderTransactions();
    });

    document.getElementById("tx-date-start")?.addEventListener("change", (e) => {
      state.filters.txStartDate = e.target.value;
      renderTransactions();
    });

    document.getElementById("tx-date-end")?.addEventListener("change", (e) => {
      state.filters.txEndDate = e.target.value;
      renderTransactions();
    });

    document.getElementById("btn-export-csv")?.addEventListener("click", () => {
      const filtered = Calculations && Calculations.filtrarTransacciones
        ? Calculations.filtrarTransacciones(state.transactions, state.filters)
        : state.transactions;

      if (!filtered || filtered.length === 0) {
        showToast("No hay movimientos filtrados para exportar a CSV.", "warning");
        return;
      }

      if (Calculations && Calculations.generarTransaccionesCSV) {
        const csvContent = Calculations.generarTransaccionesCSV(filtered, state.accounts);
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `movimientos_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exportados ${filtered.length} movimientos a CSV compatible con Excel.`, "success");
      }
    });

    const resetHandler = () => {
      if (confirm("¿Deseas restablecer todas tus cuentas, movimientos, presupuestos y metas a los datos de demostración?")) {
        if (Storage) Storage.resetToMockData();
        loadStateFromStorage();
        renderActiveView();
        showToast("Datos demo de contabilidad personal cargados con éxito.", "success");
      }
    };
    document.getElementById("btn-reset-demo")?.addEventListener("click", resetHandler);
    document.getElementById("btn-settings-reset")?.addEventListener("click", resetHandler);

    const exportHandler = () => {
      if (Storage) Storage.exportBackup();
      showToast("Copia de seguridad JSON descargada.", "info");
    };
    document.getElementById("btn-export-backup")?.addEventListener("click", exportHandler);
    document.getElementById("btn-settings-export")?.addEventListener("click", exportHandler);

    document.getElementById("input-import-json")?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        let parsed;
        try {
          parsed = JSON.parse(event.target.result);
        } catch (err) {
          showToast("Error de sintaxis: el archivo no es un JSON válido.", "error");
          return;
        }

        const validation = Calculations ? Calculations.validarBackupJSON(parsed) : { isValid: true, counts: {} };
        if (!validation.isValid) {
          showToast(validation.error || "Copia de seguridad inválida.", "error");
          return;
        }

        const counts = validation.counts || {};
        const confirmMsg = `¿Deseas restaurar este respaldo?\n\n• Cuentas: ${counts.accounts || 0}\n• Movimientos: ${counts.transactions || 0}\n• Presupuestos: ${counts.budgets || 0}\n• Metas de ahorro: ${counts.goals || 0}\n\nLos datos actuales serán reemplazados.`;
        if (confirm(confirmMsg)) {
          const ok = Storage ? Storage.importBackup(event.target.result) : false;
          if (ok) {
            loadStateFromStorage();
            renderActiveView();
            showToast("Copia de seguridad restaurada correctamente.", "success");
          } else {
            showToast("Error al restaurar copia de seguridad.", "error");
          }
        }
        e.target.value = "";
      };
      reader.readAsText(file);
    });

    document.getElementById("btn-save-db")?.addEventListener("click", () => {
      const url = document.getElementById("supabase-url")?.value.trim() || "";
      const key = document.getElementById("supabase-key")?.value.trim() || "";
      const currentConfig = Storage ? Storage.getDbConfig() : {};

      if (Storage) {
        Storage.saveDbConfig({
          ...currentConfig,
          provider: url && key ? "supabase" : (currentConfig.projectId && currentConfig.apiKey ? "firebase" : "none"),
          url,
          anonKey: key
        });
      }
      renderSettings();
      showToast("Configuración de Supabase guardada.", "success");
    });

    document.getElementById("btn-test-db")?.addEventListener("click", async () => {
      const url = document.getElementById("supabase-url")?.value.trim() || "";
      const key = document.getElementById("supabase-key")?.value.trim() || "";

      showToast("Probando conexión con Supabase...", "info");
      if (DbAdapter) {
        const result = await DbAdapter.testConnection(url, key);
        if (result.success) {
          showToast(result.message, "success");
        } else {
          showToast(result.message, "error");
        }
      }
    });

    // LISTENERS DE FIREBASE CLOUD FIRESTORE (SPEC 014)
    document.getElementById("btn-save-firebase")?.addEventListener("click", () => {
      const projectId = document.getElementById("firebase-project-id")?.value.trim() || "";
      const apiKey = document.getElementById("firebase-api-key")?.value.trim() || "";
      const authDomain = document.getElementById("firebase-auth-domain")?.value.trim() || "";
      const storageBucket = document.getElementById("firebase-storage-bucket")?.value.trim() || "";
      const currentConfig = Storage ? Storage.getDbConfig() : {};

      if (Storage) {
        Storage.saveDbConfig({
          ...currentConfig,
          provider: (projectId && apiKey) ? "firebase" : (currentConfig.url && currentConfig.anonKey ? "supabase" : "none"),
          projectId,
          apiKey,
          authDomain,
          storageBucket
        });
      }
      renderSettings();
      showToast("Configuración de Firebase guardada con éxito.", "success");
    });

    document.getElementById("btn-test-firebase")?.addEventListener("click", async () => {
      const projectId = document.getElementById("firebase-project-id")?.value.trim() || "";
      const apiKey = document.getElementById("firebase-api-key")?.value.trim() || "";
      const authDomain = document.getElementById("firebase-auth-domain")?.value.trim() || "";
      const storageBucket = document.getElementById("firebase-storage-bucket")?.value.trim() || "";

      if (!projectId || !apiKey) {
        showToast("Ingresa Project ID y API Key de Firebase.", "warning");
        return;
      }

      showToast("Verificando conexión con Firebase Firestore...", "info");
      const feedbackEl = document.getElementById("firebase-connection-feedback");

      if (DbAdapter) {
        const result = await DbAdapter.testFirebaseConnection({ projectId, apiKey, authDomain, storageBucket });
        if (feedbackEl) {
          feedbackEl.className = "p-3 rounded-lg text-xs border";
          if (result.success) {
            feedbackEl.classList.add("bg-emerald-50", "text-emerald-800", "border-emerald-200", "dark:bg-emerald-950/50", "dark:text-emerald-300", "dark:border-emerald-800");
            feedbackEl.innerHTML = `<span class="font-bold flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i> ${result.message}</span>`;
            showToast(result.message, "success");
          } else if (result.needsConsoleActivation) {
            feedbackEl.classList.add("bg-amber-50", "text-amber-900", "border-amber-200", "dark:bg-amber-950/50", "dark:text-amber-200", "dark:border-amber-800");
            feedbackEl.innerHTML = `<strong>Paso necesario:</strong> ${result.message}<br><a href="${result.consoleUrl}" target="_blank" rel="noopener noreferrer" class="underline font-bold text-amber-800 dark:text-amber-300 mt-1.5 inline-flex items-center gap-1">Abrir Firebase Console <i data-lucide="external-link" class="w-3.5 h-3.5"></i></a>`;
            showToast("Acción requerida: Inicializar Firestore en Firebase Console.", "warning");
          } else {
            feedbackEl.classList.add("bg-rose-50", "text-rose-800", "border-rose-200", "dark:bg-rose-950/50", "dark:text-rose-300", "dark:border-rose-800");
            feedbackEl.innerHTML = `<span class="font-bold flex items-center gap-1.5"><i data-lucide="alert-circle" class="w-4 h-4 text-rose-600 dark:text-rose-400"></i> ${result.message}</span>`;
            showToast(result.message, "error");
          }
          safeRenderIcons();
        }
      }
    });

    document.getElementById("btn-firebase-backup")?.addEventListener("click", async () => {
      const config = Storage ? Storage.getDbConfig() : null;
      if (!config || !config.projectId || !config.apiKey) {
        showToast("Guarda primero la configuración de Firebase.", "warning");
        return;
      }

      showToast("Subiendo respaldo de datos a Cloud Firestore...", "info");
      const fullBackup = {
        accounts: state.accounts || [],
        transactions: state.transactions || [],
        budgets: state.budgets || [],
        goals: state.goals || [],
        planAccounts: state.planAccounts || []
      };

      if (DbAdapter) {
        const result = await DbAdapter.saveBackupToFirebase(fullBackup, config);
        if (result.success) {
          showToast(result.message, "success");
        } else {
          showToast(result.message, "error");
        }
      }
    });

    // Botón rápido en la cabecera superior
    document.getElementById("btn-quick-sync")?.addEventListener("click", async () => {
      showToast("Sincronizando con Cloud Firestore...", "info");
      await triggerAutoSync({ notify: true, manual: true });
    });

    // Botón en la sección de Configuración
    document.getElementById("btn-firebase-sync")?.addEventListener("click", async () => {
      showToast("Sincronizando con base de datos remota...", "info");
      await triggerAutoSync({ notify: true, manual: true });
    });

    // Sincronización automática al retomar la pestaña o la app en móvil
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        triggerAutoSync({ notify: true });
      }
    });

    window.addEventListener("focus", () => {
      triggerAutoSync({ notify: false });
    });

    const modal = document.getElementById("app-modal");
    document.getElementById("modal-close-btn")?.addEventListener("click", () => modal?.close());

    // BOTONES QUE ABREN LA PLANILLA DE NUEVO MOVIMIENTO
    document.getElementById("btn-quick-new-tx")?.addEventListener("click", () => {
      openTransactionModal("expense");
    });

    document.getElementById("btn-modal-new-tx")?.addEventListener("click", () => {
      openTransactionModal("expense");
    });

    // Modales de otras entidades
    const showModalPlaceholder = (title, desc) => {
      document.getElementById("modal-title").textContent = title;
      document.getElementById("modal-body").innerHTML = `
        <div class="py-4 text-center space-y-3">
          <i data-lucide="sparkles" class="w-8 h-8 text-emerald-500 mx-auto"></i>
          <p class="text-xs text-slate-600 dark:text-slate-300">${desc}</p>
          <p class="text-[11px] text-slate-400">Esta sección se configurará en la siguiente fase.</p>
        </div>
      `;
      safeRenderIcons();
      modal?.showModal();
    };

    document.getElementById("btn-modal-new-account")?.addEventListener("click", () => {
      openAccountModal();
    });
    document.getElementById("btn-modal-new-budget")?.addEventListener("click", () => {
      openBudgetModal();
    });
    document.getElementById("btn-modal-new-goal")?.addEventListener("click", () => {
      openGoalModal();
    });
  }

  // Arranque inmediato y defensivo
  function startApp() {
    initTheme();
    initNavigation();
    loadStateFromStorage();
    initFiltersAndEvents();
    renderActiveView();
    // Auto-sincronización multi-dispositivo en segundo plano al abrir la app
    if (typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
      triggerAutoSync({ notify: false });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
  } else {
    startApp();
  }

})(typeof globalThis !== "undefined" ? globalThis : this);

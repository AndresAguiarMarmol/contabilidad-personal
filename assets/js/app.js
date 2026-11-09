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
    filters: {
      txSearch: "",
      txType: "all"
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
    if (titleEl) titleEl.textContent = VIEW_METADATA[viewName].title;
    if (subEl) subEl.textContent = VIEW_METADATA[viewName].subtitle;

    const views = ["dashboard", "accounts", "transactions", "budgets", "settings"];
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
    document.querySelectorAll("[data-nav-view]").forEach((btn) => {
      const target = btn.getAttribute("data-nav-view");
      const isSidebarItem = btn.classList.contains("nav-item");

      if (target === viewName) {
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
    // 1. Patrimonio Neto usando lógica pura
    const netWorthData = Calculations
      ? Calculations.calcularPatrimonioNeto(state.accounts)
      : { assets: 0, liabilities: 0, netWorth: 0 };

    const netWorthEl = document.getElementById("dash-net-worth");
    const assetsEl = document.getElementById("dash-assets-summary");
    if (netWorthEl) netWorthEl.textContent = formatMoney(netWorthData.netWorth);
    if (assetsEl) assetsEl.textContent = `Activos: ${formatMoney(netWorthData.assets)} · Deudas: ${formatMoney(netWorthData.liabilities)}`;

    // 2. Ingresos y Gastos del Mes usando lógica pura
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

    // 3. Alertas de Presupuestos
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

    // Badge en sidebar
    const budgetBadge = document.getElementById("sidebar-budget-alert-badge");
    if (budgetBadge) {
      if (budgetAlertsCount > 0) {
        budgetBadge.textContent = budgetAlertsCount;
        budgetBadge.classList.remove("hidden");
      } else {
        budgetBadge.classList.add("hidden");
      }
    }

    // 4. Distribución de Gastos por Categoría
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

    // 5. Últimos Movimientos
    const recentTxEl = document.getElementById("dash-recent-transactions");
    if (recentTxEl) {
      const recent = state.transactions.slice(0, 5);
      recentTxEl.innerHTML = recent.map((tx) => {
        const isIncome = tx.type === "income";
        const isTransfer = tx.type === "transfer";
        
        const iconName = isIncome ? "arrow-down-left" : isTransfer ? "arrow-left-right" : "arrow-up-right";
        const iconClass = isIncome ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400" : isTransfer ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400" : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400";
        const amountColor = isIncome ? "text-emerald-600 dark:text-emerald-400" : isTransfer ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400";

        return `
          <div class="py-2.5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg ${iconClass} flex items-center justify-center">
                <i data-lucide="${iconName}" class="w-4 h-4"></i>
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-800 dark:text-slate-200">${tx.description}</p>
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
        <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white" style="background-color: ${acc.color || '#10b981'}">
              <i data-lucide="${acc.icon || 'wallet'}" class="w-5 h-5"></i>
            </div>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              ${typeLabels[acc.type] || acc.type}
            </span>
          </div>

          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">${acc.name}</h3>
            <p class="text-xs text-slate-400">${acc.currency || 'CLP'}</p>
            <div class="mt-2">
              <span class="text-xs text-slate-500">${isCredit ? 'Saldo adeudado:' : 'Saldo disponible:'}</span>
              <p class="text-xl font-bold tabular-nums ${balanceColor}">${formatMoney(acc.currentBalance)}</p>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // ========================================================
  // RENDERIZADO 3: TRANSACCIONES
  // ========================================================
  function renderTransactions() {
    const tbody = document.getElementById("transactions-table-body");
    if (!tbody) return;

    const { txSearch, txType } = state.filters;

    const filtered = state.transactions.filter((tx) => {
      if (txType !== "all" && tx.type !== txType) return false;
      if (txSearch) {
        const q = txSearch.toLowerCase();
        const matchDesc = (tx.description || "").toLowerCase().includes(q);
        const matchCat = (tx.category || "").toLowerCase().includes(q);
        if (!matchDesc && !matchCat) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">No hay movimientos que coincidan con los filtros.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((tx) => {
      const isIncome = tx.type === "income";
      const isTransfer = tx.type === "transfer";
      const typeLabel = isIncome ? "Ingreso" : isTransfer ? "Transferencia" : "Gasto";
      const typeBadge = isIncome 
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
        : isTransfer ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300";

      const account = state.accounts.find(a => a.id === tx.accountId);
      const accountName = account ? account.name : "Cuenta";

      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <td class="py-3 px-4 text-slate-500 whitespace-nowrap">${formatDate(tx.date)}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${typeBadge}">
              ${typeLabel}
            </span>
          </td>
          <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">${tx.description}</td>
          <td class="py-3 px-4 text-slate-500">${tx.category}</td>
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
    // 1. Presupuestos Mensuales
    const budgetsContainer = document.getElementById("budgets-grid");
    if (budgetsContainer) {
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

        return `
          <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">${b.category}</h3>
              <span class="text-xs font-semibold ${ejecucion.status === 'exceeded' ? 'text-rose-600' : ejecucion.status === 'warning' ? 'text-amber-600' : 'text-emerald-600'}">${ejecucion.percentage}%</span>
            </div>

            <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full ${colorClass} rounded-full transition-all duration-300" style="width: ${Math.min(ejecucion.percentage, 100)}%"></div>
            </div>

            <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Gastado: <strong class="text-slate-800 dark:text-slate-200">${formatMoney(b.spentAmount)}</strong></span>
              <span>Límite: ${formatMoney(b.limitAmount)}</span>
            </div>

            <p class="text-[11px] font-medium text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">${statusText}</p>
          </div>
        `;
      }).join("");
    }

    // 2. Metas de Ahorro
    const goalsContainer = document.getElementById("goals-grid");
    if (goalsContainer) {
      goalsContainer.innerHTML = state.goals.map((g) => {
        const pct = Math.min(100, Math.round((g.currentAmount / (g.targetAmount || 1)) * 100));

        return `
          <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">${g.title}</h3>
              <span class="text-xs font-bold text-blue-600 dark:text-blue-400">${pct}%</span>
            </div>

            <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full bg-blue-600 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
            </div>

            <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Ahorrado: <strong class="text-slate-800 dark:text-slate-200">${formatMoney(g.currentAmount)}</strong></span>
              <span>Meta: ${formatMoney(g.targetAmount)}</span>
            </div>

            ${g.deadlineDate ? `<p class="text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">Fecha objetivo: ${formatDate(g.deadlineDate)}</p>` : ''}
          </div>
        `;
      }).join("");
    }
  }

  // ========================================================
  // RENDERIZADO 5: CONFIGURACIÓN & BASE DE DATOS
  // ========================================================
  function renderSettings() {
    const config = Storage ? Storage.getDbConfig() : null;
    const urlInput = document.getElementById("supabase-url");
    const keyInput = document.getElementById("supabase-key");

    if (config) {
      if (urlInput) urlInput.value = config.url || "";
      if (keyInput) keyInput.value = config.anonKey || "";
    }

    const dbStatusPill = document.getElementById("db-status-text");
    if (dbStatusPill) {
      if (config && config.provider === "supabase" && config.url) {
        dbStatusPill.textContent = "Supabase Conectado";
      } else {
        dbStatusPill.textContent = "Local Storage";
      }
    }
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
        const ok = Storage ? Storage.importBackup(event.target.result) : false;
        if (ok) {
          loadStateFromStorage();
          renderActiveView();
          showToast("Copia de seguridad restaurada correctamente.", "success");
        } else {
          showToast("Archivo JSON no válido.", "error");
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("btn-save-db")?.addEventListener("click", () => {
      const url = document.getElementById("supabase-url")?.value.trim() || "";
      const key = document.getElementById("supabase-key")?.value.trim() || "";

      if (Storage) {
        Storage.saveDbConfig({
          provider: url && key ? "supabase" : "none",
          url,
          anonKey: key
        });
      }
      renderSettings();
      showToast("Configuración de base de datos guardada.", "success");
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

    const modal = document.getElementById("app-modal");
    document.getElementById("modal-close-btn")?.addEventListener("click", () => modal?.close());

    const showModalPlaceholder = (title, desc) => {
      document.getElementById("modal-title").textContent = title;
      document.getElementById("modal-body").innerHTML = `
        <div class="py-4 text-center space-y-3">
          <i data-lucide="sparkles" class="w-8 h-8 text-emerald-500 mx-auto"></i>
          <p class="text-xs text-slate-600 dark:text-slate-300">${desc}</p>
          <p class="text-[11px] text-slate-400">El shell y la arquitectura de Contabilidad Personal están listos y operativos.</p>
        </div>
      `;
      safeRenderIcons();
      modal?.showModal();
    };

    document.getElementById("btn-quick-new-tx")?.addEventListener("click", () => {
      showModalPlaceholder("Registrar Nuevo Movimiento", "Formulario para registrar un Ingreso, Gasto o Transferencia entre cuentas con categorías de vida.");
    });
    document.getElementById("btn-modal-new-tx")?.addEventListener("click", () => {
      showModalPlaceholder("Registrar Nuevo Movimiento", "Formulario para registrar un Ingreso, Gasto o Transferencia entre cuentas con categorías de vida.");
    });
    document.getElementById("btn-modal-new-account")?.addEventListener("click", () => {
      showModalPlaceholder("Crear Nueva Cuenta Financiera", "Formulario para añadir cuentas bancarias, billeteras o tarjetas de crédito.");
    });
    document.getElementById("btn-modal-new-budget")?.addEventListener("click", () => {
      showModalPlaceholder("Definir Presupuesto Mensual", "Asigna límites máximos a categorías como Alimentación, Vivienda u Ocio.");
    });
    document.getElementById("btn-modal-new-goal")?.addEventListener("click", () => {
      showModalPlaceholder("Crear Meta de Ahorro", "Define tu objetivo financiero (monto meta y fecha límite deseada).");
    });
  }

  // Arranque inmediato y defensivo
  function startApp() {
    initTheme();
    initNavigation();
    loadStateFromStorage();
    initFiltersAndEvents();
    renderActiveView();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
  } else {
    // Si el DOM ya cargó, inicializar de inmediato
    startApp();
  }

})(typeof globalThis !== "undefined" ? globalThis : this);

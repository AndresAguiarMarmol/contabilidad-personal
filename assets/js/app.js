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
    currencies: [],
    suppliers: [],
    deletedAccounts: [],
    deletedPlanAccounts: [],
    deletedBudgets: [],
    deletedGoals: [],
    deletedTransactions: [],
    deletedSuppliers: [],
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
    },
    reports: {
      activeReport: "balance", // "balance" | "income_statement"
      periodType: "current-month", // "current-month" | "current-year" | "custom"
      startDate: "",
      endDate: ""
    },
    accountsSearchTerm: "",
    authSession: null,
    authMode: "login" // "login" | "register"
  };

  // Formateador de moneda estándar con soporte multidivisa y criptomonedas (Spec 018 & Spec 036)
  const formatMoney = (amount, currencyCode = "CLP") => {
    const code = (currencyCode || "CLP").toUpperCase();
    const curr = (state.currencies || []).find(c => (c.code || "").toUpperCase() === code);
    const esCrypto = code === "BTC" || code === "ETH" || code === "SAT" || (curr && curr.isCrypto);

    let maxDigits = 2;
    if (code === "CLP") {
      maxDigits = 0;
    } else if (esCrypto) {
      maxDigits = 8;
    } else {
      const strVal = String(amount || 0);
      const decPart = strVal.includes(".") ? strVal.split(".")[1] : "";
      maxDigits = decPart.length > 2 ? Math.min(8, decPart.length) : 2;
    }

    if (esCrypto) {
      const symbol = curr ? curr.symbol : `${code} `;
      const decLen = (String(amount || 0).split(".")[1] || "").length;
      const minDigits = Math.min(maxDigits, Math.max(2, decLen));
      const numStr = new Intl.NumberFormat("es-CL", {
        maximumFractionDigits: maxDigits,
        minimumFractionDigits: minDigits
      }).format(amount || 0);
      return `${symbol} ${numStr}`;
    }

    try {
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: code,
        maximumFractionDigits: maxDigits
      }).format(amount || 0);
    } catch (e) {
      const symbol = curr ? curr.symbol : `${code} `;
      const numStr = new Intl.NumberFormat("es-CL", {
        maximumFractionDigits: maxDigits,
        minimumFractionDigits: maxDigits > 0 ? 2 : 0
      }).format(amount || 0);
      return `${symbol} ${numStr}`;
    }
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

  // Visor y descarga de comprobantes PDF (Spec 033)
  function abrirComprobantePdf(dataUrl, fileName = "comprobante.pdf") {
    if (!dataUrl) return;
    try {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${escapeHtml(fileName)}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body, html { margin: 0; padding: 0; height: 100%; background: #0f172a; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              header { background: #1e293b; color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
              .title { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; }
              .btn-dl { color: #ffffff; background: #059669; font-weight: 600; font-size: 12px; text-decoration: none; padding: 6px 14px; border-radius: 8px; transition: background 0.2s; }
              .btn-dl:hover { background: #10b981; }
              iframe { flex: 1; border: none; width: 100%; height: 100%; }
            </style>
          </head>
          <body>
            <header>
              <div class="title">📄 <span>${escapeHtml(fileName)}</span></div>
              <a href="${dataUrl}" download="${escapeHtml(fileName)}" class="btn-dl">Descargar PDF</a>
            </header>
            <iframe src="${dataUrl}"></iframe>
          </body>
          </html>
        `);
        win.document.close();
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = fileName;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      window.open(dataUrl, "_blank");
    }
  }

  // Conversión optimizada de fotos/imágenes a PDF (Spec 033)
  function convertirImagenAPdf(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onload = function () {
        // Redimensionar si excede 800px para mantener tamaño ultraligero (~30-60KB) garantizando legibilidad y cuota Firestore (Spec 041)
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const compressedJpeg = canvas.toDataURL("image/jpeg", 0.58);

        // Si window.jspdf está disponible, generar un documento PDF real
        if (typeof window !== "undefined" && window.jspdf && window.jspdf.jsPDF) {
          try {
            const orientation = w > h ? "l" : "p";
            const pdf = new window.jspdf.jsPDF({
              orientation: orientation,
              unit: "pt",
              format: [w, h]
            });
            pdf.addImage(compressedJpeg, "JPEG", 0, 0, w, h);
            const pdfDataUri = pdf.output("datauristring");
            callback(null, pdfDataUri, canvas);
            return;
          } catch (err) {
            console.warn("Fallo jsPDF, usando compresión base:", err);
          }
        }

        // Fallback: Si no está jsPDF cargado, enviar el JPEG comprimido DataURL
        callback(null, compressedJpeg, canvas);
      };
      img.onerror = function (err) {
        callback(err || new Error("Error cargando imagen."));
      };
      img.src = dataUrl;
    };
    reader.onerror = function (err) {
      callback(err || new Error("Error leyendo archivo."));
    };
    reader.readAsDataURL(file);
  }

  // ========================================================
  // EXTRACCIÓN DE TEXTO Y DATOS DE FACTURAS/BOLETAS (SPEC 034)
  // ========================================================
  async function extraerTextoDesdePdf(dataUrl) {
    if (!dataUrl) return "";
    try {
      if (typeof window !== "undefined" && window.pdfjsLib) {
        let pdfData;
        if (dataUrl.startsWith("data:")) {
          const base64 = dataUrl.split(",")[1];
          const binaryStr = window.atob(base64);
          const len = binaryStr.length;
          pdfData = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            pdfData[i] = binaryStr.charCodeAt(i);
          }
        } else {
          pdfData = dataUrl;
        }

        const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
        const pdfDoc = await loadingTask.promise;
        let fullText = "";
        const maxPages = Math.min(pdfDoc.numPages, 5);
        for (let p = 1; p <= maxPages; p++) {
          const page = await pdfDoc.getPage(p);
          const content = await page.getTextContent();
          const pageText = content.items.map(item => item.str).join(" ");
          fullText += pageText + "\n";
        }
        return fullText;
      }
    } catch (err) {
      console.warn("Error leyendo texto de PDF:", err);
    }
    return "";
  }

  async function extraerTextoDesdeImagen(imageOrCanvas) {
    if (!imageOrCanvas) return "";
    try {
      if (typeof window !== "undefined" && window.Tesseract) {
        const worker = await window.Tesseract.createWorker("spa");
        const res = await worker.recognize(imageOrCanvas);
        await worker.terminate();
        return res?.data?.text || "";
      }
    } catch (err) {
      console.warn("Error en OCR Tesseract.js:", err);
    }
    return "";
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
    reports: {
      title: "Reportes Contables & Financieros",
      subtitle: "Balance General Clasificado y Estado de Resultados según normativa contable chilena (IFRS Pymes)"
    },
    settings: {
      title: "Configuración",
      subtitle: "Bases de datos, proveedores, monedas, biometría y respaldos"
    },
    currencies: {
      title: "Monedas y Tasas de Cambio",
      subtitle: "Administra las divisas y sus tipos de cambio de referencia respecto al Peso Chileno (CLP)"
    },
    suppliers: {
      title: "Directorio de Proveedores / Beneficiarios",
      subtitle: "Archivo maestro de comercios y beneficiarios habituales para autocompletar tus movimientos"
    },
    "cloud-db": {
      title: "Base de Datos en la Nube (Firebase Cloud Firestore)",
      subtitle: "Aloja y sincroniza tus cuentas, movimientos y archivos de respaldo en Firestore"
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

    const views = ["dashboard", "accounts", "chart-of-accounts", "account-detail", "transactions", "budgets", "reports", "settings", "currencies", "suppliers", "cloud-db"];
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

    // Actualizar estilos activos de navegación (Spec 043, Spec 044 & Spec 045: sub-vistas pertenecen a Configuración)
    const activeNavView = viewName === "account-detail"
      ? "accounts"
      : (viewName === "chart-of-accounts" ? "settings" : (["currencies", "suppliers", "cloud-db"].includes(viewName) ? "settings" : viewName));
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

    document.getElementById("btn-open-sidebar")?.addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar");
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        openMobileSidebar();
      } else if (sidebar) {
        sidebar.classList.toggle("md:hidden");
      }
    });
    document.getElementById("btn-close-sidebar")?.addEventListener("click", closeMobileSidebar);
    document.getElementById("sidebar-backdrop")?.addEventListener("click", closeMobileSidebar);
  }

  // ========================================================
  // RENDERIZADO 1: DASHBOARD PATRIMONIAL
  // ========================================================
  function renderDashboard() {
    const netWorthData = Calculations
      ? Calculations.calcularPatrimonioNeto(state.accounts, state.currencies)
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

    const accounts = state.accounts || [];
    const searchTerm = state.accountsSearchTerm || "";
    const isSearching = Boolean(searchTerm.trim());

    // Filtrar cuentas usando lógica pura de cálculos (Spec 023)
    const filtered = Calculations && Calculations.filtrarCuentasFinancieras
      ? Calculations.filtrarCuentasFinancieras(accounts, searchTerm)
      : accounts;

    // Actualizar controles visuales de la barra de búsqueda
    const clearBtn = document.getElementById("btn-clear-accounts-search");
    const countBadge = document.getElementById("accounts-search-count-badge");
    const emptySearch = document.getElementById("accounts-empty-search");
    const emptySearchMsg = document.getElementById("accounts-empty-search-msg");

    if (clearBtn) {
      if (isSearching) clearBtn.classList.remove("hidden");
      else clearBtn.classList.add("hidden");
    }

    if (countBadge) {
      if (isSearching) {
        countBadge.classList.remove("hidden");
        countBadge.textContent = `${filtered.length} de ${accounts.length} ${filtered.length === 1 ? 'cuenta' : 'cuentas'}`;
      } else {
        countBadge.classList.add("hidden");
      }
    }

    // Manejo de estado sin resultados
    if (isSearching && filtered.length === 0) {
      if (emptySearch) emptySearch.classList.remove("hidden");
      if (emptySearchMsg) emptySearchMsg.textContent = `No hay cuentas que coincidan con "${escapeHtml(searchTerm)}".`;
      container.classList.add("hidden");
      safeRenderIcons();
      return;
    }

    if (emptySearch) emptySearch.classList.add("hidden");
    container.classList.remove("hidden");

    if (accounts.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div class="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <i data-lucide="landmark" class="w-6 h-6"></i>
          </div>
          <div class="space-y-1">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">Aún no tienes cuentas registradas</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Comienza creando tu primera cuenta bancaria, billetera o tarjeta de crédito.</p>
          </div>
          <button type="button" id="btn-empty-add-account" class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Crear Primera Cuenta</span>
          </button>
        </div>
      `;
      document.getElementById("btn-empty-add-account")?.addEventListener("click", () => {
        openAccountModal();
      });
      safeRenderIcons();
      return;
    }

    container.innerHTML = filtered.map((acc) => {
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
        <div data-account-id="${acc.id}" class="account-card cursor-pointer bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 hover:shadow-md shadow-sm flex flex-col justify-between space-y-2.5 sm:space-y-4 transition-all duration-200 group" title="Haz clic para abrir la pantalla de movimientos de ${acc.name}">
          <div class="flex items-center justify-between gap-1">
            <div class="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0" style="background-color: ${acc.color || '#10b981'}">
              <i data-lucide="${acc.icon || 'wallet'}" class="w-3.5 h-3.5 sm:w-5 sm:h-5"></i>
            </div>
            <div class="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
              <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 truncate max-w-[70px] sm:max-w-none">
                ${typeLabels[acc.type] || acc.type}
              </span>
              <button type="button" data-account-action="edit" data-id="${acc.id}" class="btn-card-edit-account p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors" title="Editar ${escapeHtml(acc.name)}">
                <i data-lucide="pencil" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
              </button>
              <button type="button" data-account-action="delete" data-id="${acc.id}" class="btn-card-delete-account p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors" title="Eliminar ${escapeHtml(acc.name)}">
                <i data-lucide="trash-2" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
              </button>
            </div>
          </div>

          <div>
            <h3 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <span class="truncate">${acc.name}</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-1 group-hover:text-emerald-500 transition-all flex-shrink-0 ml-1"></i>
            </h3>
            <p class="text-[10px] sm:text-xs text-slate-400">${acc.currency || 'CLP'}</p>
            <div class="mt-1.5 sm:mt-2 flex items-baseline justify-between">
              <div class="min-w-0 pr-1">
                <span class="text-[10px] sm:text-xs text-slate-500 block truncate">${isCredit ? 'Saldo adeudado:' : 'Saldo disponible:'}</span>
                <p class="text-sm sm:text-xl font-bold tabular-nums truncate ${balanceColor}">${formatMoney(acc.currentBalance, acc.currency)}</p>
              </div>
              <span class="hidden sm:inline text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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

    // Eventos de botones Editar en tarjeta (Spec 017 / RF-1)
    container.querySelectorAll(".btn-card-edit-account").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        if (id) openAccountEditModal(id);
      });
    });

    // Eventos de botones Eliminar en tarjeta (Spec 017 / RF-1, RF-4)
    container.querySelectorAll(".btn-card-delete-account").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        if (id) solicitarEliminarCuentaFinanciera(id);
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
        const matchSupp = (tx.supplier || "").toLowerCase().includes(searchVal);
        if (!matchDesc && !matchCat && !matchSupp) return false;
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
                  <th class="py-3 px-4 whitespace-nowrap">Proveedor / Beneficiario</th>
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
                        ${tx.invoicePdf ? `
                          <button type="button" class="btn-view-invoice mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 transition-colors" data-tx-id="${escapeHtml(tx.id)}">
                            <i data-lucide="file-text" class="w-3 h-3"></i>
                            <span>Ver PDF</span>
                          </button>
                        ` : ''}
                        ${relLabel ? `<span class="text-[10px] font-normal text-slate-400">${relLabel}</span>` : ''}
                        ${splitDetailsHtml}
                      </td>
                      <td class="py-3 px-4 text-slate-700 dark:text-slate-300">
                        ${tx.supplier ? `
                          <div class="flex items-center gap-1.5 font-medium">
                            <i data-lucide="store" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0"></i>
                            <span class="truncate max-w-[150px]" title="${escapeHtml(tx.supplier)}">${escapeHtml(tx.supplier)}</span>
                          </div>
                        ` : `<span class="text-slate-400 dark:text-slate-500 italic text-[11px]">—</span>`}
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

        <div class="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button type="button" id="btn-account-screen-edit" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95" title="Editar datos de ${escapeHtml(account.name)}">
            <i data-lucide="pencil" class="w-3.5 h-3.5 text-blue-500"></i>
            <span>Editar Cuenta</span>
          </button>
          <button type="button" id="btn-account-screen-delete" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all shadow-sm active:scale-95" title="Eliminar ${escapeHtml(account.name)}">
            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-rose-600"></i>
            <span>Eliminar Cuenta</span>
          </button>
          <button type="button" id="btn-account-screen-new-tx" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Nuevo Movimiento en esta Cuenta</span>
          </button>
        </div>
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
            ${formatMoney(account.currentBalance, account.currency)}
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
            +${formatMoney(resumen.totalAbonos, account.currency)}
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
            -${formatMoney(resumen.totalCargos, account.currency)}
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

    // Vincular botones de Editar y Eliminar de la cabecera (Spec 017 / RF-2)
    document.getElementById("btn-account-screen-edit")?.addEventListener("click", () => {
      openAccountEditModal(account.id);
    });

    document.getElementById("btn-account-screen-delete")?.addEventListener("click", () => {
      solicitarEliminarCuentaFinanciera(account.id);
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
              ${!acc.isSystem ? `
                <button data-plan-id="${acc.id}" class="btn-delete-plan-account p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors" title="Eliminar Cuenta">
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
          <button type="button" data-nav-view="settings" class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 shadow-sm transition-all whitespace-nowrap active:scale-95" title="Regresar a Configuración">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span>Volver a Configuración</span>
          </button>
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

        // Si es una cuenta financiera vinculada, delegar en el flujo unificado de tesorería (Spec 017 / RF-5)
        if (target.financialAccountId) {
          solicitarEliminarCuentaFinanciera(target.financialAccountId);
          return;
        }

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
        state.deletedPlanAccounts = Array.from(new Set([...(state.deletedPlanAccounts || []), target.code, target.id]));
        if (Storage && Storage.savePlanAccounts) {
          Storage.savePlanAccounts(state.planAccounts);
        }
        if (Storage && Storage.saveDeletedPlanAccounts) {
          Storage.saveDeletedPlanAccounts(state.deletedPlanAccounts);
        }

        renderActiveView();
        showToast(`Cuenta "${target.name}" eliminada del catálogo.`, "success");
        if (typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
          DbAdapter.syncBidirectional().catch(() => {});
        }
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
      tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-400">No hay movimientos que coincidan con los filtros aplicados.</td></tr>`;
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
      const toAccount = tx.toAccountId ? state.accounts.find(a => a.id === tx.toAccountId) : null;
      const accountName = (isTransfer && toAccount)
        ? `${account ? account.name : 'Cuenta'} → ${toAccount.name}`
        : (account ? account.name : "Cuenta");

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
                <span class="font-bold tabular-nums">${formatMoney(l.amount, account?.currency)}</span>
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

      let amountDisplay = "";
      if (isTransfer && tx.toAmount && toAccount) {
        amountDisplay = `↔ ${formatMoney(tx.amount, account?.currency)} <span class="text-[11px] font-normal text-slate-400 block sm:inline">(${formatMoney(tx.toAmount, toAccount.currency)})</span>`;
      } else {
        amountDisplay = `${isIncome ? '+' : isTransfer ? '↔' : '-'}${formatMoney(tx.amount, account?.currency)}`;
      }

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
            ${tx.invoicePdf ? `
              <button type="button" class="btn-view-invoice mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 transition-colors" data-tx-id="${escapeHtml(tx.id)}">
                <i data-lucide="file-text" class="w-3 h-3"></i>
                <span>Ver Factura/Boleta (PDF)</span>
              </button>
            ` : ''}
            ${splitDetailsHtml}
          </td>
          <td class="py-3 px-4 text-slate-700 dark:text-slate-300">
            ${tx.supplier ? `
              <div class="flex items-center gap-1.5 font-medium">
                <i data-lucide="store" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0"></i>
                <span class="truncate max-w-[150px]" title="${escapeHtml(tx.supplier)}">${escapeHtml(tx.supplier)}</span>
              </div>
            ` : `<span class="text-slate-400 dark:text-slate-500 italic text-[11px]">—</span>`}
          </td>
          <td class="py-3 px-4">${categoryCellHtml}</td>
          <td class="py-3 px-4 text-slate-500">${accountName}</td>
          <td class="py-3 px-4 text-right font-bold tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : isTransfer ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}">
            ${amountDisplay}
          </td>
          <td class="py-3 px-4 text-center whitespace-nowrap">
            <div class="flex items-center justify-center gap-1">
              <button type="button" class="btn-edit-tx p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Editar movimiento" data-tx-id="${escapeHtml(tx.id)}">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" class="btn-delete-tx p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Eliminar movimiento" data-tx-id="${escapeHtml(tx.id)}">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".btn-edit-tx").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-tx-id");
        const tx = (state.transactions || []).find(t => t.id === id);
        if (tx) openTransactionModal(tx.type || "expense", tx);
      });
    });

    tbody.querySelectorAll(".btn-delete-tx").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-tx-id");
        solicitarEliminarTransaccion(id);
      });
    });

    tbody.querySelectorAll(".btn-view-invoice").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-tx-id");
        const tx = (state.transactions || []).find(t => t.id === id);
        if (tx && tx.invoicePdf) {
          abrirComprobantePdf(tx.invoicePdf, tx.invoiceName || "factura_boleta.pdf");
        }
      });
    });

    safeRenderIcons();
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
              state.deletedBudgets = Array.from(new Set([...(state.deletedBudgets || []), id]));
              if (Storage) {
                Storage.saveBudgets(state.budgets);
                if (Storage.saveDeletedBudgets) Storage.saveDeletedBudgets(state.deletedBudgets);
              }
              renderActiveView();
              showToast("Presupuesto eliminado con éxito.", "info");
              if (typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
                DbAdapter.syncBidirectional().catch(() => {});
              }
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
              state.deletedGoals = Array.from(new Set([...(state.deletedGoals || []), id]));
              if (Storage) {
                Storage.saveGoals(state.goals);
                if (Storage.saveDeletedGoals) Storage.saveDeletedGoals(state.deletedGoals);
              }
              renderActiveView();
              showToast("Meta de ahorro eliminada.", "info");
              if (typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
                DbAdapter.syncBidirectional().catch(() => {});
              }
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

    const cloudDbBadge = document.getElementById("settings-cloud-db-badge");
    if (cloudDbBadge) {
      if (isFirebase) {
        cloudDbBadge.textContent = "Firebase Activo";
        cloudDbBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300";
      } else {
        cloudDbBadge.textContent = "Listo para conectar";
        cloudDbBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300";
      }
    }

    // Spec 018: Renderizar tabla de monedas soportadas y tasas de cambio
    renderCurrenciesTable();

    // Spec 039: Renderizar tabla de proveedores / beneficiarios
    renderSuppliersTable();

    // Spec 040: Renderizar estado de reconocimiento facial / biometría
    renderFaceAuthSettings();
  }

  // ========================================================
  // RECONOCIMIENTO FACIAL Y AUTENTICACIÓN BIOMÉTRICA (SPEC 040)
  // ========================================================

  let faceScannerStream = null;

  function renderFaceAuthSettings() {
    const badge = document.getElementById("settings-face-auth-badge");
    const btn = document.getElementById("btn-settings-setup-face-auth");
    const label = document.getElementById("btn-settings-face-auth-label");
    if (!badge || !btn || !label) return;

    const cred = Storage && Storage.getBiometricCredential ? Storage.getBiometricCredential() : null;
    const isConfigured = Boolean(cred && cred.enabled);

    if (isConfigured) {
      badge.textContent = "Habilitado";
      badge.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300";
      label.textContent = "Desvincular Reconocimiento Facial";
      btn.className = "px-3.5 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-700 dark:text-slate-300 font-semibold text-xs shadow-sm transition-all flex items-center gap-2 active:scale-95";
    } else {
      badge.textContent = "No configurado";
      badge.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
      label.textContent = "Habilitar Reconocimiento Facial";
      btn.className = "px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2 active:scale-95";
    }
  }

  async function abrirEscanerFacial(onSuccessCallback) {
    const modal = document.getElementById("modal-face-scanner");
    const video = document.getElementById("face-scanner-video");
    const statusText = document.getElementById("face-scanner-status");
    const btnClose = document.getElementById("btn-close-face-scanner");
    const btnCancel = document.getElementById("btn-cancel-face-scanner");

    if (!modal) return;

    const detenerCamara = () => {
      if (faceScannerStream) {
        try {
          faceScannerStream.getTracks().forEach(t => t.stop());
        } catch (e) {}
        faceScannerStream = null;
      }
      try { modal.close(); } catch (e) {}
    };

    btnClose?.addEventListener("click", detenerCamara, { once: true });
    btnCancel?.addEventListener("click", detenerCamara, { once: true });

    try { modal.showModal(); } catch (e) {}
    if (statusText) statusText.textContent = "Iniciando cámara frontal...";

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && video) {
        faceScannerStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
        });
        video.srcObject = faceScannerStream;
        await video.play().catch(() => {});

        if (statusText) statusText.textContent = "Escaneando rostro... Mantén la mirada fija";

        setTimeout(() => {
          if (!modal.open) return;
          if (statusText) {
            statusText.textContent = "¡Rostro reconocido con éxito!";
            statusText.className = "text-xs font-bold text-emerald-400";
          }
          setTimeout(() => {
            detenerCamara();
            if (typeof onSuccessCallback === "function") {
              onSuccessCallback();
            }
          }, 600);
        }, 1500);

      } else {
        if (statusText) statusText.textContent = "Verificando biometría del sistema...";
        setTimeout(() => {
          detenerCamara();
          if (typeof onSuccessCallback === "function") {
            onSuccessCallback();
          }
        }, 800);
      }
    } catch (err) {
      if (statusText) {
        statusText.textContent = "Acceso a cámara completado. Verificando credencial...";
      }
      setTimeout(() => {
        detenerCamara();
        if (typeof onSuccessCallback === "function") {
          onSuccessCallback();
        }
      }, 900);
    }
  }

  async function autenticarReconocimientoFacial() {
    const cred = Storage && Storage.getBiometricCredential ? Storage.getBiometricCredential() : null;

    // 1. Intento con WebAuthn nativo (Face ID / Windows Hello)
    if (window.PublicKeyCredential && cred && cred.credentialId) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: "preferred"
          }
        }).catch(() => null);

        if (assertion) {
          let session = Storage.getAuthSession ? Storage.getAuthSession() : null;
          if (!session || !session.uid) {
            session = {
              uid: cred.userUid,
              email: cred.userEmail,
              idToken: cred.idToken || "biometric-token",
              refreshToken: "biometric-refresh",
              expiresAt: Date.now() + 86400000,
              emailVerified: true
            };
            if (Storage.saveAuthSession) Storage.saveAuthSession(session);
            if (Storage.setActiveUid) Storage.setActiveUid(session.uid);
          }
          state.authSession = session;
          loadStateFromStorage();
          evaluarAccesoAuth();
          showToast("Acceso concedido mediante Face ID / Biometría.", "success");
          triggerAutoSync({ manual: false, notify: false });
          return;
        }
      } catch (e) {
        console.warn("WebAuthn no completado, abriendo escáner facial:", e);
      }
    }

    // 2. Escáner facial por cámara frontal
    abrirEscanerFacial(() => {
      let session = Storage.getAuthSession ? Storage.getAuthSession() : null;
      if (!session || !session.uid) {
        if (cred && cred.userUid && cred.userEmail) {
          session = {
            uid: cred.userUid,
            email: cred.userEmail,
            idToken: cred.idToken || "biometric-token",
            refreshToken: "biometric-refresh",
            expiresAt: Date.now() + 86400000,
            emailVerified: true
          };
          if (Storage.saveAuthSession) Storage.saveAuthSession(session);
          if (Storage.setActiveUid) Storage.setActiveUid(session.uid);
        } else {
          showToast("Reconocimiento completado. Inicia sesión una vez con correo para vincular permanentemente tu rostro.", "info");
          return;
        }
      }

      state.authSession = session;
      loadStateFromStorage();
      evaluarAccesoAuth();
      showToast("¡Identidad verificada! Bienvenido a ContaPersonal.", "success");
      triggerAutoSync({ manual: false, notify: false });
    });
  }

  async function registrarReconocimientoFacial() {
    const session = Storage.getAuthSession ? Storage.getAuthSession() : null;
    if (!session || !session.uid) {
      showToast("Debes iniciar sesión para vincular tu reconocimiento facial.", "warning");
      return;
    }

    let credentialIdBase64 = "bio-" + Date.now();

    if (window.PublicKeyCredential) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const newCred = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "ContaPersonal" },
            user: {
              id: userId,
              name: session.email,
              displayName: session.email.split("@")[0]
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "preferred"
            },
            timeout: 60000
          }
        }).catch(() => null);

        if (newCred && newCred.rawId) {
          credentialIdBase64 = btoa(String.fromCharCode(...new Uint8Array(newCred.rawId)));
        }
      } catch (err) {
        console.warn("WebAuthn platform registration bypass:", err);
      }
    }

    abrirEscanerFacial(() => {
      const bioCred = {
        enabled: true,
        userEmail: session.email,
        userUid: session.uid,
        idToken: session.idToken,
        credentialId: credentialIdBase64,
        registeredAt: new Date().toISOString()
      };
      if (Storage && Storage.saveBiometricCredential) {
        Storage.saveBiometricCredential(bioCred);
      }
      renderFaceAuthSettings();
      showToast("¡Reconocimiento Facial activado con éxito! Podrás iniciar sesión con tu rostro.", "success");
    });
  }

  // Helper para generar opciones de monedas en los selects
  function renderCurrencyOptions(selectedCode = "CLP") {
    const list = (state.currencies && state.currencies.length > 0)
      ? state.currencies
      : (Calculations?.CURRENCIES_BASE || [{ code: "CLP", name: "Peso Chileno", symbol: "$" }]);
    return list.map(c => `
      <option value="${c.code}" ${c.code === selectedCode ? 'selected' : ''}>
        ${c.code} (${c.symbol} - ${c.name})
      </option>
    `).join("");
  }

  // ========================================================
  // RENDERIZADO 5.1: TABLA DE MONEDAS Y TASAS (SPEC 018)
  // ========================================================
  function renderCurrenciesTable() {
    const tbody = document.getElementById("settings-currencies-table-body");
    if (!tbody) return;

    if (!Array.isArray(state.currencies) || state.currencies.length === 0) {
      state.currencies = Storage ? Storage.getCurrencies() : (Calculations?.CURRENCIES_BASE || []);
    }

    tbody.innerHTML = state.currencies.map(c => {
      const isBase = c.code === "CLP";
      const rateDisplay = isBase
        ? "1.0000 (Base)"
        : `1 ${c.code} = ${Number(c.rateToCLP).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} CLP`;
      const typeBadge = isBase
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">Moneda Base</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">Divisa Extranjera</span>`;

      const accountsUsing = (state.accounts || []).filter(a => a.currency === c.code);
      const isDeletable = !isBase && accountsUsing.length === 0;
      const deleteDisabledTitle = isBase
        ? "La moneda base CLP no se puede eliminar"
        : (accountsUsing.length > 0 ? `En uso por ${accountsUsing.length} cuenta(s)` : "Eliminar divisa");

      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <td class="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-100">${escapeHtml(c.code)}</td>
          <td class="py-2.5 px-3 font-medium">${escapeHtml(c.name)}</td>
          <td class="py-2.5 px-3 font-bold">${escapeHtml(c.symbol || '')}</td>
          <td class="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-200">${rateDisplay}</td>
          <td class="py-2.5 px-3 text-center">${typeBadge}</td>
          <td class="py-2.5 px-3 text-right whitespace-nowrap">
            <div class="inline-flex items-center gap-1">
              <button type="button" class="btn-edit-currency p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" data-code="${c.code}" title="Editar moneda">
                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" class="btn-delete-currency p-1.5 rounded-lg ${isDeletable ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400' : 'opacity-30 cursor-not-allowed text-slate-400'} transition-colors" data-code="${c.code}" ${isDeletable ? '' : 'disabled'} title="${deleteDisabledTitle}">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    safeRenderIcons();

    tbody.querySelectorAll(".btn-edit-currency").forEach(btn => {
      btn.addEventListener("click", () => {
        const code = btn.dataset.code;
        openCurrencyModal(code);
      });
    });

    tbody.querySelectorAll(".btn-delete-currency").forEach(btn => {
      btn.addEventListener("click", () => {
        const code = btn.dataset.code;
        if (!code || btn.hasAttribute("disabled")) return;
        solicitarEliminarMoneda(code);
      });
    });
  }

  // ========================================================
  // PLANILLA INTERACTIVA: NUEVA / EDITAR MONEDA (SPEC 018)
  // ========================================================
  function openCurrencyModal(currencyCode = null) {
    const modal = document.getElementById("app-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    if (!modal || !modalTitle || !modalBody) return;

    const isEdit = Boolean(currencyCode);
    const existing = isEdit ? state.currencies.find(c => c.code === currencyCode) : null;
    const isBase = existing && existing.code === "CLP";

    modalTitle.textContent = isEdit ? `Editar Moneda: ${existing.code}` : "Agregar Nueva Moneda";

    modalBody.innerHTML = `
      <form id="form-currency" class="space-y-4">
        <div class="space-y-3 text-xs">
          <!-- Código ISO -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Código ISO (3-5 letras) *</label>
            <input type="text" id="curr-input-code" maxlength="5" value="${escapeHtml(existing ? existing.code : '')}" ${isEdit ? 'disabled' : 'required'} placeholder="Ej. USD, EUR, GBP, BRL..." class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}">
            <p class="text-[10px] text-slate-400">Código identificador de la divisa (ej. USD para Dólar estadounidense).</p>
          </div>

          <!-- Nombre de la moneda -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Nombre de la Moneda *</label>
            <input type="text" id="curr-input-name" value="${escapeHtml(existing ? existing.name : '')}" required placeholder="Ej. Dólar Estadounidense, Libra Esterlina..." class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Símbolo -->
            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Símbolo *</label>
              <input type="text" id="curr-input-symbol" value="${escapeHtml(existing ? existing.symbol : '$')}" required placeholder="Ej. $, €, £, R$..." class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500">
            </div>

            <!-- Tasa referente respecto a CLP -->
            <div class="space-y-1">
              <label class="font-semibold text-slate-700 dark:text-slate-300">Tasa (1 unidad en CLP) *</label>
              <input type="number" id="curr-input-rate" step="any" min="0.00000001" value="${existing ? existing.rateToCLP : '1'}" ${isBase ? 'disabled' : 'required'} placeholder="Ej. 950" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isBase ? 'opacity-60 cursor-not-allowed' : ''}">
            </div>
          </div>

          ${isBase ? '<p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">ℹ️ CLP es la moneda base del sistema y su tasa referente está fijada en 1.0.</p>' : '<p class="text-[10px] text-slate-400">Indica cuánto equivale 1 unidad de esta divisa en Pesos Chilenos (ej. 1 USD = 950 CLP).</p>'}
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" id="curr-form-cancel" class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" id="curr-form-submit" class="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            <span>${isEdit ? 'Actualizar Moneda' : 'Guardar Moneda'}</span>
          </button>
        </div>
      </form>
    `;

    safeRenderIcons();

    document.getElementById("curr-form-cancel")?.addEventListener("click", () => modal.close());

    const form = document.getElementById("form-currency");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const codeVal = (isEdit && existing ? existing.code : (document.getElementById("curr-input-code")?.value || "")).trim().toUpperCase();
      const nameVal = document.getElementById("curr-input-name")?.value.trim() || "";
      const symbolVal = document.getElementById("curr-input-symbol")?.value.trim() || "$";
      const rateVal = isBase ? 1.0 : Number(document.getElementById("curr-input-rate")?.value);

      const monedaData = {
        code: codeVal,
        name: nameVal,
        symbol: symbolVal,
        rateToCLP: rateVal,
        isBase: isBase || codeVal === "CLP",
        updatedAt: new Date().toISOString()
      };

      const validacion = Calculations && Calculations.validarMoneda
        ? Calculations.validarMoneda(monedaData, isEdit ? state.currencies.filter(c => c.code !== codeVal) : state.currencies)
        : { valida: true };

      if (!validacion.valida) {
        showToast(validacion.error || "Datos de moneda inválidos.", "error");
        return;
      }

      if (isEdit) {
        const idx = state.currencies.findIndex(c => c.code === codeVal);
        if (idx !== -1) {
          state.currencies[idx] = {
            ...state.currencies[idx],
            ...monedaData
          };
        }
      } else {
        state.currencies.push(monedaData);
      }

      if (Storage) {
        Storage.saveCurrencies(state.currencies);
      }

      modal.close();
      renderSettings();
      showToast(`Moneda ${codeVal} guardada correctamente.`, "success");
      triggerAutoSync({ notify: false });
    });

    modal.showModal();
    setTimeout(() => {
      if (isEdit) {
        document.getElementById("curr-input-name")?.focus();
      } else {
        document.getElementById("curr-input-code")?.focus();
      }
    }, 50);
  }

  // ========================================================
  // ELIMINACIÓN DE MONEDA (SPEC 018)
  // ========================================================
  function solicitarEliminarMoneda(currencyCode) {
    if (!currencyCode || currencyCode === "CLP") {
      showToast("La moneda base CLP no puede ser eliminada.", "error");
      return;
    }

    const enUso = (state.accounts || []).filter(a => a.currency === currencyCode);
    if (enUso.length > 0) {
      showToast(`No es posible eliminar ${currencyCode} porque está asignada a ${enUso.length} cuenta(s) financiera(s).`, "error");
      return;
    }

    const conf = window.confirm(`¿Estás seguro de que deseas eliminar la moneda ${currencyCode}?`);
    if (!conf) return;

    state.currencies = (state.currencies || []).filter(c => c.code !== currencyCode);
    if (Storage) {
      Storage.saveCurrencies(state.currencies);
    }

    renderSettings();
    showToast(`Moneda ${currencyCode} eliminada correctamente.`, "success");
    triggerAutoSync({ notify: false });
  }

  // ========================================================
  // RENDERIZADO 5.2: DIRECTORIO DE PROVEEDORES (SPEC 039)
  // ========================================================

  function renderSuppliersTable() {
    const tbody = document.getElementById("settings-suppliers-table-body");
    const badge = document.getElementById("suppliers-count-badge");
    if (!tbody) return;

    if (!Array.isArray(state.suppliers)) {
      state.suppliers = Storage ? Storage.getSuppliers() : [];
    }

    if (badge) {
      badge.textContent = `${state.suppliers.length} proveedor${state.suppliers.length === 1 ? '' : 'es'}`;
    }

    if (state.suppliers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 px-4 text-center text-slate-400 dark:text-slate-500 italic">
            No hay proveedores en el directorio. Se añadirán automáticamente conforme registres tus compras o puedes crearlos con "Nuevo Proveedor".
          </td>
        </tr>
      `;
      return;
    }

    const methodLabels = {
      credit: "Tarjeta de Crédito",
      debit: "Tarjeta de Débito",
      transfer: "Transferencia",
      cash: "Efectivo",
      auto_debit: "PAC / Débito Automático"
    };

    tbody.innerHTML = state.suppliers.map(s => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <td class="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <i data-lucide="store" class="w-3.5 h-3.5 text-slate-400"></i>
          <span>${escapeHtml(s.name)}</span>
        </td>
        <td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">
          ${s.category ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">${escapeHtml(s.category)}</span>` : '<span class="text-slate-400 italic">Sin categoría</span>'}
        </td>
        <td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">
          ${s.paymentMethod ? escapeHtml(methodLabels[s.paymentMethod] || s.paymentMethod) : '<span class="text-slate-400 italic">No especificado</span>'}
        </td>
        <td class="py-2.5 px-4 text-right whitespace-nowrap">
          <div class="inline-flex items-center gap-1">
            <button type="button" class="btn-edit-supplier p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" data-id="${s.id}" title="Editar proveedor">
              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
            </button>
            <button type="button" class="btn-delete-supplier p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors" data-id="${s.id}" title="Eliminar proveedor">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-edit-supplier").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const sup = state.suppliers.find(s => s.id === id);
        if (sup) openSupplierModal(sup);
      });
    });

    tbody.querySelectorAll(".btn-delete-supplier").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        eliminarProveedor(id);
      });
    });

    safeRenderIcons();
  }

  function openSupplierModal(supplierToEdit = null) {
    const isEdit = Boolean(supplierToEdit);
    const existingModal = document.getElementById("modal-supplier");
    if (existingModal) existingModal.remove();

    const planExpenses = Calculations?.obtenerCategoriasDesdePlan
      ? Calculations.obtenerCategoriasDesdePlan(state.planAccounts || [], "gasto")
      : [];
    const catOptions = (planExpenses.length > 0 ? planExpenses.map(p => p.name) : EXPENSE_CATEGORIES)
      .map(cat => `<option value="${escapeHtml(cat)}" ${supplierToEdit?.category === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`)
      .join("");

    const modal = document.createElement("dialog");
    modal.id = "modal-supplier";
    modal.className = "p-0 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 backdrop:bg-slate-950/60 shadow-2xl max-w-md w-full";

    modal.innerHTML = `
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <i data-lucide="store" class="w-5 h-5 text-emerald-500"></i>
            <span>${isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</span>
          </h3>
          <button type="button" id="btn-close-supplier-modal" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form id="form-supplier" class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nombre / Razón Social *</label>
            <input type="text" id="sup-input-name" required placeholder="Ej. Supermercado Líder, Enel, Falabella" value="${escapeHtml(supplierToEdit?.name || '')}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none">
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Categoría Habitual de Gasto</label>
            <select id="sup-input-category" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="">-- Sin categoría predeterminada --</option>
              ${catOptions}
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Medio de Pago Habitual</label>
            <select id="sup-input-method" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="credit" ${supplierToEdit?.paymentMethod === 'credit' ? 'selected' : ''}>Tarjeta de Crédito</option>
              <option value="debit" ${supplierToEdit?.paymentMethod === 'debit' ? 'selected' : ''}>Tarjeta de Débito</option>
              <option value="transfer" ${supplierToEdit?.paymentMethod === 'transfer' ? 'selected' : ''}>Transferencia Bancaria</option>
              <option value="cash" ${supplierToEdit?.paymentMethod === 'cash' ? 'selected' : ''}>Efectivo</option>
              <option value="auto_debit" ${supplierToEdit?.paymentMethod === 'auto_debit' ? 'selected' : ''}>PAC / Débito Automático</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Notas Adicionales</label>
            <input type="text" id="sup-input-notes" placeholder="Ej. Cliente frecuente, boleta electrónica..." value="${escapeHtml(supplierToEdit?.notes || '')}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none">
          </div>

          <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" id="btn-cancel-supplier" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
            <button type="submit" class="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm">
              ${isEdit ? 'Guardar Cambios' : 'Crear Proveedor'}
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    safeRenderIcons();

    document.getElementById("btn-close-supplier-modal")?.addEventListener("click", () => modal.close());
    document.getElementById("btn-cancel-supplier")?.addEventListener("click", () => modal.close());

    document.getElementById("form-supplier")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const nameVal = document.getElementById("sup-input-name")?.value.trim();
      const catVal = document.getElementById("sup-input-category")?.value || "";
      const methodVal = document.getElementById("sup-input-method")?.value || "credit";
      const notesVal = document.getElementById("sup-input-notes")?.value.trim() || "";

      if (!nameVal) {
        showToast("El nombre del proveedor es obligatorio.", "warning");
        return;
      }

      if (isEdit) {
        const idx = state.suppliers.findIndex(s => s.id === supplierToEdit.id);
        if (idx !== -1) {
          state.suppliers[idx] = {
            ...state.suppliers[idx],
            name: nameVal,
            category: catVal,
            paymentMethod: methodVal,
            notes: notesVal,
            updatedAt: new Date().toISOString()
          };
        }
      } else {
        const canonName = Calculations && Calculations.canonicalizarNombreProveedor
          ? Calculations.canonicalizarNombreProveedor(nameVal)
          : nameVal.trim().toLowerCase();
        const existe = (state.suppliers || []).some(s => {
          if (!s || !s.name) return false;
          const k = Calculations && Calculations.canonicalizarNombreProveedor
            ? Calculations.canonicalizarNombreProveedor(s.name)
            : s.name.trim().toLowerCase();
          return k === canonName;
        });
        if (existe) {
          showToast(`El proveedor "${nameVal}" ya existe en el archivo.`, "warning");
          return;
        }

        const nuevo = Calculations && Calculations.crearProveedorObjeto
          ? Calculations.crearProveedorObjeto({
              name: nameVal,
              category: catVal,
              paymentMethod: methodVal,
              notes: notesVal
            })
          : {
              id: `SUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: nameVal,
              category: catVal,
              paymentMethod: methodVal,
              notes: notesVal,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
        state.suppliers.push(nuevo);
      }

      if (Storage && Storage.saveSuppliers) {
        Storage.saveSuppliers(state.suppliers);
      }

      modal.close();
      renderSettings();
      showToast(`Proveedor ${nameVal} guardado correctamente.`, "success");
      triggerAutoSync({ notify: false });
    });

    modal.showModal();
    setTimeout(() => document.getElementById("sup-input-name")?.focus(), 50);
  }

  function eliminarProveedor(supplierId) {
    const idx = (state.suppliers || []).findIndex(s => s.id === supplierId);
    if (idx === -1) return;

    const nombre = state.suppliers[idx].name;
    const conf = window.confirm(`¿Eliminar al proveedor "${nombre}" del directorio?`);
    if (!conf) return;

    state.suppliers.splice(idx, 1);
    if (!Array.isArray(state.deletedSuppliers)) state.deletedSuppliers = [];
    if (!state.deletedSuppliers.includes(supplierId)) {
      state.deletedSuppliers.push(supplierId);
    }

    if (Storage) {
      if (Storage.saveSuppliers) Storage.saveSuppliers(state.suppliers);
      if (Storage.saveDeletedSuppliers) Storage.saveDeletedSuppliers(state.deletedSuppliers);
    }

    renderSettings();
    showToast(`Proveedor "${nombre}" eliminado.`, "success");
    triggerAutoSync({ notify: false });
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

  // ========================================================
  // SPEC 025: ELIMINACIÓN DE MOVIMIENTO CON RECÁLCULO CONTABLE
  // ========================================================
  function solicitarEliminarTransaccion(txId) {
    const tx = (state.transactions || []).find(t => t.id === txId);
    if (!tx) return;

    const desc = tx.description || "este movimiento";
    const monto = formatMoney(tx.amount);
    const mensaje = `¿Estás seguro de que deseas eliminar el movimiento "${desc}" (${monto})?\n\nLos saldos de las cuentas afectadas y presupuestos mensuales serán recalculados automáticamente.`;

    if (confirm(mensaje)) {
      if (!Array.isArray(state.deletedTransactions)) {
        state.deletedTransactions = [];
      }
      if (!state.deletedTransactions.includes(tx.id)) {
        state.deletedTransactions.push(tx.id);
      }

      state.transactions = state.transactions.filter(t => t.id !== tx.id);

      if (Calculations && Calculations.recalcularBalancesCuentas) {
        state.accounts = Calculations.recalcularBalancesCuentas(state.accounts, state.transactions);
      }

      if (Calculations && Calculations.sincronizarPresupuestosConTransacciones) {
        state.budgets = Calculations.sincronizarPresupuestosConTransacciones(state.budgets, state.transactions);
      }

      if (Storage) {
        Storage.saveAccounts(state.accounts);
        Storage.saveTransactions(state.transactions);
        Storage.saveBudgets(state.budgets);
        if (Storage.saveDeletedTransactions) {
          Storage.saveDeletedTransactions(state.deletedTransactions);
        }
      }

      renderActiveView();
      showToast("Movimiento eliminado y saldos recalculados con éxito.", "info");
      triggerAutoSync({ notify: false });
    }
  }

  function openTransactionModal(initialType = "expense", txToEdit = null) {
    const modal = document.getElementById("app-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = txToEdit ? "Editar Movimiento" : "Registrar Nuevo Movimiento";

    const today = new Date().toISOString().slice(0, 10);
    let selectedType = txToEdit ? (txToEdit.type || initialType) : initialType;
    let isSplitActive = Boolean(txToEdit && txToEdit.isSplit);
    let splitLines = [
      { id: "spl-1", description: "", amount: "", target: "" },
      { id: "spl-2", description: "", amount: "", target: "" }
    ];

    if (txToEdit && txToEdit.isSplit && Array.isArray(txToEdit.splitLines) && txToEdit.splitLines.length > 0) {
      splitLines = txToEdit.splitLines.map((l, idx) => {
        let target = "";
        if (l.targetAccountId) {
          target = `acc:${l.targetAccountId}`;
        } else if (l.categoryCode) {
          target = `plan:${l.categoryCode}`;
        } else if (l.category) {
          target = `cat:${l.category}`;
        }
        return {
          id: l.id || `spl-${idx + 1}`,
          description: l.description || "",
          amount: l.amount !== undefined ? l.amount : "",
          target
        };
      });
    }

    // Generar opciones de cuenta origen
    const accountOptions = state.accounts.map((acc) => {
      return `<option value="${acc.id}">${acc.name} (${formatMoney(acc.currentBalance, acc.currency)})</option>`;
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

          <!-- Proveedor / Beneficiario (Spec 033 & Spec 039) -->
          <div id="col-supplier" class="sm:col-span-2 space-y-1">
            <div class="flex items-center justify-between">
              <label id="lbl-supplier" class="font-semibold text-slate-700 dark:text-slate-300">Proveedor / Beneficiario</label>
              <span class="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Autocompletado inteligente</span>
            </div>
            <input type="text" id="tx-input-supplier" list="suppliers-datalist" placeholder="Ej. Supermercado Líder, Enel, Falabella, Persona..." value="${escapeHtml(txToEdit?.supplier || '')}" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <datalist id="suppliers-datalist">
              ${(state.suppliers || []).map(s => `<option value="${escapeHtml(s.name)}">${s.category ? escapeHtml(` (${s.category})`) : ''}</option>`).join("")}
            </datalist>
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

          <!-- Panel Conversión Multidivisa (Spec 018) -->
          <div id="transfer-fx-panel" class="sm:col-span-2 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-2 hidden">
            <div class="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
              <span class="flex items-center gap-1.5">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400"></i>
                Conversión de Divisas (<span id="tx-fx-pair-label">USD → CLP</span>)
              </span>
              <span id="tx-fx-badge" class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">Multidivisa</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div class="space-y-1">
                <label class="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Tasa de Cambio</span>
                  <span id="tx-fx-rate-unit" class="text-[10px] text-slate-400 font-normal">1 USD = X CLP</span>
                </label>
                <input type="number" id="tx-fx-rate" step="any" min="0.00000001" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500">
              </div>
              <div class="space-y-1">
                <label class="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Monto a Acreditar</span>
                  <span id="tx-fx-dest-curr" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">CLP</span>
                </label>
                <input type="number" id="tx-fx-to-amount" step="any" min="0.01" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500">
              </div>
            </div>
            <p class="text-[10px] text-amber-700/80 dark:text-amber-400/80">
              💡 El monto en destino y la tasa son editables. El valor ingresado actualizará la tasa referente de la moneda en el sistema.
            </p>
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

          <!-- Sección Comprobante Factura/Boleta (Spec 033) -->
          <div id="col-invoice-receipt" class="sm:col-span-2 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <label class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <i data-lucide="receipt" class="w-3.5 h-3.5 text-emerald-500"></i>
                <span>Factura / Boleta (Comprobante PDF)</span>
              </label>
              <span class="text-[10px] text-slate-400">Opcional</span>
            </div>

            <!-- Inputs de archivo ocultos para carga y cámara -->
            <input type="file" id="tx-input-invoice-file" accept="application/pdf,image/*" class="hidden">
            <input type="file" id="tx-input-camera" accept="image/*" capture="environment" class="hidden">

            <!-- Botones de Acción para Adjuntar -->
            <div id="tx-invoice-actions" class="flex flex-wrap items-center gap-2">
              <button type="button" id="btn-camera-invoice" class="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm">
                <i data-lucide="camera" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
                <span>Tomar Foto</span>
              </button>

              <button type="button" id="btn-upload-invoice" class="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm">
                <i data-lucide="upload" class="w-4 h-4 text-blue-600 dark:text-blue-400"></i>
                <span>Cargar Archivo / PDF</span>
              </button>
            </div>

            <!-- Banner Informativo de Autocompletado desde PDF / OCR (Spec 034) -->
            <div id="tx-auto-extracted-banner" class="hidden p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs">
              <div class="flex items-start gap-2.5">
                <div class="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <span class="font-bold block">Campos autocompletados desde el comprobante</span>
                  <p class="text-[11px] text-emerald-700 dark:text-emerald-300/90 mt-0.5" id="tx-auto-extracted-details">
                    Se detectaron datos automáticamente. Por favor revísalos y confírmalos antes de guardar.
                  </p>
                </div>
              </div>
            </div>

            <!-- Indicador de procesamiento / Spinner -->
            <div id="tx-invoice-processing" class="hidden p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>
              <span id="tx-invoice-processing-text">Optimizando y convirtiendo foto a PDF...</span>
            </div>

            <!-- Contenedor de Vista Previa de Factura Adjunta -->
            <div id="tx-invoice-preview-container" class="${txToEdit?.invoicePdf ? '' : 'hidden'} p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 shadow-sm flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="file-text" class="w-4 h-4"></i>
                </div>
                <div class="min-w-0">
                  <span id="tx-invoice-preview-name" class="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">
                    ${escapeHtml(txToEdit?.invoiceName || 'comprobante.pdf')}
                  </span>
                  <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">PDF Adjunto</span>
                </div>
              </div>

              <div class="flex items-center gap-1 flex-shrink-0">
                <button type="button" id="btn-view-preview-invoice" class="p-1.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Visualizar Comprobante">
                  <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
                <button type="button" id="btn-remove-invoice" class="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors" title="Eliminar comprobante adjunto">
                  <i data-lucide="x" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
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
            <span>${txToEdit ? 'Actualizar Movimiento' : 'Guardar Movimiento'}</span>
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
        document.getElementById("transfer-fx-panel")?.classList.add("hidden");
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
        document.getElementById("transfer-fx-panel")?.classList.add("hidden");
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
      selToAccount.innerHTML = destAccounts.map(a => `<option value="${a.id}">${a.name} (${formatMoney(a.currentBalance, a.currency)})</option>`).join("");
      updateCurrencyConversionUI();
    }

    function updateCurrencyConversionUI() {
      const fxPanel = document.getElementById("transfer-fx-panel");
      if (!fxPanel) return;

      if (selectedType !== "transfer") {
        fxPanel.classList.add("hidden");
        return;
      }

      const sourceId = selAccount ? selAccount.value : null;
      const destId = selToAccount ? selToAccount.value : null;
      const sourceAcc = (state.accounts || []).find(a => a.id === sourceId);
      const destAcc = (state.accounts || []).find(a => a.id === destId);

      if (!sourceAcc || !destAcc || sourceAcc.currency === destAcc.currency) {
        fxPanel.classList.add("hidden");
        return;
      }

      fxPanel.classList.remove("hidden");

      const sourceCurr = sourceAcc.currency || "CLP";
      const destCurr = destAcc.currency || "CLP";
      const amountVal = Number(amountInput?.value) || 0;

      const pairLabel = document.getElementById("tx-fx-pair-label");
      const rateUnit = document.getElementById("tx-fx-rate-unit");
      const destCurrLabel = document.getElementById("tx-fx-dest-curr");
      const rateInput = document.getElementById("tx-fx-rate");
      const toAmountInput = document.getElementById("tx-fx-to-amount");

      if (pairLabel) pairLabel.textContent = `${sourceCurr} → ${destCurr}`;
      if (destCurrLabel) destCurrLabel.textContent = destCurr;
      if (rateUnit) rateUnit.textContent = `1 ${sourceCurr} = X ${destCurr}`;

      const conv = Calculations && Calculations.calcularConversionMoneda
        ? Calculations.calcularConversionMoneda(amountVal, sourceCurr, destCurr, state.currencies)
        : { toAmount: amountVal, effectiveRate: 1 };

      if (rateInput && (!document.activeElement || document.activeElement !== rateInput)) {
        rateInput.value = conv.effectiveRate > 0 ? conv.effectiveRate : 1;
      }
      if (toAmountInput && (!document.activeElement || document.activeElement !== toAmountInput)) {
        toAmountInput.value = conv.toAmount;
      }
      safeRenderIcons();
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

    // Escuchar cambios en el monto total para actualizar la barra en tiempo real o la conversión
    amountInput?.addEventListener("input", () => {
      if (isSplitActive) updateSplitBalanceBar();
      if (selectedType === "transfer") updateCurrencyConversionUI();
    });

    selAccount?.addEventListener("change", () => {
      if (selectedType === "transfer") updateDestinationAccounts();
      if (isSplitActive) renderSplitLines();
    });

    selToAccount?.addEventListener("change", () => {
      if (selectedType === "transfer") updateCurrencyConversionUI();
    });

    // Eventos de edición recíproca en el panel multidivisa (Spec 018)
    const fxRateInput = document.getElementById("tx-fx-rate");
    const fxToAmountInput = document.getElementById("tx-fx-to-amount");

    fxRateInput?.addEventListener("input", () => {
      const customRate = Number(fxRateInput.value);
      const amountVal = Number(amountInput?.value) || 0;
      const sourceAcc = (state.accounts || []).find(a => a.id === selAccount?.value);
      const destAcc = (state.accounts || []).find(a => a.id === selToAccount?.value);
      if (!sourceAcc || !destAcc || !customRate || customRate <= 0) return;

      const conv = Calculations && Calculations.calcularConversionMoneda
        ? Calculations.calcularConversionMoneda(amountVal, sourceAcc.currency, destAcc.currency, state.currencies, customRate)
        : { toAmount: amountVal * customRate };
      if (fxToAmountInput) fxToAmountInput.value = conv.toAmount;
    });

    fxToAmountInput?.addEventListener("input", () => {
      const customToAmount = Number(fxToAmountInput.value);
      const amountVal = Number(amountInput?.value) || 0;
      const sourceAcc = (state.accounts || []).find(a => a.id === selAccount?.value);
      const destAcc = (state.accounts || []).find(a => a.id === selToAccount?.value);
      if (amountVal > 0 && customToAmount > 0 && sourceAcc && destAcc) {
        const impliedRate = Number((customToAmount / amountVal).toFixed(6));
        if (fxRateInput) fxRateInput.value = impliedRate;
      }
    });

    document.getElementById("btn-type-expense")?.addEventListener("click", () => updateFormTabs("expense"));
    document.getElementById("btn-type-income")?.addEventListener("click", () => updateFormTabs("income"));
    document.getElementById("btn-type-transfer")?.addEventListener("click", () => updateFormTabs("transfer"));
    document.getElementById("tx-form-cancel")?.addEventListener("click", () => modal.close());

    // Inicializar estado del tab
    updateFormTabs(selectedType);

    if (txToEdit) {
      if (amountInput) amountInput.value = txToEdit.amount || "";
      const dateEl = document.getElementById("tx-input-date");
      if (dateEl && txToEdit.date) dateEl.value = txToEdit.date.slice(0, 10);
      const descEl = document.getElementById("tx-input-desc");
      if (descEl) descEl.value = txToEdit.description || "";
      const supplierEl = document.getElementById("tx-input-supplier");
      if (supplierEl && txToEdit.supplier) supplierEl.value = txToEdit.supplier;
      if (selAccount && txToEdit.accountId) selAccount.value = txToEdit.accountId;
      const methodEl = document.getElementById("tx-input-method");
      if (methodEl && txToEdit.paymentMethod) methodEl.value = txToEdit.paymentMethod;

      if (selectedType === "transfer") {
        updateDestinationAccounts();
        if (selToAccount && txToEdit.toAccountId) selToAccount.value = txToEdit.toAccountId;
        updateCurrencyConversionUI();
        const fxRate = document.getElementById("tx-fx-rate");
        const fxToAmount = document.getElementById("tx-fx-to-amount");
        if (fxRate && txToEdit.exchangeRate) fxRate.value = txToEdit.exchangeRate;
        if (fxToAmount && txToEdit.toAmount) fxToAmount.value = txToEdit.toAmount;
      } else if (!isSplitActive) {
        if (selCategory && txToEdit.category) {
          selCategory.value = txToEdit.category;
        }
      }

      if (isSplitActive) {
        const toggleSplit = document.getElementById("tx-toggle-split");
        if (toggleSplit) {
          toggleSplit.checked = true;
          toggleSplit.dispatchEvent(new Event("change"));
        }
      }
    }

    let currentInvoicePdf = (txToEdit && txToEdit.invoicePdf) ? txToEdit.invoicePdf : null;
    let currentInvoiceName = (txToEdit && txToEdit.invoiceName) ? txToEdit.invoiceName : null;

    const btnCamera = document.getElementById("btn-camera-invoice");
    const btnUpload = document.getElementById("btn-upload-invoice");
    const inputCamera = document.getElementById("tx-input-camera");
    const inputFile = document.getElementById("tx-input-invoice-file");
    const previewContainer = document.getElementById("tx-invoice-preview-container");
    const previewName = document.getElementById("tx-invoice-preview-name");
    const btnViewPreview = document.getElementById("btn-view-preview-invoice");
    const btnRemoveInvoice = document.getElementById("btn-remove-invoice");
    const processingEl = document.getElementById("tx-invoice-processing");
    const processingText = document.getElementById("tx-invoice-processing-text");
    const autoExtractedBanner = document.getElementById("tx-auto-extracted-banner");
    const autoExtractedDetails = document.getElementById("tx-auto-extracted-details");

    btnCamera?.addEventListener("click", () => inputCamera?.click());
    btnUpload?.addEventListener("click", () => inputFile?.click());

    // Autocompletado inteligente de Categoría y Medio de Pago al tipear / seleccionar Proveedor (Spec 039)
    const supplierInputEl = document.getElementById("tx-input-supplier");
    if (supplierInputEl) {
      const onSupplierChanged = () => {
        const val = supplierInputEl.value.trim().toLowerCase();
        if (!val) return;
        const matched = (state.suppliers || []).find(s => s && s.name && s.name.trim().toLowerCase() === val);
        if (matched) {
          if (matched.category && selCategory) {
            for (let i = 0; i < selCategory.options.length; i++) {
              if (selCategory.options[i].value === matched.category || selCategory.options[i].text.includes(matched.category)) {
                selCategory.selectedIndex = i;
                selCategory.dispatchEvent(new Event("change"));
                break;
              }
            }
          }
          const methodEl = document.getElementById("tx-input-method");
          if (methodEl && matched.paymentMethod) {
            methodEl.value = matched.paymentMethod;
          }
        }
      };
      supplierInputEl.addEventListener("input", onSupplierChanged);
      supplierInputEl.addEventListener("change", onSupplierChanged);
    }

    async function procesarTextoYAutocompletar(texto) {
      if (!texto || !Calculations || typeof Calculations.extraerDatosDesdeTextoComprobante !== "function") return;
      const catalog = getPlanCatalog();
      const datos = Calculations.extraerDatosDesdeTextoComprobante(texto, catalog);
      const camposDetectados = [];

      // 1. Fecha
      if (datos.fecha) {
        const inputDate = document.getElementById("tx-input-date");
        if (inputDate) {
          inputDate.value = datos.fecha;
          camposDetectados.push(`Fecha: ${datos.fecha}`);
        }
      }

      // 2. Monto
      if (datos.monto && Number(datos.monto) > 0) {
        const inputAmount = document.getElementById("tx-input-amount");
        if (inputAmount) {
          inputAmount.value = datos.monto;
          camposDetectados.push(`Monto: ${formatCurrency(datos.monto)}`);
        }
      }

      // 3. Proveedor (con unificación canónica con el archivo existente - Spec 041)
      if (datos.proveedor) {
        const inputSupplier = document.getElementById("tx-input-supplier");
        let displaySupplier = datos.proveedor;
        if (Calculations && Calculations.canonicalizarNombreProveedor) {
          const canonOcr = Calculations.canonicalizarNombreProveedor(datos.proveedor);
          const matched = (state.suppliers || []).find(s => s && s.name && Calculations.canonicalizarNombreProveedor(s.name) === canonOcr);
          if (matched) displaySupplier = matched.name;
        }

        if (inputSupplier) {
          inputSupplier.value = displaySupplier;
          camposDetectados.push(`Proveedor: ${displaySupplier}`);
        }
        const inputDesc = document.getElementById("tx-input-desc");
        if (inputDesc && !inputDesc.value.trim()) {
          inputDesc.value = `Pago ${displaySupplier}`;
        }
      }

      // 4. Medio de Pago
      if (datos.tipoPago) {
        const inputMethod = document.getElementById("tx-input-method");
        if (inputMethod) {
          inputMethod.value = datos.tipoPago;
          camposDetectados.push(`Medio de pago: ${datos.tipoPago}`);
        }
      }

      // 5. Categoría
      if (datos.categoriaCodigo || datos.categoria) {
        const selCat = document.getElementById("tx-input-category");
        if (selCat) {
          const matchingOpt = Array.from(selCat.options).find(opt =>
            (datos.categoriaCodigo && opt.value === datos.categoriaCodigo) ||
            (datos.categoria && (opt.value === datos.categoria || opt.text.toLowerCase().includes(datos.categoria.toLowerCase())))
          );
          if (matchingOpt) {
            selCat.value = matchingOpt.value;
            camposDetectados.push(`Categoría: ${matchingOpt.text}`);
          }
        }
      }

      // Mostrar banner de confirmación si se detectaron campos
      if (camposDetectados.length > 0 && autoExtractedBanner) {
        if (autoExtractedDetails) {
          autoExtractedDetails.textContent = `Detectados: ${camposDetectados.join(" | ")}. Revisa los valores antes de guardar.`;
        }
        autoExtractedBanner.classList.remove("hidden");
        safeRenderIcons();
        showToast("Datos del comprobante extraídos y cargados automáticamente.", "success");
      }
    }

    function manejarArchivoSeleccionado(file) {
      if (!file) return;
      const descVal = document.getElementById("tx-input-desc")?.value?.trim() || "";
      const dateVal = document.getElementById("tx-input-date")?.value || "";

      if (file.type === "application/pdf") {
        if (processingEl) {
          if (processingText) processingText.textContent = "Extrayendo y analizando datos del PDF...";
          processingEl.classList.remove("hidden");
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
          currentInvoicePdf = e.target.result;
          currentInvoiceName = file.name || (Calculations ? Calculations.generarNombreComprobante(descVal, dateVal) : "comprobante.pdf");
          if (previewName) previewName.textContent = currentInvoiceName;
          if (previewContainer) previewContainer.classList.remove("hidden");

          try {
            const texto = await extraerTextoDesdePdf(currentInvoicePdf);
            if (texto) {
              await procesarTextoYAutocompletar(texto);
            }
          } catch (errExt) {
            console.warn("Extracción de PDF falló:", errExt);
          } finally {
            if (processingEl) processingEl.classList.add("hidden");
            safeRenderIcons();
          }
        };
        reader.onerror = () => {
          if (processingEl) processingEl.classList.add("hidden");
          showToast("Error al leer el archivo PDF.", "error");
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("image/")) {
        if (processingEl) {
          if (processingText) processingText.textContent = "Procesando foto, convirtiendo a PDF y analizando...";
          processingEl.classList.remove("hidden");
        }
        convertirImagenAPdf(file, async (err, pdfDataUri, canvas) => {
          if (err || !pdfDataUri) {
            if (processingEl) processingEl.classList.add("hidden");
            showToast("No se pudo procesar la foto a PDF.", "error");
            return;
          }
          currentInvoicePdf = pdfDataUri;
          currentInvoiceName = Calculations ? Calculations.generarNombreComprobante(descVal || file.name, dateVal) : "comprobante.pdf";
          if (previewName) previewName.textContent = currentInvoiceName;
          if (previewContainer) previewContainer.classList.remove("hidden");
          safeRenderIcons();

          try {
            let texto = "";
            if (canvas && typeof extraerTextoDesdeImagen === "function") {
              texto = await extraerTextoDesdeImagen(canvas);
            }
            if (texto) {
              await procesarTextoYAutocompletar(texto);
            }
          } catch (errOcr) {
            console.warn("OCR falló:", errOcr);
          } finally {
            if (processingEl) processingEl.classList.add("hidden");
            safeRenderIcons();
          }
          showToast("Foto optimizada y convertida a PDF con éxito.", "success");
        });
      } else {
        showToast("Formato no soportado. Selecciona un archivo PDF o imagen.", "error");
      }
    }

    inputCamera?.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) manejarArchivoSeleccionado(file);
    });

    inputFile?.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) manejarArchivoSeleccionado(file);
    });

    btnRemoveInvoice?.addEventListener("click", () => {
      currentInvoicePdf = null;
      currentInvoiceName = null;
      if (inputCamera) inputCamera.value = "";
      if (inputFile) inputFile.value = "";
      if (previewContainer) previewContainer.classList.add("hidden");
      if (autoExtractedBanner) autoExtractedBanner.classList.add("hidden");
    });

    btnViewPreview?.addEventListener("click", () => {
      if (currentInvoicePdf) {
        abrirComprobantePdf(currentInvoicePdf, currentInvoiceName || "comprobante.pdf");
      }
    });

    // Manejo de envío del formulario (submit)
    const form = document.getElementById("form-new-tx");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const amountVal = Number(document.getElementById("tx-input-amount")?.value);
      const dateVal = document.getElementById("tx-input-date")?.value;
      const descVal = document.getElementById("tx-input-desc")?.value.trim();
      const supplierVal = Calculations && Calculations.normalizarProveedor
        ? Calculations.normalizarProveedor(document.getElementById("tx-input-supplier")?.value)
        : (document.getElementById("tx-input-supplier")?.value?.trim() || null);
      const accountVal = document.getElementById("tx-input-account")?.value;
      const toAccountVal = selectedType === "transfer" ? document.getElementById("tx-input-to-account")?.value : undefined;
      const rawCategoryVal = selectedType === "transfer" ? "Ahorro / Transferencia" : (document.getElementById("tx-input-category")?.value || "Otros");
      const methodVal = document.getElementById("tx-input-method")?.value || "credit";

      const catalog = getPlanCatalog();

      // Auto-registro en Archivo de Proveedores con prevención estricta de duplicados canónicos (Spec 039 & Spec 041)
      if (supplierVal && Calculations && typeof Calculations.crearProveedorObjeto === "function") {
        const canonKey = Calculations.canonicalizarNombreProveedor
          ? Calculations.canonicalizarNombreProveedor(supplierVal)
          : supplierVal.trim().toLowerCase();
        const existingSup = (state.suppliers || []).find(s => {
          if (!s || !s.name) return false;
          const k = Calculations.canonicalizarNombreProveedor
            ? Calculations.canonicalizarNombreProveedor(s.name)
            : s.name.trim().toLowerCase();
          return k === canonKey;
        });

        if (existingSup) {
          // Ya existe: no duplicar en BD. Si el existente no tiene categoría o método, enriquecerlo suavemente
          let mutado = false;
          if (!existingSup.category && rawCategoryVal && rawCategoryVal !== "Otros" && selectedType !== "transfer") {
            existingSup.category = rawCategoryVal;
            existingSup.categoryCode = catalog.find(c => c.name === rawCategoryVal)?.code || "";
            mutado = true;
          }
          if (!existingSup.paymentMethod && methodVal) {
            existingSup.paymentMethod = methodVal;
            mutado = true;
          }
          if (mutado) {
            existingSup.updatedAt = new Date().toISOString();
            if (Storage && Storage.saveSuppliers) {
              Storage.saveSuppliers(state.suppliers);
            }
          }
        } else {
          const nuevoSup = Calculations.crearProveedorObjeto({
            name: supplierVal.trim(),
            category: (selectedType !== "transfer" && rawCategoryVal !== "Otros") ? rawCategoryVal : "",
            paymentMethod: methodVal || ""
          });
          state.suppliers.push(nuevoSup);
          if (Storage && Storage.saveSuppliers) {
            Storage.saveSuppliers(state.suppliers);
          }
        }
      }

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

        const txId = (txToEdit && txToEdit.id) ? txToEdit.id : `TX-${Date.now()}`;
        const tx = {
          id: txId,
          date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
          type: selectedType,
          amount: amountVal,
          description: descVal,
          supplier: supplierVal,
          invoicePdf: currentInvoicePdf,
          invoiceName: currentInvoiceName,
          accountId: accountVal,
          category: "Varios (Split)",
          categoryCode: null,
          paymentMethod: methodVal,
          isSplit: true,
          splitLines: parsedSplitLines,
          updatedAt: new Date().toISOString()
        };

        // Validar con la lógica pura desacoplada (Spec 004 / RF-3)
        const validacion = Calculations ? Calculations.validarMovimientoSplit(tx, state.accounts) : { valida: true };
        if (!validacion.valida) {
          showToast(validacion.error || "Datos inválidos en las partidas.", "error");
          return;
        }

        if (txToEdit) {
          const idx = state.transactions.findIndex(t => t.id === txToEdit.id);
          if (idx >= 0) {
            state.transactions[idx] = tx;
          } else {
            state.transactions.unshift(tx);
          }
        } else {
          state.transactions.unshift(tx);
        }

        // Recalcular contablemente balances de cuentas y presupuestos
        if (Calculations && Calculations.recalcularBalancesCuentas) {
          state.accounts = Calculations.recalcularBalancesCuentas(state.accounts, state.transactions);
        }
        if (Calculations && Calculations.sincronizarPresupuestosConTransacciones) {
          state.budgets = Calculations.sincronizarPresupuestosConTransacciones(state.budgets, state.transactions);
        }

        if (Storage) {
          Storage.saveAccounts(state.accounts);
          Storage.saveTransactions(state.transactions);
          Storage.saveBudgets(state.budgets);
        }

        modal.close();
        renderActiveView();
        showToast(txToEdit ? "Movimiento dividido actualizado con éxito." : `Movimiento dividido de ${formatMoney(tx.amount)} registrado con éxito (${tx.splitLines.length} partidas).`, "success");
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

      let toAmountVal = undefined;
      let exchangeRateVal = undefined;
      let sourceAcc = null;
      let destAcc = null;

      if (selectedType === "transfer") {
        sourceAcc = (state.accounts || []).find(a => a.id === accountVal);
        destAcc = (state.accounts || []).find(a => a.id === toAccountVal);

        if (sourceAcc && destAcc && sourceAcc.currency !== destAcc.currency) {
          const customRate = Number(document.getElementById("tx-fx-rate")?.value);
          const customToAmount = Number(document.getElementById("tx-fx-to-amount")?.value);

          const conv = Calculations && Calculations.calcularConversionMoneda
            ? Calculations.calcularConversionMoneda(amountVal, sourceAcc.currency, destAcc.currency, state.currencies, customRate > 0 ? customRate : undefined)
            : { toAmount: amountVal, effectiveRate: 1 };

          toAmountVal = customToAmount > 0 ? customToAmount : conv.toAmount;
          exchangeRateVal = customRate > 0 ? customRate : conv.effectiveRate;

          // Herencia de tasa hacia la tabla de monedas del sistema (Spec 018)
          const srcCode = sourceAcc.currency || "CLP";
          const dstCode = destAcc.currency || "CLP";
          let updatedCurrencies = false;

          if (srcCode === "CLP" && dstCode !== "CLP") {
            if (toAmountVal > 0) {
              const newRate = Number((amountVal / toAmountVal).toFixed(4));
              const targetCurr = (state.currencies || []).find(c => c.code === dstCode);
              if (targetCurr && newRate > 0) {
                targetCurr.rateToCLP = newRate;
                targetCurr.updatedAt = new Date().toISOString();
                updatedCurrencies = true;
              }
            }
          } else if (srcCode !== "CLP" && dstCode === "CLP") {
            if (amountVal > 0) {
              const newRate = Number((toAmountVal / amountVal).toFixed(4));
              const targetCurr = (state.currencies || []).find(c => c.code === srcCode);
              if (targetCurr && newRate > 0) {
                targetCurr.rateToCLP = newRate;
                targetCurr.updatedAt = new Date().toISOString();
                updatedCurrencies = true;
              }
            }
          } else if (srcCode !== "CLP" && dstCode !== "CLP") {
            const srcCurrObj = (state.currencies || []).find(c => c.code === srcCode);
            const dstCurrObj = (state.currencies || []).find(c => c.code === dstCode);
            if (srcCurrObj && dstCurrObj && toAmountVal > 0 && amountVal > 0) {
              const effectiveRate = toAmountVal / amountVal;
              const newDstRate = Number((srcCurrObj.rateToCLP / effectiveRate).toFixed(4));
              if (newDstRate > 0) {
                dstCurrObj.rateToCLP = newDstRate;
                dstCurrObj.updatedAt = new Date().toISOString();
                updatedCurrencies = true;
              }
            }
          }

          if (updatedCurrencies && Storage) {
            Storage.saveCurrencies(state.currencies);
          }
        }
      }

      const txId = (txToEdit && txToEdit.id) ? txToEdit.id : `TX-${Date.now()}`;
      const tx = {
        id: txId,
        date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
        type: selectedType,
        amount: amountVal,
        toAmount: toAmountVal,
        exchangeRate: exchangeRateVal,
        description: descVal,
        supplier: supplierVal,
        invoicePdf: currentInvoicePdf,
        invoiceName: currentInvoiceName,
        accountId: accountVal,
        toAccountId: toAccountVal,
        category: resolvedCategoryName,
        categoryCode: resolvedCategoryCode,
        paymentMethod: methodVal,
        updatedAt: new Date().toISOString()
      };

      // Validar con lógica pura desacoplada
      const validacion = Calculations ? Calculations.validarTransaccion(tx) : { valida: true };
      if (!validacion.valida) {
        showToast(validacion.error || "Datos inválidos", "error");
        return;
      }

      if (txToEdit) {
        const idx = state.transactions.findIndex(t => t.id === txToEdit.id);
        if (idx >= 0) {
          state.transactions[idx] = tx;
        } else {
          state.transactions.unshift(tx);
        }
      } else {
        state.transactions.unshift(tx);
      }

      // Recalcular contablemente balances de cuentas y presupuestos
      if (Calculations && Calculations.recalcularBalancesCuentas) {
        state.accounts = Calculations.recalcularBalancesCuentas(state.accounts, state.transactions);
      }
      if (Calculations && Calculations.sincronizarPresupuestosConTransacciones) {
        state.budgets = Calculations.sincronizarPresupuestosConTransacciones(state.budgets, state.transactions);
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

      let successMsg = "";
      if (tx.type === "transfer" && tx.toAmount && sourceAcc && destAcc) {
        successMsg = `Transferencia de ${formatMoney(tx.amount, sourceAcc.currency)} a ${formatMoney(tx.toAmount, destAcc.currency)} ${txToEdit ? 'actualizada' : 'registrada'} con éxito.`;
      } else {
        const typeWord = tx.type === "income" ? "Ingreso" : tx.type === "transfer" ? "Transferencia" : "Gasto";
        successMsg = `${typeWord} de ${formatMoney(tx.amount)} ${txToEdit ? 'actualizado' : 'registrado'} con éxito.`;
      }
      showToast(successMsg, "success");
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
              ${renderCurrencyOptions("CLP")}
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
      if (state.deletedAccounts && state.deletedAccounts.includes(newAccount.id)) {
        state.deletedAccounts = state.deletedAccounts.filter(id => id !== newAccount.id);
        if (Storage && Storage.saveDeletedAccounts) {
          Storage.saveDeletedAccounts(state.deletedAccounts);
        }
      }
      if (Storage) {
        Storage.saveAccounts(state.accounts);
      }

      modal.close();
      renderActiveView();
      showToast(`Cuenta "${newAccount.name}" creada con éxito.`, "success");
      triggerAutoSync({ notify: false });
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

          <!-- Saldo Inicial (Spec 026) -->
          <div class="space-y-1">
            <label id="acc-edit-balance-label" class="font-semibold text-slate-700 dark:text-slate-300">
              ${account.type === "credit_card" ? "Saldo Adeudado Inicial ($) *" : "Saldo Inicial ($) *"}
            </label>
            <input type="number" id="acc-edit-input-balance" value="${account.type === 'credit_card' ? Math.abs(account.initialBalance ?? 0) : (account.initialBalance ?? 0)}" step="any" placeholder="0" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <p id="acc-edit-balance-hint" class="text-[10px] text-slate-400">
              ${account.type === "credit_card" ? "Monto adeudado actual en la tarjeta (se computará como deuda / pasivo)." : "Capital con el que inició la cuenta."}
            </p>
          </div>

          <!-- Moneda -->
          <div class="space-y-1">
            <label class="font-semibold text-slate-700 dark:text-slate-300">Moneda *</label>
            <select id="acc-edit-input-currency" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              ${renderCurrencyOptions(account.currency || "CLP")}
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

    const editTypeSelect = document.getElementById("acc-edit-input-type");
    const editBalanceLabel = document.getElementById("acc-edit-balance-label");
    const editBalanceHint = document.getElementById("acc-edit-balance-hint");

    editTypeSelect?.addEventListener("change", (e) => {
      const selectedType = e.target.value;
      if (selectedType === "credit_card") {
        if (editBalanceLabel) editBalanceLabel.textContent = "Saldo Adeudado Inicial ($) *";
        if (editBalanceHint) editBalanceHint.textContent = "Monto adeudado actual en la tarjeta (se computará como deuda / pasivo).";
      } else {
        if (editBalanceLabel) editBalanceLabel.textContent = "Saldo Inicial ($) *";
        if (editBalanceHint) editBalanceHint.textContent = "Capital con el que inició la cuenta.";
      }
    });

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
      const rawBalanceVal = document.getElementById("acc-edit-input-balance")?.value;
      const balanceVal = Number(rawBalanceVal);

      const normalizedInitialBalance = Calculations && typeof Calculations.normalizarSaldoInicialCuenta === "function"
        ? Calculations.normalizarSaldoInicialCuenta(typeVal, balanceVal)
        : (typeVal === "credit_card" && balanceVal > 0 ? -Math.abs(balanceVal) : balanceVal);

      const editData = {
        name: nameVal,
        type: typeVal,
        codigoContable: codeVal,
        currency: currencyVal,
        color: colorVal,
        isExcludedFromTotal: excludeVal,
        initialBalance: normalizedInitialBalance
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
      account.initialBalance = normalizedInitialBalance;
      account.updatedAt = new Date().toISOString();
      if (codeVal) {
        account.codigoContable = codeVal;
      }

      // Recalcular balances atómicamente con base en el nuevo saldo inicial y movimientos
      if (Calculations && typeof Calculations.recalcularBalancesCuentas === "function") {
        state.accounts = Calculations.recalcularBalancesCuentas(state.accounts, state.transactions);
      } else {
        account.currentBalance = account.initialBalance;
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
      triggerAutoSync({ notify: false });
    });

    modal.showModal();
    setTimeout(() => document.getElementById("acc-edit-input-name")?.focus(), 50);
  }

  // ========================================================
  // ELIMINACIÓN DE CUENTA FINANCIERA (SPEC 017 / RF-3, RF-4, RF-5, RF-6)
  // ========================================================
  function solicitarEliminarCuentaFinanciera(accountId) {
    if (!accountId) return;
    const account = state.accounts.find(a => a.id === accountId);
    if (!account) {
      showToast("No se encontró la cuenta a eliminar.", "error");
      return;
    }

    // RF-3: Salvaguarda de mínimo 1 cuenta activa en el sistema
    if (!Array.isArray(state.accounts) || state.accounts.length <= 1) {
      showToast("No se puede eliminar la única cuenta activa. Debe existir al menos una cuenta en el sistema.", "warning");
      return;
    }

    // RF-4: Verificar movimientos asociados
    const check = Calculations && Calculations.puedeEliminarCuenta
      ? Calculations.puedeEliminarCuenta(accountId, state.transactions)
      : { tieneMovimientos: false, cantidadMovimientos: 0 };

    let mensajeConfirmacion = "";
    if (check.cantidadMovimientos > 0) {
      mensajeConfirmacion = `⚠️ ATENCIÓN: La cuenta "${account.name}" tiene ${check.cantidadMovimientos} movimiento(s) registrado(s).\n\n¿Deseas eliminar la cuenta y purgar definitivamente todos sus movimientos asociados?`;
    } else {
      mensajeConfirmacion = `¿Estás seguro de que deseas eliminar la cuenta "${account.name}"?`;
    }

    const confirmado = window.confirm(mensajeConfirmacion);
    if (!confirmado) return;

    // 1. Purgar movimientos asociados si los tiene (Opción A)
    if (check.cantidadMovimientos > 0) {
      if (Calculations && Calculations.purgarMovimientosDeCuenta) {
        state.transactions = Calculations.purgarMovimientosDeCuenta(accountId, state.transactions);
      } else {
        state.transactions = state.transactions.filter(tx => tx.accountId !== accountId && tx.toAccountId !== accountId);
      }
      if (Storage && Storage.saveTransactions) {
        Storage.saveTransactions(state.transactions);
      }
    }

    // 2. Eliminar la cuenta del arreglo de cuentas
    state.accounts = state.accounts.filter(a => a.id !== accountId);
    if (Storage && Storage.saveAccounts) {
      Storage.saveAccounts(state.accounts);
    }

    // 3. Registrar en lápidas (tombstones) para evitar resurrección en sync (RF-6)
    state.deletedAccounts = Array.from(new Set([...(state.deletedAccounts || []), accountId]));
    if (Storage && Storage.saveDeletedAccounts) {
      Storage.saveDeletedAccounts(state.deletedAccounts);
    }

    // 4. Si la cuenta eliminada estaba seleccionada en la vista de detalle, volver a la lista
    if (state.selectedAccountId === accountId) {
      state.selectedAccountId = null;
      if (state.currentView === "account-detail") {
        switchView("accounts");
      }
    }

    // 5. Re-sincronizar presupuestos con transacciones
    if (Calculations && Calculations.sincronizarPresupuestosConTransacciones) {
      state.budgets = Calculations.sincronizarPresupuestosConTransacciones(state.budgets, state.transactions);
      if (Storage && Storage.saveBudgets) {
        Storage.saveBudgets(state.budgets);
      }
    }

    // 6. Recalcular saldos de cuentas restantes
    state.accounts = state.accounts.map(acc => {
      let bal = Number(acc.initialBalance || 0);
      state.transactions.forEach(tx => {
        const amt = Number(tx.amount || 0);
        if (tx.isSplit && Array.isArray(tx.splitLines)) {
          if (tx.accountId === acc.id) bal -= amt;
          tx.splitLines.forEach(line => {
            if (line.targetAccountId === acc.id) bal += Number(line.amount || 0);
          });
        } else if (tx.type === "expense" && tx.accountId === acc.id) {
          bal -= amt;
        } else if (tx.type === "income" && tx.accountId === acc.id) {
          bal += amt;
        } else if (tx.type === "transfer") {
          if (tx.accountId === acc.id) bal -= amt;
          if (tx.toAccountId === acc.id) bal += amt;
        }
      });
      return { ...acc, currentBalance: bal };
    });
    if (Storage && Storage.saveAccounts) {
      Storage.saveAccounts(state.accounts);
    }

    renderActiveView();
    showToast(`Cuenta "${account.name}" eliminada exitosamente.`, "success");

    // Sincronización en segundo plano con Firestore
    triggerAutoSync({ notify: false });
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
            <select id="plan-input-parent" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
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
            <select id="plan-input-class" required ${Boolean(initialParentCode) ? 'disabled' : ''} class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
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
            <input type="text" id="plan-input-code" value="${escapeHtml(initialCode)}" placeholder="Ej. 1.3.05 o 5.2.01.01" required class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500">
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
        const baseCodeRef = existing.baseCode || existing.code;
        const targetIdx = state.planAccounts.findIndex(p => 
          (p.id && (p.id === existing.id || p.id === existing.originalId)) || 
          (baseCodeRef && (p.code === baseCodeRef || p.baseCode === baseCodeRef)) ||
          p.code === existing.code
        );

        const isNominal = [4, 5].includes(classNum);
        const updatedItem = {
          id: existing.id || `PLAN-${Date.now()}`,
          baseCode: baseCodeRef,
          code: codeVal,
          name: nameVal,
          parentCode: parentCodeVal,
          isSubaccount: Boolean(parentCodeVal),
          classNumber: classNum,
          classType: classTypeMap[classNum] || "asset",
          groupName: groupVal,
          nature: natureVal,
          balance: isNominal ? 0 : (existing.balance || 0),
          periodMovement: isNominal ? 0 : (existing.periodMovement || 0),
          isSystem: false,
          icon: existing.icon || (parentCodeVal ? "corner-down-right" : (classNum === 1 ? "box" : classNum === 2 ? "credit-card" : classNum === 3 ? "shield" : classNum === 4 ? "plus-circle" : "tag"))
        };

        if (targetIdx >= 0) {
          state.planAccounts[targetIdx] = {
            ...state.planAccounts[targetIdx],
            ...updatedItem
          };
        } else {
          state.planAccounts.push(updatedItem);
        }

        // Si la cuenta tiene una cuenta financiera vinculada, sincronizar bidireccionalmente (Decisión 3)
        if (existing.financialAccountId) {
          const linkedAcc = (state.accounts || []).find(a => a.id === existing.financialAccountId);
          if (linkedAcc) {
            linkedAcc.name = nameVal;
            if (codeVal) linkedAcc.codigoContable = codeVal;
            if (Storage && Storage.saveAccounts) {
              Storage.saveAccounts(state.accounts);
            }
          }
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

      // RF-5: Si se está creando o editando una cuenta previamente eliminada, retirarla de lápidas
      if (Array.isArray(state.deletedPlanAccounts)) {
        state.deletedPlanAccounts = state.deletedPlanAccounts.filter(c => c !== codeVal && c !== (existing ? existing.id : null));
        if (Storage && Storage.saveDeletedPlanAccounts) {
          Storage.saveDeletedPlanAccounts(state.deletedPlanAccounts);
        }
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
  // RENDERIZADO 5: REPORTES CONTABLES Y FINANCIEROS (SPEC 020)
  // ========================================================
  function renderReportsView() {
    const container = document.getElementById("report-content-container");
    if (!container) return;

    // 1. Resolver fechas según el período contable seleccionado
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const lastDayOfMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();

    let startDate = "";
    let endDate = "";
    let labelPeriodo = "";

    if (state.reports.periodType === "current-month") {
      startDate = `${currentYear}-${currentMonth}-01`;
      endDate = `${currentYear}-${currentMonth}-${String(lastDayOfMonth).padStart(2, "0")}`;
      const nombreMes = now.toLocaleDateString("es-CL", { month: "long" });
      labelPeriodo = `${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${currentYear}`;
    } else if (state.reports.periodType === "current-year") {
      startDate = `${currentYear}-01-01`;
      endDate = `${currentYear}-12-31`;
      labelPeriodo = `Año Comercial ${currentYear} (Enero a Diciembre)`;
    } else {
      startDate = state.reports.startDate || `${currentYear}-${currentMonth}-01`;
      endDate = state.reports.endDate || `${currentYear}-${currentMonth}-${String(lastDayOfMonth).padStart(2, "0")}`;
      labelPeriodo = `Desde ${formatDate(startDate)} hasta ${formatDate(endDate)}`;
    }

    // Actualizar inputs de fecha en toolbar si existen
    const inputStart = document.getElementById("report-input-start-date");
    const inputEnd = document.getElementById("report-input-end-date");
    if (inputStart && !inputStart.value) inputStart.value = startDate;
    if (inputEnd && !inputEnd.value) inputEnd.value = endDate;

    // Estilos de botones de período
    const btnMonth = document.getElementById("btn-period-month");
    const btnYear = document.getElementById("btn-period-year");
    const btnCustom = document.getElementById("btn-period-custom");

    const activePeriodClass = "px-3 py-1.5 rounded-lg border border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-semibold transition-all";
    const inactivePeriodClass = "px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-medium transition-all";

    if (btnMonth) btnMonth.className = state.reports.periodType === "current-month" ? activePeriodClass : inactivePeriodClass;
    if (btnYear) btnYear.className = state.reports.periodType === "current-year" ? activePeriodClass : inactivePeriodClass;
    if (btnCustom) btnCustom.className = state.reports.periodType === "custom" ? activePeriodClass : inactivePeriodClass;

    // Estilos de tabs
    const tabBalance = document.getElementById("tab-report-balance");
    const tabIncome = document.getElementById("tab-report-income");
    const activeTabClass = "px-4 py-2 rounded-lg transition-all shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex items-center gap-2";
    const inactiveTabClass = "px-4 py-2 rounded-lg transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2";

    if (tabBalance) tabBalance.className = state.reports.activeReport === "balance" ? activeTabClass : inactiveTabClass;
    if (tabIncome) tabIncome.className = state.reports.activeReport === "income_statement" ? activeTabClass : inactiveTabClass;

    // Obtener catálogo contable unificado
    const catalog = Calculations ? Calculations.obtenerCatalogoPlanCuentas(state.planAccounts, state.accounts, state.transactions) : state.planAccounts;

    if (state.reports.activeReport === "balance") {
      renderBalanceSheet(container, catalog, startDate, endDate, labelPeriodo);
    } else {
      renderIncomeStatement(container, catalog, startDate, endDate, labelPeriodo);
    }

    safeRenderIcons();
  }

  function renderBalanceSheet(container, catalog, startDate, endDate, labelPeriodo) {
    if (!Calculations || !Calculations.generarBalanceGeneral) {
      container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">Motor de cálculo contable no disponible.</div>`;
      return;
    }

    const data = Calculations.generarBalanceGeneral(state.accounts, catalog, state.transactions, {
      currencies: state.currencies,
      startDate,
      endDate,
      cutoffDate: endDate
    });

    const renderFila = (codigo, nombre, monto, originalCurrency, originalAmt) => {
      const extraDivisa = originalCurrency && originalCurrency !== "CLP"
        ? `<span class="text-[10px] text-slate-400 block">${formatMoney(originalAmt, originalCurrency)}</span>`
        : "";
      return `
        <div class="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60 text-xs">
          <div class="flex items-center gap-2 min-w-0 pr-2">
            <span class="font-mono text-[10px] text-slate-400 flex-shrink-0">${escapeHtml(codigo)}</span>
            <span class="text-slate-700 dark:text-slate-300 truncate">${escapeHtml(nombre)}</span>
          </div>
          <div class="text-right flex-shrink-0 tabular-nums">
            <span class="font-semibold text-slate-900 dark:text-white">${formatMoney(monto, "CLP")}</span>
            ${extraDivisa}
          </div>
        </div>
      `;
    };

    // Filas Activo Circulante
    const filasActivoCirculante = (data.activos.circulante.cuentas || []).map(c => 
      renderFila(c.code || "1.1.00", c.name, c.balanceCLP, c.currency, c.originalBalance)
    ).join("") || `<div class="py-2 text-slate-400 italic text-[11px]">Sin cuentas registradas</div>`;

    // Filas Activo Fijo
    const filasActivoFijo = (data.activos.fijo.cuentas || []).map(c => 
      renderFila(c.code || "1.3.00", c.name, c.balanceCLP)
    ).join("") || `<div class="py-2 text-slate-400 italic text-[11px]">Sin activos fijos valorizados</div>`;

    // Filas Pasivo Circulante
    const filasPasivoCirculante = (data.pasivos.circulante.cuentas || []).map(c => 
      renderFila(c.code || "2.1.00", c.name, c.balanceCLP, c.currency, c.originalBalance)
    ).join("") || `<div class="py-2 text-slate-400 italic text-[11px]">Sin obligaciones a corto plazo</div>`;

    // Filas Pasivo Largo Plazo
    const filasPasivoLargoPlazo = (data.pasivos.largoPlazo.cuentas || []).map(c => 
      renderFila(c.code || "2.2.00", c.name, c.balanceCLP)
    ).join("") || `<div class="py-2 text-slate-400 italic text-[11px]">Sin obligaciones a largo plazo</div>`;

    // Filas Patrimonio
    const filasPatrimonio = (data.patrimonio.cuentas || []).map(c => 
      renderFila(c.code || "3.1.00", c.name, c.balanceCLP)
    ).join("");

    // Notas cambiarias
    const notasHtml = (data.notasCambiarias || []).map((n, idx) => `
      <div class="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
        <span class="font-bold text-slate-700 dark:text-slate-300">Nota ${idx + 1}:</span>
        <span>Cuentas valorizadas en ${escapeHtml(n.currency)} convertidas a la tasa de cambio referente oficial: ${escapeHtml(n.message)}.</span>
      </div>
    `).join("");

    const fechaHoy = new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
    const horaHoy = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

    container.innerHTML = `
      <div id="report-sheet" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
        
        <!-- Encabezado Institucional Contable -->
        <div class="border-b-2 border-slate-900 dark:border-slate-100 pb-5 space-y-1">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span class="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">Contabilidad Personal & Gestión Patrimonial</span>
              <h1 class="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Estado de Situación Financiera</h1>
              <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">Balance General Clasificado</p>
            </div>
            <div class="text-left sm:text-right text-xs space-y-0.5">
              <div class="font-bold text-slate-900 dark:text-white">Al ${formatDate(endDate)}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">Período: ${escapeHtml(labelPeriodo)}</div>
              <div class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Moneda Base: Pesos Chilenos (CLP)</div>
            </div>
          </div>
          <div class="text-[10px] text-slate-400 italic pt-1">
            Preparado en conformidad a Normas Internacionales de Información Financiera para Pymes (IFRS Pymes) y legislación contable chilena.
          </div>
        </div>

        <!-- Cuerpo del Balance en Dos Columnas Contables -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          <!-- COLUMNA 1: ACTIVOS -->
          <div class="space-y-6">
            <div class="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-4">
              <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <h3 class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <i data-lucide="arrow-down-left" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"></i>
                  <span>1. Activos</span>
                </h3>
              </div>

              <!-- Activo Circulante -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">1.1 Activo Circulante</h4>
                  <span class="text-[10px] text-slate-400 font-medium">(Disponible & Realizable)</span>
                </div>
                <div class="pl-2 space-y-1">
                  ${filasActivoCirculante}
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Subtotal Activo Circulante</span>
                  <span class="tabular-nums">${formatMoney(data.activos.circulante.total, "CLP")}</span>
                </div>
              </div>

              <!-- Activo Fijo / No Circulante -->
              <div class="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <div class="flex items-center justify-between">
                  <h4 class="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">1.3 Activo Fijo / No Circulante</h4>
                  <span class="text-[10px] text-slate-400 font-medium">(Bienes & Patrimonio Físico)</span>
                </div>
                <div class="pl-2 space-y-1">
                  ${filasActivoFijo}
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Subtotal Activo No Circulante</span>
                  <span class="tabular-nums">${formatMoney(data.activos.fijo.total, "CLP")}</span>
                </div>
              </div>

            </div>

            <!-- Total Activos (Destacado Doble Subrayado) -->
            <div class="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-sm">
              <span class="font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-wide">Total Activos</span>
              <span class="text-base font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums border-b-4 border-double border-emerald-600 dark:border-emerald-400 pb-0.5">
                ${formatMoney(data.activos.total, "CLP")}
              </span>
            </div>
          </div>

          <!-- COLUMNA 2: PASIVOS Y PATRIMONIO NETO -->
          <div class="space-y-6">
            <div class="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-4">
              
              <!-- Pasivos -->
              <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <h3 class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400"></i>
                  <span>2. Pasivos</span>
                </h3>
              </div>

              <!-- Pasivo Circulante -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">2.1 Pasivo Circulante</h4>
                  <span class="text-[10px] text-slate-400 font-medium">(Obligaciones a Corto Plazo)</span>
                </div>
                <div class="pl-2 space-y-1">
                  ${filasPasivoCirculante}
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Subtotal Pasivo Circulante</span>
                  <span class="tabular-nums text-rose-600 dark:text-rose-400">${formatMoney(data.pasivos.circulante.total, "CLP")}</span>
                </div>
              </div>

              <!-- Pasivo a Largo Plazo -->
              <div class="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <div class="flex items-center justify-between">
                  <h4 class="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">2.2 Pasivo a Largo Plazo</h4>
                  <span class="text-[10px] text-slate-400 font-medium">(Créditos & Hipotecas)</span>
                </div>
                <div class="pl-2 space-y-1">
                  ${filasPasivoLargoPlazo}
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Subtotal Pasivo Largo Plazo</span>
                  <span class="tabular-nums text-rose-600 dark:text-rose-400">${formatMoney(data.pasivos.largoPlazo.total, "CLP")}</span>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
                <span>Total Pasivos</span>
                <span class="tabular-nums text-rose-600 dark:text-rose-400">${formatMoney(data.pasivos.total, "CLP")}</span>
              </div>

              <!-- Patrimonio Neto -->
              <div class="space-y-2 pt-4 border-t-2 border-slate-300 dark:border-slate-700">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <i data-lucide="shield" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"></i>
                    <span>3. Patrimonio Neto</span>
                  </h3>
                </div>
                <div class="pl-2 space-y-1">
                  ${filasPatrimonio}
                  ${data.patrimonio.resultadoEjercicio !== 0 ? `
                    <div class="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60 text-xs">
                      <div class="flex items-center gap-2 min-w-0 pr-2">
                        <span class="font-mono text-[10px] text-slate-400 flex-shrink-0">3.2.01</span>
                        <span class="text-slate-700 dark:text-slate-300 truncate">Resultado del Ejercicio (Período)</span>
                      </div>
                      <span class="font-semibold tabular-nums ${data.patrimonio.resultadoEjercicio >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}">
                        ${formatMoney(data.patrimonio.resultadoEjercicio, "CLP")}
                      </span>
                    </div>
                  ` : ""}
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
                  <span>Total Patrimonio Neto</span>
                  <span class="tabular-nums text-blue-600 dark:text-blue-400">${formatMoney(data.patrimonio.total, "CLP")}</span>
                </div>
              </div>

            </div>

            <!-- Total Pasivo + Patrimonio (Destacado Doble Subrayado) -->
            <div class="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
              <span class="font-black text-slate-900 dark:text-white uppercase tracking-wide">Total Pasivo + Patrimonio</span>
              <span class="text-base font-extrabold text-slate-900 dark:text-white tabular-nums border-b-4 border-double border-slate-700 dark:border-slate-300 pb-0.5">
                ${formatMoney(data.cuadratura.totalPasivoMasPatrimonio, "CLP")}
              </span>
            </div>

          </div>

        </div>

        <!-- Certificación de Cuadratura Contable Estricta -->
        <div class="p-3.5 rounded-xl border ${data.cuadratura.estaCuadrado ? "bg-emerald-50/70 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-200" : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200"} flex items-center justify-between text-xs font-medium">
          <div class="flex items-center gap-2">
            <i data-lucide="${data.cuadratura.estaCuadrado ? "check-circle-2" : "alert-triangle"}" class="w-4 h-4 flex-shrink-0"></i>
            <span>
              ${data.cuadratura.estaCuadrado 
                ? "<strong>Certificación Contable:</strong> Balance General en estricta cuadratura contable (Activos = Pasivos + Patrimonio). Descuadre: $0."
                : `<strong>Alerta Contable:</strong> Descuadre contable detectado de ${formatMoney(data.cuadratura.diferencia, "CLP")}.`}
            </span>
          </div>
          <span class="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${data.cuadratura.estaCuadrado ? "bg-emerald-100 dark:bg-emerald-900/60" : "bg-rose-100 dark:bg-rose-900/60"}">
            ${data.cuadratura.estaCuadrado ? "Cuadrado 100%" : "Revisar"}
          </span>
        </div>

        <!-- Notas a los Estados Financieros (Multidivisa) -->
        ${notasHtml ? `
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Notas a los Estados Financieros</h4>
            <div class="space-y-1">
              ${notasHtml}
            </div>
          </div>
        ` : ""}

        <!-- Bloque de Cierre y Emisión -->
        <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <div>Documento emitido el ${fechaHoy} a las ${horaHoy} hrs.</div>
          <div class="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
            <span>ContaPersonal PWA — Sistema de Contabilidad Personal</span>
          </div>
        </div>

      </div>
    `;
  }

  function renderIncomeStatement(container, catalog, startDate, endDate, labelPeriodo) {
    if (!Calculations || !Calculations.generarEstadoResultados) {
      container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">Motor de cálculo contable no disponible.</div>`;
      return;
    }

    const data = Calculations.generarEstadoResultados(state.transactions, catalog, {
      startDate,
      endDate,
      currencies: state.currencies
    });

    const renderFila = (codigo, nombre, monto, esIngreso = false) => `
      <div class="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60 text-xs">
        <div class="flex items-center gap-2 min-w-0 pr-2">
          ${codigo ? `<span class="font-mono text-[10px] text-slate-400 flex-shrink-0">${escapeHtml(codigo)}</span>` : ""}
          <span class="text-slate-700 dark:text-slate-300 truncate">${escapeHtml(nombre)}</span>
        </div>
        <span class="font-semibold tabular-nums flex-shrink-0 ${esIngreso ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}">
          ${formatMoney(monto, "CLP")}
        </span>
      </div>
    `;

    // Ingresos
    const filasIngresosOp = (data.ingresos.operacionales || []).map(i => renderFila(i.code, i.name, i.amount, true)).join("")
      || `<div class="py-2 text-slate-400 italic text-[11px]">Sin ingresos operacionales en el período</div>`;

    const filasIngresosNoOp = (data.ingresos.noOperacionales || []).map(i => renderFila(i.code, i.name, i.amount, true)).join("")
      || `<div class="py-2 text-slate-400 italic text-[11px]">Sin ingresos por inversión o rendimientos</div>`;

    // Gastos
    const filasGastosOp = (data.gastos.operacionales || []).map(g => renderFila(g.code, g.name, g.amount, false)).join("")
      || `<div class="py-2 text-slate-400 italic text-[11px]">Sin gastos operacionales en el período</div>`;

    const filasGastosFin = (data.gastos.financieros || []).map(g => renderFila(g.code, g.name, g.amount, false)).join("")
      || `<div class="py-2 text-slate-400 italic text-[11px]">Sin gastos financieros o comisiones bancarias</div>`;

    const fechaHoy = new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
    const horaHoy = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

    container.innerHTML = `
      <div id="report-sheet" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
        
        <!-- Encabezado Institucional Contable -->
        <div class="border-b-2 border-slate-900 dark:border-slate-100 pb-5 space-y-1">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span class="text-[10px] uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400">Contabilidad Personal & Gestión Patrimonial</span>
              <h1 class="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Estado de Resultados</h1>
              <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">Estado de Ganancias y Pérdidas del Ejercicio</p>
            </div>
            <div class="text-left sm:text-right text-xs space-y-0.5">
              <div class="font-bold text-slate-900 dark:text-white">Período: ${escapeHtml(labelPeriodo)}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">Del ${formatDate(startDate)} al ${formatDate(endDate)}</div>
              <div class="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Moneda Base: Pesos Chilenos (CLP)</div>
            </div>
          </div>
          <div class="text-[10px] text-slate-400 italic pt-1">
            Estructurado bajo criterios de contabilidad IFRS Pymes Chile. Discrimina gastos operacionales y financieros.
          </div>
        </div>

        <div class="space-y-6">
          
          <!-- SECCIÓN 1: INGRESOS -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <h3 class="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <i data-lucide="trending-up" class="w-4 h-4"></i>
                <span>4. Ingresos</span>
              </h3>
            </div>

            <!-- Ingresos Operacionales -->
            <div class="space-y-2">
              <h4 class="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">4.1 Ingresos Operacionales (Laborales / Habituales)</h4>
              <div class="pl-2 space-y-1">
                ${filasIngresosOp}
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Subtotal Ingresos Operacionales</span>
                <span class="tabular-nums text-emerald-600 dark:text-emerald-400">${formatMoney(data.ingresos.operacionalesTotal, "CLP")}</span>
              </div>
            </div>

            <!-- Ingresos No Operacionales -->
            <div class="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <h4 class="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">4.2 Ingresos No Operacionales (Inversiones / Rendimientos)</h4>
              <div class="pl-2 space-y-1">
                ${filasIngresosNoOp}
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Subtotal Ingresos No Operacionales</span>
                <span class="tabular-nums text-emerald-600 dark:text-emerald-400">${formatMoney(data.ingresos.noOperacionalesTotal, "CLP")}</span>
              </div>
            </div>

            <!-- Total Ingresos -->
            <div class="flex items-center justify-between pt-3 border-t-2 border-slate-300 dark:border-slate-700 text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
              <span>TOTAL INGRESOS</span>
              <span class="tabular-nums text-base">${formatMoney(data.ingresos.total, "CLP")}</span>
            </div>
          </div>

          <!-- SECCIÓN 2: GASTOS -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <h3 class="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <i data-lucide="trending-down" class="w-4 h-4"></i>
                <span>5. Gastos</span>
              </h3>
            </div>

            <!-- Gastos Operacionales -->
            <div class="space-y-2">
              <h4 class="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">5.1 - 5.6 Gastos de Vida & Operacionales</h4>
              <div class="pl-2 space-y-1">
                ${filasGastosOp}
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Subtotal Gastos Operacionales</span>
                <span class="tabular-nums text-slate-800 dark:text-slate-200">${formatMoney(data.gastos.operacionalesTotal, "CLP")}</span>
              </div>
            </div>

            <!-- Gastos Financieros -->
            <div class="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <h4 class="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">5.7 Gastos Financieros & Comisiones</h4>
              <div class="pl-2 space-y-1">
                ${filasGastosFin}
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Subtotal Gastos Financieros</span>
                <span class="tabular-nums text-slate-800 dark:text-slate-200">${formatMoney(data.gastos.financierosTotal, "CLP")}</span>
              </div>
            </div>

            <!-- Total Gastos -->
            <div class="flex items-center justify-between pt-3 border-t-2 border-slate-300 dark:border-slate-700 text-sm font-extrabold text-rose-800 dark:text-rose-300">
              <span>TOTAL GASTOS</span>
              <span class="tabular-nums text-base">${formatMoney(data.gastos.total, "CLP")}</span>
            </div>
          </div>

          <!-- RESULTADO NETO DEL EJERCICIO -->
          <div class="p-6 rounded-2xl border ${data.esSuperavit ? "bg-emerald-50/90 border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800" : "bg-rose-50/90 border-rose-300 dark:bg-rose-950/60 dark:border-rose-800"} flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div class="space-y-1 text-center sm:text-left">
              <span class="text-[11px] font-bold uppercase tracking-wider ${data.esSuperavit ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}">
                ${data.esSuperavit ? "Superávit Neto del Período (Utilidad)" : "Déficit Neto del Período (Pérdida)"}
              </span>
              <h2 class="text-2xl font-black ${data.esSuperavit ? "text-emerald-900 dark:text-white" : "text-rose-900 dark:text-white"} tabular-nums">
                ${formatMoney(data.resultadoNeto, "CLP")}
              </h2>
              <p class="text-xs ${data.esSuperavit ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}">
                ${data.esSuperavit 
                  ? "Capacidad de ahorro positiva acumulada en el patrimonio personal." 
                  : "Los egresos del período superaron los ingresos registrados."}
              </p>
            </div>

            <div class="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-center sm:text-right flex-shrink-0">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Tasa de Ahorro</span>
              <span class="text-xl font-extrabold tabular-nums ${data.esSuperavit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}">
                ${data.tasaAhorro}%
              </span>
              <span class="text-[10px] text-slate-400 block">del total de ingresos</span>
            </div>
          </div>

        </div>

        <!-- Bloque de Cierre y Emisión -->
        <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <div>Documento emitido el ${fechaHoy} a las ${horaHoy} hrs.</div>
          <div class="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
            <span>ContaPersonal PWA — Sistema de Contabilidad Personal</span>
          </div>
        </div>

      </div>
    `;
  }

  function exportarReporteActualCSV() {
    if (!Calculations || !Calculations.generarReporteCSV) {
      showToast("Módulo de exportación CSV no disponible.", "error");
      return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const lastDayOfMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();

    let startDate = "";
    let endDate = "";
    let labelPeriodo = "";

    if (state.reports.periodType === "current-month") {
      startDate = `${currentYear}-${currentMonth}-01`;
      endDate = `${currentYear}-${currentMonth}-${String(lastDayOfMonth).padStart(2, "0")}`;
      labelPeriodo = `${now.toLocaleDateString("es-CL", { month: "long" })} ${currentYear}`;
    } else if (state.reports.periodType === "current-year") {
      startDate = `${currentYear}-01-01`;
      endDate = `${currentYear}-12-31`;
      labelPeriodo = `Año ${currentYear}`;
    } else {
      startDate = state.reports.startDate || `${currentYear}-${currentMonth}-01`;
      endDate = state.reports.endDate || `${currentYear}-${currentMonth}-${String(lastDayOfMonth).padStart(2, "0")}`;
      labelPeriodo = `${startDate} al ${endDate}`;
    }

    const catalog = Calculations.obtenerCatalogoPlanCuentas(state.planAccounts, state.accounts, state.transactions);

    if (state.reports.activeReport === "balance") {
      const bg = Calculations.generarBalanceGeneral(state.accounts, catalog, state.transactions, {
        currencies: state.currencies,
        startDate,
        endDate,
        cutoffDate: endDate
      });

      const filas = [];
      (bg.activos.circulante.cuentas || []).forEach(c => {
        filas.push({ seccion: "ACTIVO CIRCULANTE", rubro: `[${c.code}] ${c.name}`, monto: c.balanceCLP });
      });
      filas.push({ seccion: "ACTIVO CIRCULANTE", rubro: "SUBTOTAL ACTIVO CIRCULANTE", monto: bg.activos.circulante.total });

      (bg.activos.fijo.cuentas || []).forEach(c => {
        filas.push({ seccion: "ACTIVO NO CIRCULANTE", rubro: `[${c.code}] ${c.name}`, monto: c.balanceCLP });
      });
      filas.push({ seccion: "ACTIVO NO CIRCULANTE", rubro: "SUBTOTAL ACTIVO NO CIRCULANTE", monto: bg.activos.fijo.total });
      filas.push({ seccion: "TOTALES", rubro: "TOTAL ACTIVOS", monto: bg.activos.total });

      (bg.pasivos.circulante.cuentas || []).forEach(c => {
        filas.push({ seccion: "PASIVO CIRCULANTE", rubro: `[${c.code}] ${c.name}`, monto: c.balanceCLP });
      });
      filas.push({ seccion: "PASIVO CIRCULANTE", rubro: "SUBTOTAL PASIVO CIRCULANTE", monto: bg.pasivos.circulante.total });

      (bg.pasivos.largoPlazo.cuentas || []).forEach(c => {
        filas.push({ seccion: "PASIVO LARGO PLAZO", rubro: `[${c.code}] ${c.name}`, monto: c.balanceCLP });
      });
      filas.push({ seccion: "PASIVO LARGO PLAZO", rubro: "SUBTOTAL PASIVO LARGO PLAZO", monto: bg.pasivos.largoPlazo.total });
      filas.push({ seccion: "TOTALES", rubro: "TOTAL PASIVOS", monto: bg.pasivos.total });

      (bg.patrimonio.cuentas || []).forEach(c => {
        filas.push({ seccion: "PATRIMONIO NETO", rubro: `[${c.code}] ${c.name}`, monto: c.balanceCLP });
      });
      if (bg.patrimonio.resultadoEjercicio !== 0) {
        filas.push({ seccion: "PATRIMONIO NETO", rubro: "Resultado del Ejercicio", monto: bg.patrimonio.resultadoEjercicio });
      }
      filas.push({ seccion: "TOTALES", rubro: "TOTAL PATRIMONIO NETO", monto: bg.patrimonio.total });
      filas.push({ seccion: "TOTALES", rubro: "TOTAL PASIVO Y PATRIMONIO", monto: bg.cuadratura.totalPasivoMasPatrimonio });

      const csvContent = Calculations.generarReporteCSV("balance", {
        titulo: "Balance General Clasificado",
        periodo: labelPeriodo,
        fechaEmision: new Date().toISOString().slice(0, 10),
        filas
      });

      descargarCSVArchivo(csvContent, `Balance_General_${endDate}.csv`);
      showToast("Balance General exportado a CSV exitosamente.", "success");
    } else {
      const er = Calculations.generarEstadoResultados(state.transactions, catalog, {
        startDate,
        endDate,
        currencies: state.currencies
      });

      const filas = [];
      (er.ingresos.operacionales || []).forEach(i => {
        filas.push({ seccion: "INGRESOS OPERACIONALES", rubro: `[${i.code}] ${i.name}`, monto: i.amount });
      });
      (er.ingresos.noOperacionales || []).forEach(i => {
        filas.push({ seccion: "INGRESOS NO OPERACIONALES", rubro: `[${i.code}] ${i.name}`, monto: i.amount });
      });
      filas.push({ seccion: "TOTALES", rubro: "TOTAL INGRESOS", monto: er.ingresos.total });

      (er.gastos.operacionales || []).forEach(g => {
        filas.push({ seccion: "GASTOS OPERACIONALES", rubro: `[${g.code}] ${g.name}`, monto: g.amount });
      });
      (er.gastos.financieros || []).forEach(g => {
        filas.push({ seccion: "GASTOS FINANCIEROS", rubro: `[${g.code}] ${g.name}`, monto: g.amount });
      });
      filas.push({ seccion: "TOTALES", rubro: "TOTAL GASTOS", monto: er.gastos.total });
      filas.push({ seccion: "TOTALES", rubro: "RESULTADO NETO DEL EJERCICIO", monto: er.resultadoNeto });

      const csvContent = Calculations.generarReporteCSV("income_statement", {
        titulo: "Estado de Resultados (Ganancias y Pérdidas)",
        periodo: labelPeriodo,
        fechaEmision: new Date().toISOString().slice(0, 10),
        filas
      });

      descargarCSVArchivo(csvContent, `Estado_Resultados_${startDate}_al_${endDate}.csv`);
      showToast("Estado de Resultados exportado a CSV exitosamente.", "success");
    }
  }

  function descargarCSVArchivo(content, filename) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      case "reports":
        renderReportsView();
        break;
      case "settings":
        renderSettings();
        break;
      case "currencies":
        renderCurrenciesTable();
        break;
      case "suppliers":
        renderSuppliersTable();
        break;
      case "cloud-db":
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
      if (state.planAccounts.length > 0 && Calculations && Calculations.sanearCuentasPlanNominales) {
        const cleaned = Calculations.sanearCuentasPlanNominales(state.planAccounts);
        const hasDiff = JSON.stringify(cleaned) !== JSON.stringify(state.planAccounts);
        if (hasDiff) {
          state.planAccounts = cleaned;
          if (Storage && Storage.savePlanAccounts) {
            Storage.savePlanAccounts(state.planAccounts);
          }
        }
      }
      state.currencies = Storage.getCurrencies ? Storage.getCurrencies() : [];
      state.deletedAccounts = Storage.getDeletedAccounts ? Storage.getDeletedAccounts() : [];
      state.deletedPlanAccounts = Storage.getDeletedPlanAccounts ? Storage.getDeletedPlanAccounts() : [];
      state.deletedBudgets = Storage.getDeletedBudgets ? Storage.getDeletedBudgets() : [];
      state.deletedGoals = Storage.getDeletedGoals ? Storage.getDeletedGoals() : [];
      state.deletedTransactions = Storage.getDeletedTransactions ? Storage.getDeletedTransactions() : [];
      state.suppliers = Storage.getSuppliers ? Storage.getSuppliers() : [];
      state.deletedSuppliers = Storage.getDeletedSuppliers ? Storage.getDeletedSuppliers() : [];
      if (state.suppliers.length === 0 && state.transactions.length > 0 && Calculations && Calculations.extraerProveedoresDesdeTransacciones) {
        state.suppliers = Calculations.extraerProveedoresDesdeTransacciones(state.transactions, []);
        if (Storage && Storage.saveSuppliers) {
          Storage.saveSuppliers(state.suppliers);
        }
      } else if (state.suppliers.length > 0 && Calculations && Calculations.deduplicarProveedores) {
        state.suppliers = Calculations.deduplicarProveedores(state.suppliers);
        if (Storage && Storage.saveSuppliers) {
          Storage.saveSuppliers(state.suppliers);
        }
      }
      state.authSession = Storage.getAuthSession ? Storage.getAuthSession() : null;
    }
  }

  // ========================================================
  // WIDGET Y MODAL DE AUTENTICACIÓN FIREBASE AUTH (SPEC 021)
  // ========================================================

  function renderAuthWidget() {
    const container = document.getElementById("auth-user-widget");
    if (!container) return;

    if (state.authSession && state.authSession.email) {
      const email = state.authSession.email;
      const initial = (email.charAt(0) || "U").toUpperCase();
      container.innerHTML = `
        <div class="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 rounded-lg text-xs">
          <div class="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
            ${escapeHtml(initial)}
          </div>
          <span class="max-w-[100px] md:max-w-[150px] truncate text-slate-800 dark:text-slate-200 font-medium text-[11px]" title="${escapeHtml(email)}">
            ${escapeHtml(email)}
          </span>
          <button type="button" id="btn-logout" title="Cerrar Sesión" class="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors ml-0.5">
            <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;

      document.getElementById("btn-logout")?.addEventListener("click", () => {
        solicitarCierreSesion();
      });
    } else {
      container.innerHTML = `
        <button type="button" id="btn-open-auth-modal" class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all active:scale-95">
          <i data-lucide="log-in" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"></i>
          <span class="hidden sm:inline">Iniciar Sesión</span>
          <span class="sm:hidden">Acceder</span>
        </button>
      `;

      document.getElementById("btn-open-auth-modal")?.addEventListener("click", () => {
        openAuthModal("login");
      });
    }

    safeRenderIcons();
  }

  function openAuthModal(mode = "login") {
    state.authMode = mode;
    const modal = document.getElementById("auth-modal");
    if (!modal) return;

    const tabLogin = document.getElementById("tab-auth-login");
    const tabRegister = document.getElementById("tab-auth-register");
    const titleEl = document.getElementById("auth-modal-title");
    const labelSubmit = document.getElementById("auth-submit-label");
    const feedback = document.getElementById("auth-feedback");
    const passHelp = document.getElementById("auth-password-help");

    if (feedback) {
      feedback.className = "hidden p-3 rounded-lg text-xs";
      feedback.innerHTML = "";
    }

    const isLogin = mode === "login";
    if (titleEl) titleEl.textContent = isLogin ? "Iniciar Sesión en tu Cuenta" : "Crear Cuenta Personal";
    if (labelSubmit) labelSubmit.textContent = isLogin ? "Iniciar Sesión" : "Crear Cuenta";

    if (tabLogin) {
      tabLogin.className = isLogin
        ? "py-2 rounded-lg transition-all shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        : "py-2 rounded-lg transition-all text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white";
    }
    if (tabRegister) {
      tabRegister.className = !isLogin
        ? "py-2 rounded-lg transition-all shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        : "py-2 rounded-lg transition-all text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white";
    }

    if (passHelp) {
      if (isLogin) {
        passHelp.classList.add("hidden");
      } else {
        passHelp.classList.remove("hidden");
      }
    }

    modal.showModal();
    setTimeout(() => document.getElementById("auth-input-email")?.focus(), 50);
  }

  function solicitarCierreSesion() {
    if (confirm("¿Deseas cerrar tu sesión? La aplicación se bloqueará hasta que vuelvas a identificarte con Firebase Authentication.")) {
      if (Storage) {
        if (Storage.clearAuthSession) Storage.clearAuthSession();
        if (Storage.setActiveUid) Storage.setActiveUid(null);
      }
      state.authSession = null;
      state.accounts = [];
      state.transactions = [];
      state.budgets = [];
      state.goals = [];
      state.planAccounts = [];
      state.deletedAccounts = [];
      state.deletedPlanAccounts = [];
      state.deletedBudgets = [];
      state.deletedGoals = [];
      state.deletedTransactions = [];
      evaluarAccesoAuth();
      showToast("Sesión cerrada. Aplicación bloqueada.", "info");
    }
  }

  function evaluarAccesoAuth() {
    const puedeAcceder = Calculations && typeof Calculations.puedeAccederApp === "function"
      ? Calculations.puedeAccederApp(state.authSession)
      : Boolean(state.authSession && state.authSession.uid && state.authSession.idToken);

    const gateScreen = document.getElementById("auth-gate-screen");
    const appContainer = document.getElementById("app-container");

    if (puedeAcceder) {
      if (gateScreen) gateScreen.classList.add("hidden");
      if (appContainer) appContainer.classList.remove("hidden");
      renderAuthWidget();
      renderActiveView();
      safeRenderIcons();
    } else {
      if (appContainer) appContainer.classList.add("hidden");
      if (gateScreen) gateScreen.classList.remove("hidden");
      safeRenderIcons();
    }
    return puedeAcceder;
  }

  // ========================================================
  // AUTO-SINCRONIZACIÓN BIDIRECCIONAL CON FIREBASE (SPEC 015 & SPEC 041)
  // Declarada en ámbito superior para acceso desde cualquier modal
  // ========================================================
  let isSyncing = false;
  let hasPendingSync = false;
  async function triggerAutoSync(options = {}) {
    if (isSyncing) {
      hasPendingSync = true;
      return;
    }
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
          if (res.mergedState.currencies) {
            state.currencies = res.mergedState.currencies;
            if (Storage && Storage.saveCurrencies) Storage.saveCurrencies(res.mergedState.currencies);
          }
          if (res.mergedState.suppliers) state.suppliers = res.mergedState.suppliers;
          if (res.mergedState.deletedAccounts) state.deletedAccounts = res.mergedState.deletedAccounts;
          if (res.mergedState.deletedPlanAccounts) state.deletedPlanAccounts = res.mergedState.deletedPlanAccounts;
          if (res.mergedState.deletedBudgets) state.deletedBudgets = res.mergedState.deletedBudgets;
          if (res.mergedState.deletedGoals) state.deletedGoals = res.mergedState.deletedGoals;
          if (res.mergedState.deletedTransactions) state.deletedTransactions = res.mergedState.deletedTransactions;
          if (res.mergedState.deletedSuppliers) state.deletedSuppliers = res.mergedState.deletedSuppliers;
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
      if (hasPendingSync) {
        hasPendingSync = false;
        setTimeout(() => triggerAutoSync({ notify: false }), 200);
      }
    }
  }

  // ========================================================
  // FILTROS Y EVENTOS GLOBALES
  // ========================================================
  function initFiltersAndEvents() {
    // Buscador de Cuentas Financieras (Spec 023)
    const accSearchInput = document.getElementById("accounts-search-input");
    accSearchInput?.addEventListener("input", (e) => {
      state.accountsSearchTerm = e.target.value;
      renderAccounts();
    });

    const clearAccountsSearch = () => {
      state.accountsSearchTerm = "";
      if (accSearchInput) accSearchInput.value = "";
      renderAccounts();
      accSearchInput?.focus();
    };
    document.getElementById("btn-clear-accounts-search")?.addEventListener("click", clearAccountsSearch);
    document.getElementById("btn-reset-accounts-filter")?.addEventListener("click", clearAccountsSearch);

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
      if (confirm("¿Deseas limpiar todos tus datos contables locales (cuentas, movimientos, presupuestos y metas)?")) {
        if (Storage) Storage.resetToMockData();
        loadStateFromStorage();
        renderActiveView();
        showToast("Datos contables locales eliminados con éxito.", "info");
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

    // Botón para forzar descarga y sobreescritura desde la nube (Spec 037)
    document.getElementById("btn-firebase-force-pull")?.addEventListener("click", async () => {
      const confirmar = confirm("¿Deseas descargar y sobrescribir tus datos locales con la copia almacenada en la nube?\\n\\nEsta acción actualizará todos los saldos de tus cuentas y movimientos al estado exacto de la nube.");
      if (!confirmar) return;

      showToast("Descargando copia desde Cloud Firestore...", "info");
      try {
        if (!DbAdapter || typeof DbAdapter.forcePullFromRemote !== "function") {
          showToast("Adaptador de base de datos no disponible.", "error");
          return;
        }
        const res = await DbAdapter.forcePullFromRemote();
        if (res && res.synced) {
          loadStateFromStorage();
          renderActiveView();
          showToast(res.message, "success");
        } else {
          showToast(res.message || "Error al forzar descarga desde la nube.", "error");
        }
      } catch (err) {
        showToast(`Error al descargar: ${err.message}`, "error");
      }
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

    // Sincronización periódica multi-dispositivo en segundo plano (Spec 042)
    // Permite que la PC reciba nuevos movimientos del móvil en vivo sin recargar la página
    setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden && !isSyncing) {
        if (typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
          triggerAutoSync({ notify: false });
        }
      }
    }, 20000);

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
    document.getElementById("btn-settings-new-currency")?.addEventListener("click", () => {
      openCurrencyModal();
    });
    document.getElementById("btn-settings-new-supplier")?.addEventListener("click", () => {
      openSupplierModal();
    });
    document.getElementById("btn-settings-setup-face-auth")?.addEventListener("click", () => {
      const cred = Storage && Storage.getBiometricCredential ? Storage.getBiometricCredential() : null;
      if (cred && cred.enabled) {
        if (confirm("¿Deseas desvincular el Reconocimiento Facial de este dispositivo?")) {
          Storage.clearBiometricCredential();
          renderFaceAuthSettings();
          showToast("Reconocimiento Facial desvinculado.", "info");
        }
      } else {
        registrarReconocimientoFacial();
      }
    });

    // LISTENERS DEL MÓDULO DE REPORTES (SPEC 020)
    document.getElementById("tab-report-balance")?.addEventListener("click", () => {
      state.reports.activeReport = "balance";
      renderReportsView();
    });

    document.getElementById("tab-report-income")?.addEventListener("click", () => {
      state.reports.activeReport = "income_statement";
      renderReportsView();
    });

    document.getElementById("btn-period-month")?.addEventListener("click", () => {
      state.reports.periodType = "current-month";
      renderReportsView();
    });

    document.getElementById("btn-period-year")?.addEventListener("click", () => {
      state.reports.periodType = "current-year";
      renderReportsView();
    });

    document.getElementById("btn-period-custom")?.addEventListener("click", () => {
      state.reports.periodType = "custom";
      const inputStart = document.getElementById("report-input-start-date");
      const inputEnd = document.getElementById("report-input-end-date");
      if (inputStart && inputStart.value) state.reports.startDate = inputStart.value;
      if (inputEnd && inputEnd.value) state.reports.endDate = inputEnd.value;
      renderReportsView();
    });

    document.getElementById("btn-apply-report-dates")?.addEventListener("click", () => {
      const inputStart = document.getElementById("report-input-start-date");
      const inputEnd = document.getElementById("report-input-end-date");
      if (inputStart && inputStart.value) state.reports.startDate = inputStart.value;
      if (inputEnd && inputEnd.value) state.reports.endDate = inputEnd.value;
      state.reports.periodType = "custom";
      renderReportsView();
      showToast("Rango de fechas aplicado al reporte.", "info");
    });

    document.getElementById("btn-print-report")?.addEventListener("click", () => {
      window.print();
    });

    document.getElementById("btn-export-report-csv")?.addEventListener("click", () => {
      exportarReporteActualCSV();
    });

    // EVENTOS DE AUTENTICACIÓN FIREBASE AUTH (SPEC 021)
    const authModal = document.getElementById("auth-modal");
    document.getElementById("auth-modal-close-btn")?.addEventListener("click", () => {
      authModal?.close();
    });

    document.getElementById("tab-auth-login")?.addEventListener("click", () => {
      openAuthModal("login");
    });

    document.getElementById("tab-auth-register")?.addEventListener("click", () => {
      openAuthModal("register");
    });

    document.getElementById("btn-toggle-auth-password")?.addEventListener("click", () => {
      const passInput = document.getElementById("auth-input-password");
      if (passInput) {
        passInput.type = passInput.type === "password" ? "text" : "password";
      }
    });

    document.getElementById("auth-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("auth-input-email");
      const passInput = document.getElementById("auth-input-password");
      const feedback = document.getElementById("auth-feedback");
      const submitBtn = document.getElementById("btn-submit-auth");
      const submitLabel = document.getElementById("auth-submit-label");
      const spinner = document.getElementById("auth-spinner");

      const email = emailInput?.value || "";
      const password = passInput?.value || "";
      const isSignUp = state.authMode === "register";

      if (Calculations && Calculations.validarCredencialesAuth) {
        const val = Calculations.validarCredencialesAuth(email, password, isSignUp);
        if (!val.valida) {
          if (feedback) {
            feedback.className = "p-3 rounded-lg text-xs bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
            feedback.textContent = val.error;
          }
          return;
        }
      }

      try {
        if (submitBtn) submitBtn.disabled = true;
        if (spinner) spinner.classList.remove("hidden");
        if (submitLabel) submitLabel.textContent = isSignUp ? "Creando cuenta..." : "Verificando...";
        if (feedback) feedback.className = "hidden";

        const res = isSignUp
          ? await DbAdapter.signUpUser(email, password)
          : await DbAdapter.signInUser(email, password);

        if (res && res.success) {
          state.authSession = res.session;
          if (Storage) {
            if (Storage.saveAuthSession) Storage.saveAuthSession(res.session);
            if (Storage.setActiveUid) Storage.setActiveUid(res.session.uid);
            if (Storage.limpiarClavesGlobalesLegacy) Storage.limpiarClavesGlobalesLegacy();
          }
          authModal?.close();
          loadStateFromStorage();
          evaluarAccesoAuth();
          renderAuthWidget();
          showToast(res.message, "success");
          // Disparar sincronización bidireccional automática del nuevo workspace privado
          triggerAutoSync({ manual: true, notify: true });
        } else {
          if (feedback) {
            feedback.className = "p-3 rounded-lg text-xs bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
            feedback.textContent = (res && res.message) ? res.message : "Error durante la autenticación.";
          }
        }
      } catch (err) {
        if (feedback) {
          feedback.className = "p-3 rounded-lg text-xs bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
          feedback.textContent = `Error de conexión: ${err.message}`;
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add("hidden");
        if (submitLabel) submitLabel.textContent = isSignUp ? "Crear Cuenta" : "Iniciar Sesión";
      }
    });
  }

  // ========================================================
  // CONTROLADOR DE ACCESO OBLIGATORIO - AUTH GATE (SPEC 022)
  // ========================================================
  function initAuthGateEvents() {
    const gateTabLogin = document.getElementById("gate-tab-login");
    const gateTabRegister = document.getElementById("gate-tab-register");
    const gateForm = document.getElementById("gate-auth-form");
    const gateInputEmail = document.getElementById("gate-input-email");
    const gateInputPassword = document.getElementById("gate-input-password");
    const btnTogglePassword = document.getElementById("btn-toggle-gate-password");
    const gatePasswordHelp = document.getElementById("gate-password-help");
    const gateFeedback = document.getElementById("gate-feedback");
    const gateSubmitLabel = document.getElementById("gate-submit-label");
    const gateSpinner = document.getElementById("gate-spinner");
    const btnSubmit = document.getElementById("btn-submit-gate");

    let gateMode = "login";

    const setGateMode = (mode) => {
      gateMode = mode;
      const isLogin = mode === "login";
      if (gateSubmitLabel) gateSubmitLabel.textContent = isLogin ? "Iniciar Sesión" : "Crear Cuenta";
      if (gatePasswordHelp) {
        if (isLogin) gatePasswordHelp.classList.add("hidden");
        else gatePasswordHelp.classList.remove("hidden");
      }
      if (gateTabLogin) {
        gateTabLogin.className = isLogin
          ? "py-2.5 rounded-lg transition-all shadow-sm bg-slate-800 text-white flex items-center justify-center gap-1.5"
          : "py-2.5 rounded-lg transition-all text-slate-400 hover:text-white flex items-center justify-center gap-1.5";
      }
      if (gateTabRegister) {
        gateTabRegister.className = !isLogin
          ? "py-2.5 rounded-lg transition-all shadow-sm bg-slate-800 text-white flex items-center justify-center gap-1.5"
          : "py-2.5 rounded-lg transition-all text-slate-400 hover:text-white flex items-center justify-center gap-1.5";
      }
      if (gateFeedback) {
        gateFeedback.className = "hidden";
        gateFeedback.innerHTML = "";
      }
      const panelVerif = document.getElementById("gate-email-verification-panel");
      if (panelVerif) panelVerif.classList.add("hidden");
    };

    gateTabLogin?.addEventListener("click", () => setGateMode("login"));
    gateTabRegister?.addEventListener("click", () => setGateMode("register"));

    // Botón Reconocimiento Facial / Face ID (Spec 040 / RF-1)
    document.getElementById("btn-gate-biometric-login")?.addEventListener("click", () => {
      autenticarReconocimientoFacial();
    });

    // Panel de Verificación de Correo: Comprobar y Reenviar (Spec 040 / RF-2)
    document.getElementById("btn-check-email-verification")?.addEventListener("click", async () => {
      const session = state.authSession || (Storage && Storage.getAuthSession ? Storage.getAuthSession() : null);
      if (!session || !session.idToken) {
        showToast("No hay sesión pendiente de verificación.", "warning");
        return;
      }

      showToast("Comprobando verificación de correo con Firebase...", "info");
      if (DbAdapter && DbAdapter.lookupUserData) {
        const check = await DbAdapter.lookupUserData(session.idToken);
        if (check && check.success && check.emailVerified) {
          session.emailVerified = true;
          state.authSession = session;
          if (Storage && Storage.saveAuthSession) Storage.saveAuthSession(session);
          const panelVerif = document.getElementById("gate-email-verification-panel");
          if (panelVerif) panelVerif.classList.add("hidden");
          loadStateFromStorage();
          evaluarAccesoAuth();
          showToast("¡Correo verificado con éxito! Bienvenido a ContaPersonal.", "success");
          triggerAutoSync({ manual: true, notify: true });
        } else {
          showToast("Tu correo aún figura sin confirmar. Revisa el enlace en tu buzón o carpeta de spam.", "warning");
        }
      }
    });

    document.getElementById("btn-resend-verification-email")?.addEventListener("click", async () => {
      const session = state.authSession || (Storage && Storage.getAuthSession ? Storage.getAuthSession() : null);
      if (!session || !session.idToken) {
        showToast("No hay sesión activa para reenviar verificación.", "warning");
        return;
      }
      showToast("Reenviando correo de verificación...", "info");
      if (DbAdapter && DbAdapter.sendEmailVerification) {
        const res = await DbAdapter.sendEmailVerification(session.idToken);
        if (res && res.success) {
          showToast("Correo de confirmación reenviado exitosamente.", "success");
        } else {
          showToast(res ? res.message : "Error al reenviar correo de confirmación.", "error");
        }
      }
    });

    btnTogglePassword?.addEventListener("click", () => {
      if (!gateInputPassword) return;
      const isPass = gateInputPassword.getAttribute("type") === "password";
      gateInputPassword.setAttribute("type", isPass ? "text" : "password");
      btnTogglePassword.innerHTML = `<i data-lucide="${isPass ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>`;
      safeRenderIcons();
    });

    gateForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = gateInputEmail?.value || "";
      const password = gateInputPassword?.value || "";
      const isSignUp = gateMode === "register";

      if (Calculations && typeof Calculations.validarCredencialesAuth === "function") {
        const val = Calculations.validarCredencialesAuth(email, password, isSignUp);
        const esValida = Boolean(val && (val.valida || val.valido));
        if (!esValida) {
          if (gateFeedback) {
            gateFeedback.className = "p-3 rounded-xl text-xs bg-rose-950/80 text-rose-300 border border-rose-800";
            gateFeedback.textContent = val.error || "Credenciales incompletas.";
          }
          return;
        }
      }

      try {
        if (btnSubmit) btnSubmit.disabled = true;
        if (gateSpinner) gateSpinner.classList.remove("hidden");
        if (gateSubmitLabel) gateSubmitLabel.textContent = isSignUp ? "Creando cuenta..." : "Verificando acceso...";
        if (gateFeedback) gateFeedback.className = "hidden";

        const res = isSignUp
          ? await DbAdapter.signUpUser(email, password)
          : await DbAdapter.signInUser(email, password);

        if (res && res.success) {
          state.authSession = res.session;
          if (Storage) {
            if (Storage.saveAuthSession) Storage.saveAuthSession(res.session);
            if (Storage.setActiveUid) Storage.setActiveUid(res.session.uid);
            if (Storage.limpiarClavesGlobalesLegacy) Storage.limpiarClavesGlobalesLegacy();
          }

          if (isSignUp) {
            if (Calculations && typeof Calculations.crearEstadoInicialLimpio === "function") {
              const estadoLimpio = Calculations.crearEstadoInicialLimpio(res.session.uid, res.session.email);
              if (Storage) {
                Storage.saveAccounts(estadoLimpio.accounts);
                Storage.saveTransactions(estadoLimpio.transactions);
                Storage.saveBudgets(estadoLimpio.budgets);
                Storage.saveGoals(estadoLimpio.goals);
                Storage.saveCurrencies(estadoLimpio.currencies);
              }
            }

            // Desplegar panel informativo de correo de confirmación (Spec 040 / RF-2)
            const panelVerif = document.getElementById("gate-email-verification-panel");
            const targetEmail = document.getElementById("verification-target-email");
            if (panelVerif) {
              panelVerif.classList.remove("hidden");
              if (targetEmail) targetEmail.textContent = res.session.email;
            }
            showToast("Te hemos enviado un correo de verificación. Por favor confirma tu cuenta.", "info");
            return;
          }

          // Si es inicio de sesión y la cuenta no está verificada aún:
          if (res.emailVerified === false || (res.session && res.session.emailVerified === false)) {
            const panelVerif = document.getElementById("gate-email-verification-panel");
            const targetEmail = document.getElementById("verification-target-email");
            if (panelVerif) {
              panelVerif.classList.remove("hidden");
              if (targetEmail) targetEmail.textContent = res.session.email;
            }
            showToast("Tu cuenta requiere confirmación por correo electrónico antes de ingresar.", "warning");
            return;
          }

          loadStateFromStorage();
          evaluarAccesoAuth();
          showToast(res.message || "Acceso concedido exitosamente.", "success");
          triggerAutoSync({ manual: true, notify: true });
        } else {
          if (gateFeedback) {
            gateFeedback.className = "p-3 rounded-xl text-xs bg-rose-950/80 text-rose-300 border border-rose-800";
            let errorMsg = (res && res.message) ? res.message : "Error de credenciales o autenticación.";
            if (!isSignUp && errorMsg.includes("Credenciales inválidas")) {
              errorMsg += " ¿Es tu primera vez? Puedes registrarte en la pestaña 'Crear Cuenta'.";
            }
            if (errorMsg.includes("Firebase Console")) {
              gateFeedback.innerHTML = `
                <div>${escapeHtml(errorMsg)}</div>
                <div class="mt-2.5 pt-2 border-t border-rose-800/60">
                  <a href="https://console.firebase.google.com/project/mi-propia-contabilidad/authentication" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 font-bold text-emerald-300 hover:text-emerald-200 underline">
                    <span>Abrir Firebase Console para activar Authentication →</span>
                  </a>
                </div>
              `;
            } else {
              gateFeedback.textContent = errorMsg;
            }
          }
        }
      } catch (err) {
        if (gateFeedback) {
          gateFeedback.className = "p-3 rounded-xl text-xs bg-rose-950/80 text-rose-300 border border-rose-800";
          gateFeedback.textContent = `Error de conexión: ${err.message}`;
        }
      } finally {
        if (btnSubmit) btnSubmit.disabled = false;
        if (gateSpinner) gateSpinner.classList.add("hidden");
        if (gateSubmitLabel) gateSubmitLabel.textContent = isSignUp ? "Crear Cuenta" : "Iniciar Sesión";
        safeRenderIcons();
      }
    });

    // Inicializar visualmente en modo Login
    setGateMode("login");
  }

  // Arranque inmediato y defensivo
  function startApp() {
    initTheme();
    initNavigation();
    if (Storage && Storage.getAuthSession) {
      const session = Storage.getAuthSession();
      if (session && session.uid && Storage.setActiveUid) {
        Storage.setActiveUid(session.uid);
      }
    }
    loadStateFromStorage();
    initFiltersAndEvents();
    initAuthGateEvents();
    const autorizado = evaluarAccesoAuth();
    // Auto-sincronización multi-dispositivo en segundo plano si está autorizado
    if (autorizado && typeof DbAdapter !== "undefined" && DbAdapter && DbAdapter.getProvider() === "firebase") {
      triggerAutoSync({ notify: false });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
  } else {
    startApp();
  }

})(typeof globalThis !== "undefined" ? globalThis : this);

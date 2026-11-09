/**
 * app.js — Coordinador principal, enrutador de vistas y renderizado del Shell
 */
import { Storage } from "./storage.js";

// Estado en memoria de la sesión
let state = {
  currentView: "dashboard",
  supplies: [],
  orders: [],
  accounting: [],
  filters: {
    inventorySearch: "",
    inventoryCategory: "all",
    inventoryAlert: "all",
    accountingType: "all"
  }
};

// Formateadores estándar
const formatMoney = (amount) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const formatDate = (isoStr) => {
  if (!isoStr) return "-";
  const date = new Date(isoStr);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

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
  lucide.createIcons();

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
  const theme = Storage.getTheme();
  applyTheme(theme);

  const btnToggle = document.getElementById("btn-theme-toggle");
  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      Storage.saveTheme(next);
      showToast(`Tema ${next === "dark" ? "oscuro" : "claro"} activado`, "info");
    });
  }
}

function applyTheme(theme) {
  const iconSun = document.getElementById("theme-icon-sun");
  const iconMoon = document.getElementById("theme-icon-moon");

  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    if (iconSun) iconSun.classList.remove("hidden");
    if (iconMoon) iconMoon.classList.add("hidden");
  } else {
    document.documentElement.classList.remove("dark");
    if (iconSun) iconSun.classList.add("hidden");
    if (iconMoon) iconMoon.classList.remove("hidden");
  }
}

// ========================================================
// NAVEGACIÓN Y SIDEBAR
// ========================================================
const VIEW_METADATA = {
  dashboard: {
    title: "Dashboard General",
    subtitle: "Resumen de existencias, pedidos y balance financiero en tiempo real"
  },
  inventory: {
    title: "Catálogo & Control de Stock",
    subtitle: "Insumos disponibles, costos, precios de venta y semáforo de reabastecimiento"
  },
  orders: {
    title: "Pedidos & Ventas",
    subtitle: "Gestión de pedidos con descuento de existencias y registro de margen"
  },
  accounting: {
    title: "Contabilidad & Balances",
    subtitle: "Libro diario de ingresos y egresos para control financiero de la empresa"
  }
};

function switchView(viewName) {
  if (!VIEW_METADATA[viewName]) return;
  state.currentView = viewName;

  // Actualizar Título y Subtítulo
  document.getElementById("page-title").textContent = VIEW_METADATA[viewName].title;
  document.getElementById("page-subtitle").textContent = VIEW_METADATA[viewName].subtitle;

  // Ocultar todas las vistas y mostrar la activa
  const views = ["dashboard", "inventory", "orders", "accounting"];
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

  // Actualizar clases activas en botones de navegación
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

  // Cerrar sidebar móvil al navegar
  closeMobileSidebar();

  // Renderizar la vista activada
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
  // Listeners para botones con data-nav-view
  document.addEventListener("click", (e) => {
    const navBtn = e.target.closest("[data-nav-view]");
    if (navBtn) {
      const view = navBtn.getAttribute("data-nav-view");
      switchView(view);
    }
  });

  // Mobile sidebar triggers
  document.getElementById("btn-open-sidebar")?.addEventListener("click", openMobileSidebar);
  document.getElementById("btn-close-sidebar")?.addEventListener("click", closeMobileSidebar);
  document.getElementById("sidebar-backdrop")?.addEventListener("click", closeMobileSidebar);
}

// ========================================================
// RENDERIZADO 1: DASHBOARD
// ========================================================
function renderDashboard() {
  const supplies = state.supplies;
  const orders = state.orders;
  const accounting = state.accounting;

  // Cálculos de inventario y alertas
  let inventoryValue = 0;
  let alertCount = 0;
  let criticalCount = 0;
  const alertSupplies = [];

  supplies.forEach((item) => {
    const cost = Number(item.costPrice) || 0;
    const stock = Number(item.currentStock) || 0;
    inventoryValue += cost * stock;

    const alertLevel = Storage.getStockAlertLevel(item);
    if (alertLevel !== "optimal") {
      alertCount++;
      if (alertLevel === "critical" || alertLevel === "out_of_stock") {
        criticalCount++;
      }
      alertSupplies.push({ ...item, alertLevel });
    }
  });

  // Cálculos de pedidos
  const ordersCount = orders.length;
  let totalSales = 0;
  orders.forEach((o) => {
    if (o.status === "completed") {
      totalSales += Number(o.totalAmount) || 0;
    }
  });

  // Cálculos de contabilidad
  let totalIncome = 0;
  let totalExpense = 0;
  accounting.forEach((entry) => {
    const amt = Number(entry.amount) || 0;
    if (entry.type === "income") totalIncome += amt;
    if (entry.type === "expense") totalExpense += amt;
  });
  const netBalance = totalIncome - totalExpense;
  const grossMargin = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // Actualizar DOM Dashboard
  document.getElementById("dash-inventory-value").textContent = formatMoney(inventoryValue);
  document.getElementById("dash-inventory-count").textContent = `${supplies.length} insumos registrados`;

  document.getElementById("dash-stock-alerts-count").textContent = alertCount;
  document.getElementById("dash-critical-count").textContent = `${criticalCount} en estado crítico`;

  document.getElementById("dash-orders-count").textContent = ordersCount;
  document.getElementById("dash-sales-total").textContent = `${formatMoney(totalSales)} en ventas`;

  document.getElementById("dash-net-balance").textContent = formatMoney(netBalance);
  document.getElementById("dash-margin-rate").textContent = `Margen neto aprox: ${grossMargin}%`;

  // Actualizar badge del sidebar
  const badge = document.getElementById("sidebar-stock-alert-badge");
  if (badge) {
    if (alertCount > 0) {
      badge.textContent = alertCount;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  // Render de Alertas Urgentes
  const alertsContainer = document.getElementById("dash-alerts-list");
  if (alertsContainer) {
    if (alertSupplies.length === 0) {
      alertsContainer.innerHTML = `
        <div class="col-span-full py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i>
          <span>Todo el inventario se encuentra en niveles de stock óptimos.</span>
        </div>
      `;
    } else {
      alertsContainer.innerHTML = alertSupplies.slice(0, 3).map((item) => {
        const isCritical = item.alertLevel === "critical" || item.alertLevel === "out_of_stock";
        const badgeColor = isCritical 
          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-900"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-900";
        const label = item.alertLevel === "out_of_stock" ? "Agotado" : item.alertLevel === "critical" ? "Crítico" : "Bajo";

        return `
          <div class="p-3 rounded-lg border ${badgeColor} flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <img src="${item.imageUrl}" alt="${item.name}" class="w-10 h-10 rounded-md object-cover border border-slate-200 dark:border-slate-700" onerror="this.src='https://placehold.co/100x100?text=Insumo'">
              <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">${item.name}</h4>
                <p class="text-[11px] text-slate-500">Stock: <strong class="text-slate-800 dark:text-slate-200">${item.currentStock}</strong> / Mín: ${item.minStock} ${item.unit}</p>
              </div>
            </div>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}">
              ${label}
            </span>
          </div>
        `;
      }).join("");
    }
  }

  // Render Últimos Pedidos
  const recentOrdersEl = document.getElementById("dash-recent-orders");
  if (recentOrdersEl) {
    if (orders.length === 0) {
      recentOrdersEl.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">No hay pedidos registrados.</p>`;
    } else {
      recentOrdersEl.innerHTML = orders.slice(0, 4).map((o) => `
        <div class="py-2.5 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
              #${o.orderNumber}
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-800 dark:text-slate-200">${o.customerName}</p>
              <p class="text-[10px] text-slate-400">${formatDate(o.date)} · ${o.items.length} artículos</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-xs font-bold text-slate-900 dark:text-white tabular-nums">${formatMoney(o.totalAmount)}</p>
            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">+${formatMoney(o.grossProfit)} ganancia</span>
          </div>
        </div>
      `).join("");
    }
  }

  // Render Últimos Asientos Contables
  const recentAccEl = document.getElementById("dash-recent-accounting");
  if (recentAccEl) {
    if (accounting.length === 0) {
      recentAccEl.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">Sin movimientos contables.</p>`;
    } else {
      recentAccEl.innerHTML = accounting.slice(-4).reverse().map((entry) => {
        const isIncome = entry.type === "income";
        return `
          <div class="py-2.5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg ${isIncome ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'} flex items-center justify-center">
                <i data-lucide="${isIncome ? 'arrow-down-left' : 'arrow-up-right'}" class="w-4 h-4"></i>
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">${entry.concept}</p>
                <p class="text-[10px] text-slate-400">${formatDate(entry.date)} · ${entry.paymentMethod}</p>
              </div>
            </div>
            <p class="text-xs font-bold tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
              ${isIncome ? '+' : '-'}${formatMoney(entry.amount)}
            </p>
          </div>
        `;
      }).join("");
    }
  }
}

// ========================================================
// RENDERIZADO 2: CATÁLOGO & INVENTARIO
// ========================================================
function renderInventory() {
  const container = document.getElementById("inventory-grid");
  if (!container) return;

  const { inventorySearch, inventoryCategory, inventoryAlert } = state.filters;

  // Filtrado
  const filtered = state.supplies.filter((item) => {
    // Filtro por texto
    if (inventorySearch) {
      const q = inventorySearch.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSku = item.sku.toLowerCase().includes(q);
      if (!matchName && !matchSku) return false;
    }
    // Filtro por categoría
    if (inventoryCategory !== "all" && item.category !== inventoryCategory) {
      return false;
    }
    // Filtro por nivel de stock
    const level = Storage.getStockAlertLevel(item);
    if (inventoryAlert === "alert_only" && level === "optimal") return false;
    if (inventoryAlert !== "all" && inventoryAlert !== "alert_only" && level !== inventoryAlert) return false;

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i data-lucide="package-x" class="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700"></i>
        <h4 class="text-sm font-semibold text-slate-600 dark:text-slate-300">No se encontraron insumos</h4>
        <p class="text-xs mt-1">Prueba cambiando los criterios del buscador o los filtros de categoría y alerta.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((item) => {
    const level = Storage.getStockAlertLevel(item);
    
    // Configuración visual según nivel de alerta
    const alertConfig = {
      optimal: {
        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
        label: "Stock Óptimo",
        barClass: "bg-emerald-500",
        icon: "check"
      },
      low: {
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-900",
        label: "Stock Bajo",
        barClass: "bg-amber-500",
        icon: "alert-triangle"
      },
      critical: {
        badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-900",
        label: "Crítico",
        barClass: "bg-rose-600",
        icon: "alert-octagon"
      },
      out_of_stock: {
        badgeClass: "bg-slate-900 text-rose-400 dark:bg-rose-950/90 dark:text-rose-200 border-rose-800",
        label: "Agotado",
        barClass: "bg-slate-800 dark:bg-slate-600",
        icon: "x-circle"
      }
    }[level];

    // Porcentaje de stock relativo al mínimo
    const stockPct = Math.min(Math.round((item.currentStock / (item.minStock || 1)) * 100), 100);
    const margin = item.salePrice > 0 ? Math.round(((item.salePrice - item.costPrice) / item.salePrice) * 100) : 0;

    return `
      <div class="supply-card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
        <!-- Imagen y Badges -->
        <div class="relative h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <img src="${item.imageUrl}" alt="${item.name}" class="w-full h-full object-cover transition-transform duration-300 hover:scale-105" onerror="this.src='https://placehold.co/400x250?text=Insumo'">
          <div class="absolute top-2.5 left-2.5">
            <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 backdrop-blur shadow-sm border border-slate-200/50 dark:border-slate-700/50">
              ${item.category}
            </span>
          </div>
          <div class="absolute top-2.5 right-2.5">
            <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur shadow-sm ${alertConfig.badgeClass}">
              ${alertConfig.label}
            </span>
          </div>
        </div>

        <!-- Contenido -->
        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span class="font-mono">${item.sku}</span>
              <span>${item.unit}</span>
            </div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2" title="${item.name}">${item.name}</h3>
            ${item.description ? `<p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">${item.description}</p>` : ''}
          </div>

          <!-- Barra de Stock -->
          <div class="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500 dark:text-slate-400">Stock disponible:</span>
              <span class="font-bold tabular-nums text-slate-900 dark:text-white">${item.currentStock} <span class="text-[10px] font-normal text-slate-400">/ Mín ${item.minStock}</span></span>
            </div>
            <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full ${alertConfig.barClass} transition-all duration-300" style="width: ${stockPct}%"></div>
            </div>
          </div>

          <!-- Precios y Margen -->
          <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p class="text-[10px] text-slate-400">Costo: ${formatMoney(item.costPrice)}</p>
              <p class="text-sm font-bold text-slate-900 dark:text-white tabular-nums">${formatMoney(item.salePrice)}</p>
            </div>
            <div class="text-right">
              <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                ${margin}% mg
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ========================================================
// RENDERIZADO 3: PEDIDOS & VENTAS
// ========================================================
function renderOrders() {
  const tbody = document.getElementById("orders-table-body");
  if (!tbody) return;

  const orders = state.orders;

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-400">No hay pedidos registrados en el sistema.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map((o) => `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td class="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">#${o.orderNumber}</td>
      <td class="py-3 px-4 text-slate-500 whitespace-nowrap">${formatDate(o.date)}</td>
      <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">${o.customerName}</td>
      <td class="py-3 px-4">
        <span class="text-slate-600 dark:text-slate-300" title="${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}">
          ${o.items.length} ${o.items.length === 1 ? 'insumo' : 'insumos'}
        </span>
      </td>
      <td class="py-3 px-4 text-right font-bold tabular-nums text-slate-900 dark:text-white">${formatMoney(o.totalAmount)}</td>
      <td class="py-3 px-4 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+${formatMoney(o.grossProfit)}</td>
      <td class="py-3 px-4 text-center">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${o.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}">
          ${o.status === 'completed' ? 'Completado' : 'Cancelado'}
        </span>
      </td>
    </tr>
  `).join("");
}

// ========================================================
// RENDERIZADO 4: CONTABILIDAD & BALANCES
// ========================================================
function renderAccounting() {
  const tbody = document.getElementById("accounting-table-body");
  const entries = state.accounting;

  let totalIncome = 0;
  let totalExpense = 0;

  entries.forEach((e) => {
    const amt = Number(e.amount) || 0;
    if (e.type === "income") totalIncome += amt;
    if (e.type === "expense") totalExpense += amt;
  });

  const netBalance = totalIncome - totalExpense;

  document.getElementById("acc-total-income").textContent = formatMoney(totalIncome);
  document.getElementById("acc-total-expense").textContent = formatMoney(totalExpense);
  document.getElementById("acc-net-balance").textContent = formatMoney(netBalance);

  if (!tbody) return;

  const filterType = state.filters.accountingType;
  const filtered = entries.filter((e) => {
    if (filterType !== "all" && e.type !== filterType) return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400">Sin movimientos contables para el filtro seleccionado.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.slice().reverse().map((e) => {
    const isIncome = e.type === "income";
    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <td class="py-3 px-4 text-slate-500 whitespace-nowrap">${formatDate(e.date)}</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${isIncome ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'}">
            <i data-lucide="${isIncome ? 'arrow-down-left' : 'arrow-up-right'}" class="w-3 h-3"></i>
            ${isIncome ? 'Ingreso' : 'Egreso'}
          </span>
        </td>
        <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">${e.concept}</td>
        <td class="py-3 px-4 text-slate-500 capitalize">${e.category}</td>
        <td class="py-3 px-4 text-center capitalize text-slate-500">${e.paymentMethod}</td>
        <td class="py-3 px-4 text-right font-bold tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
          ${isIncome ? '+' : '-'}${formatMoney(e.amount)}
        </td>
      </tr>
    `;
  }).join("");
}

// ========================================================
// RENDERIZADO GENERAL Y CICLO DE VIDA
// ========================================================
function renderActiveView() {
  switch (state.currentView) {
    case "dashboard":
      renderDashboard();
      break;
    case "inventory":
      renderInventory();
      break;
    case "orders":
      renderOrders();
      break;
    case "accounting":
      renderAccounting();
      break;
  }
  lucide.createIcons();
}

function loadStateFromStorage() {
  state.supplies = Storage.getSupplies();
  state.orders = Storage.getOrders();
  state.accounting = Storage.getAccounting();
}

// ========================================================
// LISTENERS DE FILTROS Y EVENTOS
// ========================================================
function initFiltersAndActions() {
  // Filtros de Inventario
  const searchInput = document.getElementById("inventory-search");
  searchInput?.addEventListener("input", (e) => {
    state.filters.inventorySearch = e.target.value.trim();
    renderInventory();
    lucide.createIcons();
  });

  const catSelect = document.getElementById("inventory-category-filter");
  catSelect?.addEventListener("change", (e) => {
    state.filters.inventoryCategory = e.target.value;
    renderInventory();
    lucide.createIcons();
  });

  const alertSelect = document.getElementById("inventory-alert-filter");
  alertSelect?.addEventListener("change", (e) => {
    state.filters.inventoryAlert = e.target.value;
    renderInventory();
    lucide.createIcons();
  });

  // Filtro de Contabilidad
  const accFilter = document.getElementById("accounting-type-filter");
  accFilter?.addEventListener("change", (e) => {
    state.filters.accountingType = e.target.value;
    renderAccounting();
    lucide.createIcons();
  });

  // Botón Restablecer Datos Demo
  document.getElementById("btn-reset-demo")?.addEventListener("click", () => {
    if (confirm("¿Deseas restablecer todos los insumos, pedidos y datos contables a los datos de demostración originales?")) {
      Storage.resetToMockData();
      loadStateFromStorage();
      renderActiveView();
      showToast("Datos restablecidos a la demostración inicial.", "success");
    }
  });

  // Botón Exportar Respaldo
  document.getElementById("btn-export-backup")?.addEventListener("click", () => {
    Storage.exportBackup();
    showToast("Respaldo JSON descargado correctamente.", "info");
  });

  // Modal genérico
  const modal = document.getElementById("app-modal");
  document.getElementById("modal-close-btn")?.addEventListener("click", () => modal?.close());
  
  // Botones de acción rápida que abren modal placeholder
  const showModalPlaceholder = (title, msg) => {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").innerHTML = `
      <div class="py-4 text-center space-y-3">
        <i data-lucide="sparkles" class="w-8 h-8 text-emerald-500 mx-auto"></i>
        <p class="text-xs text-slate-600 dark:text-slate-300">${msg}</p>
        <p class="text-[11px] text-slate-400">El shell visual y los datos base están listos. En la siguiente iteración se conectará el formulario completo de creación.</p>
      </div>
    `;
    lucide.createIcons();
    modal?.showModal();
  };

  document.getElementById("btn-modal-new-supply")?.addEventListener("click", () => {
    showModalPlaceholder("Registrar Nuevo Insumo", "Formulario de alta de insumos con control de stock mínimo y carga de fotos.");
  });

  document.getElementById("btn-open-order-modal")?.addEventListener("click", () => {
    showModalPlaceholder("Registrar Nuevo Pedido", "Formulario de selección de insumos, cálculo automático de importes y descuento de existencias.");
  });

  document.getElementById("btn-quick-new-order")?.addEventListener("click", () => {
    showModalPlaceholder("Registrar Nuevo Pedido", "Formulario de selección de insumos, cálculo automático de importes y descuento de existencias.");
  });
}

// Inicialización de la aplicación
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNavigation();
  loadStateFromStorage();
  initFiltersAndActions();
  renderActiveView();
  lucide.createIcons();
});

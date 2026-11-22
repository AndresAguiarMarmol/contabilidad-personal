/**
 * storage.js — Capa de persistencia local y sincronización para Contabilidad Personal
 * Exportación universal para navegador (window.ContaPersonal.Storage) y Node.js.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    const mockData = require("./mockData.js");
    const calculations = require("./financeCalculations.js");
    module.exports = factory(mockData, calculations);
  } else {
    root.ContaPersonal = root.ContaPersonal || {};
    const mockData = root.ContaPersonal.MockData || {};
    const calculations = root.ContaPersonal.Calculations || {};
    root.ContaPersonal.Storage = factory(mockData, calculations);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (mockData, calculations) {

  const STORAGE_KEYS = {
    ACCOUNTS: "finance_accounts_data",
    TRANSACTIONS: "finance_transactions_data",
    BUDGETS: "finance_budgets_data",
    GOALS: "finance_goals_data",
    PLAN_ACCOUNTS: "finance_plan_accounts_data",
    CURRENCIES: "finance_currencies_data",
    DELETED_ACCOUNTS: "finance_deleted_accounts_data",
    DELETED_PLAN_ACCOUNTS: "finance_deleted_plan_accounts_data",
    DELETED_BUDGETS: "finance_deleted_budgets_data",
    DELETED_GOALS: "finance_deleted_goals_data",
    THEME: "finance_theme",
    DB_CONFIG: "finance_remote_db_config",
    AUTH_SESSION: "finance_auth_session"
  };

  const getLocalStorage = () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage;
      }
    } catch (e) {
      // Entorno restringido o incógnito
    }
    return null;
  };

  let activeUserUid = null;

  const Storage = {
    // --- GESTIÓN DE UID ACTIVO (SPEC 024) ---
    setActiveUid(uid) {
      activeUserUid = (typeof uid === "string" && uid.trim().length > 0) ? uid.trim() : null;
    },

    getActiveUid() {
      if (activeUserUid) return activeUserUid;
      const session = this.getAuthSession();
      if (session && session.uid) {
        activeUserUid = session.uid;
        return activeUserUid;
      }
      return null;
    },

    resolveKey(baseKey) {
      const uid = this.getActiveUid();
      if (calculations && typeof calculations.obtenerClaveStorage === "function") {
        return calculations.obtenerClaveStorage(baseKey, uid);
      }
      if (!uid) return baseKey;
      const suffix = baseKey.startsWith("finance_") ? baseKey.slice("finance_".length) : baseKey;
      return `finance_${uid}_${suffix}`;
    },

    // --- CUENTAS ---
    getAccounts() {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.ACCOUNTS);
      try {
        const raw = ls ? ls.getItem(key) : null;
        if (!raw) {
          const defaults = mockData.INITIAL_ACCOUNTS || [];
          this.saveAccounts(defaults);
          return [...defaults];
        }
        const parsed = JSON.parse(raw);
        if (calculations && typeof calculations.purgarDatosDemoLocales === "function") {
          const purgadas = calculations.purgarDatosDemoLocales(parsed, "accounts");
          if (purgadas.length !== parsed.length) {
            this.saveAccounts(purgadas);
          }
          return purgadas;
        }
        return parsed;
      } catch (e) {
        console.warn("Error leyendo cuentas, usando semilla inicial:", e);
        return [...(mockData.INITIAL_ACCOUNTS || [])];
      }
    },

    saveAccounts(accounts) {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.ACCOUNTS);
      if (ls) {
        try {
          ls.setItem(key, JSON.stringify(accounts));
        } catch (e) {}
      }
    },

    // --- TRANSACCIONES ---
    getTransactions() {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.TRANSACTIONS);
      try {
        const raw = ls ? ls.getItem(key) : null;
        if (!raw) {
          const defaults = mockData.INITIAL_TRANSACTIONS || [];
          this.saveTransactions(defaults);
          return [...defaults];
        }
        const parsed = JSON.parse(raw);
        if (calculations && typeof calculations.purgarDatosDemoLocales === "function") {
          const purgadas = calculations.purgarDatosDemoLocales(parsed, "transactions");
          if (purgadas.length !== parsed.length) {
            this.saveTransactions(purgadas);
          }
          return purgadas;
        }
        return parsed;
      } catch (e) {
        console.warn("Error leyendo transacciones, usando semilla inicial:", e);
        return [...(mockData.INITIAL_TRANSACTIONS || [])];
      }
    },

    saveTransactions(transactions) {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.TRANSACTIONS);
      if (ls) {
        try {
          ls.setItem(key, JSON.stringify(transactions));
        } catch (e) {}
      }
    },

    // --- PRESUPUESTOS ---
    getBudgets() {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.BUDGETS);
      try {
        const raw = ls ? ls.getItem(key) : null;
        if (!raw) {
          const defaults = mockData.INITIAL_BUDGETS || [];
          this.saveBudgets(defaults);
          return [...defaults];
        }
        const parsed = JSON.parse(raw);
        if (calculations && typeof calculations.purgarDatosDemoLocales === "function") {
          const purgadas = calculations.purgarDatosDemoLocales(parsed, "budgets");
          if (purgadas.length !== parsed.length) {
            this.saveBudgets(purgadas);
          }
          return purgadas;
        }
        return parsed;
      } catch (e) {
        console.warn("Error leyendo presupuestos, usando semilla inicial:", e);
        return [...(mockData.INITIAL_BUDGETS || [])];
      }
    },

    saveBudgets(budgets) {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.BUDGETS);
      if (ls) {
        try {
          ls.setItem(key, JSON.stringify(budgets));
        } catch (e) {}
      }
    },

    // --- METAS DE AHORRO ---
    getGoals() {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.GOALS);
      try {
        const raw = ls ? ls.getItem(key) : null;
        if (!raw) {
          const defaults = mockData.INITIAL_GOALS || [];
          this.saveGoals(defaults);
          return [...defaults];
        }
        const parsed = JSON.parse(raw);
        if (calculations && typeof calculations.purgarDatosDemoLocales === "function") {
          const purgadas = calculations.purgarDatosDemoLocales(parsed, "goals");
          if (purgadas.length !== parsed.length) {
            this.saveGoals(purgadas);
          }
          return purgadas;
        }
        return parsed;
      } catch (e) {
        console.warn("Error leyendo metas, usando semilla inicial:", e);
        return [...(mockData.INITIAL_GOALS || [])];
      }
    },

    saveGoals(goals) {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.GOALS);
      if (ls) {
        try {
          ls.setItem(key, JSON.stringify(goals));
        } catch (e) {}
      }
    },

    // --- CUENTAS PLAN DE CUENTAS PERSONAL ---
    getPlanAccounts() {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.PLAN_ACCOUNTS);
      try {
        const raw = ls ? ls.getItem(key) : null;
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.warn("Error leyendo cuentas del plan contable:", e);
        return [];
      }
    },

    savePlanAccounts(planAccounts) {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.PLAN_ACCOUNTS);
      if (ls) {
        try {
          ls.setItem(key, JSON.stringify(planAccounts));
        } catch (e) {}
      }
    },

    // --- MONEDAS Y TASAS DE CAMBIO (SPEC 018) ---
    getCurrencies() {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.CURRENCIES);
      try {
        const raw = ls ? ls.getItem(key) : null;
        if (!raw) {
          const defaults = calculations && calculations.CURRENCIES_BASE
            ? calculations.CURRENCIES_BASE
            : [
                { code: "CLP", name: "Peso Chileno", symbol: "$", rateToCLP: 1.0, isBase: true },
                { code: "USD", name: "Dólar Estadounidense", symbol: "US$", rateToCLP: 950.0, isBase: false },
                { code: "EUR", name: "Euro", symbol: "€", rateToCLP: 1020.0, isBase: false },
                { code: "ARS", name: "Peso Argentino", symbol: "AR$", rateToCLP: 0.95, isBase: false }
              ];
          this.saveCurrencies(defaults);
          return [...defaults];
        }
        return JSON.parse(raw);
      } catch (e) {
        console.warn("Error leyendo monedas, usando semilla inicial:", e);
        return [...(calculations && calculations.CURRENCIES_BASE ? calculations.CURRENCIES_BASE : [])];
      }
    },

    saveCurrencies(currencies) {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.CURRENCIES);
      if (ls) {
        try {
          ls.setItem(key, JSON.stringify(Array.isArray(currencies) ? currencies : []));
        } catch (e) {}
      }
    },

    // --- LÁPIDAS DE ELIMINACIÓN (TOMBSTONES - SPEC 016 & SPEC 017 & SPEC 024) ---
    getDeletedAccounts() {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.DELETED_ACCOUNTS);
      try {
        const raw = ls ? ls.getItem(key) : null;
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    saveDeletedAccounts(list) {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.DELETED_ACCOUNTS);
      if (ls) {
        try {
          ls.setItem(key, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) {}
      }
    },

    getDeletedPlanAccounts() {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.DELETED_PLAN_ACCOUNTS);
      try {
        const raw = ls ? ls.getItem(key) : null;
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    saveDeletedPlanAccounts(list) {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.DELETED_PLAN_ACCOUNTS);
      if (ls) {
        try {
          ls.setItem(key, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) {}
      }
    },

    getDeletedBudgets() {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.DELETED_BUDGETS);
      try {
        const raw = ls ? ls.getItem(key) : null;
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    saveDeletedBudgets(list) {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.DELETED_BUDGETS);
      if (ls) {
        try {
          ls.setItem(key, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) {}
      }
    },

    getDeletedGoals() {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.DELETED_GOALS);
      try {
        const raw = ls ? ls.getItem(key) : null;
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    saveDeletedGoals(list) {
      const ls = getLocalStorage();
      const key = this.resolveKey(STORAGE_KEYS.DELETED_GOALS);
      if (ls) {
        try {
          ls.setItem(key, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) {}
      }
    },

    // --- CONFIGURACIÓN BASE DE DATOS (FIREBASE / SUPABASE) ---
    getDbConfig() {
      const ls = getLocalStorage();
      const defaultFirebase = {
        provider: "firebase",
        projectId: "mi-propia-contabilidad",
        apiKey: "AIzaSyCjcppkAHLLNTZRomuGqz_Q96nMdnEnqtU",
        authDomain: "mi-propia-contabilidad.firebaseapp.com",
        storageBucket: "mi-propia-contabilidad.firebasestorage.app"
      };

      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.DB_CONFIG) : null;
        if (!raw) return defaultFirebase;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.provider) {
          if (parsed.provider === "firebase") {
            return {
              ...defaultFirebase,
              ...parsed
            };
          }
          return parsed;
        }
        return defaultFirebase;
      } catch (e) {
        return defaultFirebase;
      }
    },

    saveDbConfig(config) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.setItem(STORAGE_KEYS.DB_CONFIG, JSON.stringify(config));
        } catch (e) {}
      }
    },

    // --- SESIÓN DE AUTENTICACIÓN FIREBASE AUTH (SPEC 021) ---
    getAuthSession() {
      const ls = getLocalStorage();
      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.AUTH_SESSION) : null;
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && parsed.uid && parsed.idToken ? parsed : null;
      } catch (e) {
        return null;
      }
    },

    saveAuthSession(session) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          if (!session) {
            activeUserUid = null;
            ls.removeItem(STORAGE_KEYS.AUTH_SESSION);
          } else {
            if (session.uid) activeUserUid = session.uid;
            ls.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
          }
        } catch (e) {}
      }
    },

    clearAuthSession() {
      activeUserUid = null;
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.removeItem(STORAGE_KEYS.AUTH_SESSION);
        } catch (e) {}
      }
    },

    // --- TEMA ---
    getTheme() {
      const ls = getLocalStorage();
      try {
        const saved = ls ? ls.getItem(STORAGE_KEYS.THEME) : null;
        if (saved) return saved;
        if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
          return "dark";
        }
      } catch (e) {}
      return "light";
    },

    saveTheme(theme) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.setItem(STORAGE_KEYS.THEME, theme);
        } catch (e) {}
      }
    },

    // --- REINICIAR / LIMPIAR DATOS CONTABLES (SPEC 022) ---
    resetToMockData() {
      this.saveAccounts([]);
      this.saveTransactions([]);
      this.saveBudgets([]);
      this.saveGoals([]);
      this.savePlanAccounts([]);
      this.saveDeletedAccounts([]);
      this.saveDeletedPlanAccounts([]);
      this.saveDeletedBudgets([]);
      this.saveDeletedGoals([]);
    },

    // --- EXPORTAR / IMPORTAR BACKUP JSON ---
    exportBackup() {
      const backup = {
        app: "Contabilidad Personal PWA",
        version: "2.0",
        exportDate: new Date().toISOString(),
        accounts: this.getAccounts(),
        transactions: this.getTransactions(),
        budgets: this.getBudgets(),
        goals: this.getGoals(),
        planAccounts: this.getPlanAccounts(),
        currencies: this.getCurrencies(),
        deletedAccounts: this.getDeletedAccounts(),
        deletedPlanAccounts: this.getDeletedPlanAccounts(),
        deletedBudgets: this.getDeletedBudgets(),
        deletedGoals: this.getDeletedGoals()
      };
      if (typeof window !== "undefined") {
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup_contabilidad_personal_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      return backup;
    },

    importBackup(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data.accounts) && Array.isArray(data.transactions)) {
          this.saveAccounts(data.accounts);
          this.saveTransactions(data.transactions);
          if (Array.isArray(data.budgets)) this.saveBudgets(data.budgets);
          if (Array.isArray(data.goals)) this.saveGoals(data.goals);
          if (Array.isArray(data.planAccounts)) this.savePlanAccounts(data.planAccounts);
          if (Array.isArray(data.currencies)) this.saveCurrencies(data.currencies);
          if (Array.isArray(data.deletedAccounts)) this.saveDeletedAccounts(data.deletedAccounts);
          if (Array.isArray(data.deletedPlanAccounts)) this.saveDeletedPlanAccounts(data.deletedPlanAccounts);
          if (Array.isArray(data.deletedBudgets)) this.saveDeletedBudgets(data.deletedBudgets);
          if (Array.isArray(data.deletedGoals)) this.saveDeletedGoals(data.deletedGoals);
          return true;
        }
        return false;
      } catch (e) {
        console.error("Error al importar backup JSON:", e);
        return false;
      }
    },

    // --- CÁLCULO DE PATRIMONIO NETO CON MÓDULO PURO ---
    calculateNetWorth() {
      const accounts = this.getAccounts();
      const currencies = this.getCurrencies();
      if (calculations && calculations.calcularPatrimonioNeto) {
        return calculations.calcularPatrimonioNeto(accounts, currencies);
      }
      return { assets: 0, liabilities: 0, netWorth: 0 };
    },

    // --- LIMPIEZA TOTAL DE DATOS LOCALES (SPEC 022 & SPEC 024) ---
    limpiarTodoElEstadoLocal() {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.removeItem(this.resolveKey(STORAGE_KEYS.ACCOUNTS));
          ls.removeItem(this.resolveKey(STORAGE_KEYS.TRANSACTIONS));
          ls.removeItem(this.resolveKey(STORAGE_KEYS.BUDGETS));
          ls.removeItem(this.resolveKey(STORAGE_KEYS.GOALS));
          ls.removeItem(this.resolveKey(STORAGE_KEYS.PLAN_ACCOUNTS));
          ls.removeItem(this.resolveKey(STORAGE_KEYS.CURRENCIES));
          ls.removeItem(this.resolveKey(STORAGE_KEYS.DELETED_ACCOUNTS));
          ls.removeItem(this.resolveKey(STORAGE_KEYS.DELETED_PLAN_ACCOUNTS));
          ls.removeItem(this.resolveKey(STORAGE_KEYS.DELETED_BUDGETS));
          ls.removeItem(this.resolveKey(STORAGE_KEYS.DELETED_GOALS));
        } catch (e) {}
      }
    },

    // --- PURGA DE CLAVES GLOBALES OBSOLETAS SIN NAMESPACE (SPEC 024) ---
    limpiarClavesGlobalesLegacy() {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.removeItem("finance_accounts_data");
          ls.removeItem("finance_transactions_data");
          ls.removeItem("finance_budgets_data");
          ls.removeItem("finance_goals_data");
          ls.removeItem("finance_plan_accounts_data");
          ls.removeItem("finance_currencies_data");
          ls.removeItem("finance_deleted_accounts_data");
          ls.removeItem("finance_deleted_plan_accounts_data");
          ls.removeItem("finance_deleted_budgets_data");
          ls.removeItem("finance_deleted_goals_data");
        } catch (e) {}
      }
    }
  };

  return Storage;
});

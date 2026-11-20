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
    DELETED_ACCOUNTS: "finance_deleted_accounts_data",
    DELETED_PLAN_ACCOUNTS: "finance_deleted_plan_accounts_data",
    DELETED_BUDGETS: "finance_deleted_budgets_data",
    DELETED_GOALS: "finance_deleted_goals_data",
    THEME: "finance_theme",
    DB_CONFIG: "finance_remote_db_config"
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

  const Storage = {
    // --- CUENTAS ---
    getAccounts() {
      const ls = getLocalStorage();
      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.ACCOUNTS) : null;
        if (!raw) {
          const defaults = mockData.INITIAL_ACCOUNTS || [];
          this.saveAccounts(defaults);
          return [...defaults];
        }
        return JSON.parse(raw);
      } catch (e) {
        console.warn("Error leyendo cuentas, usando semilla inicial:", e);
        return [...(mockData.INITIAL_ACCOUNTS || [])];
      }
    },

    saveAccounts(accounts) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
        } catch (e) {}
      }
    },

    // --- TRANSACCIONES ---
    getTransactions() {
      const ls = getLocalStorage();
      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.TRANSACTIONS) : null;
        if (!raw) {
          const defaults = mockData.INITIAL_TRANSACTIONS || [];
          this.saveTransactions(defaults);
          return [...defaults];
        }
        return JSON.parse(raw);
      } catch (e) {
        console.warn("Error leyendo transacciones, usando semilla inicial:", e);
        return [...(mockData.INITIAL_TRANSACTIONS || [])];
      }
    },

    saveTransactions(transactions) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
        } catch (e) {}
      }
    },

    // --- PRESUPUESTOS ---
    getBudgets() {
      const ls = getLocalStorage();
      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.BUDGETS) : null;
        if (!raw) {
          const defaults = mockData.INITIAL_BUDGETS || [];
          this.saveBudgets(defaults);
          return [...defaults];
        }
        return JSON.parse(raw);
      } catch (e) {
        console.warn("Error leyendo presupuestos, usando semilla inicial:", e);
        return [...(mockData.INITIAL_BUDGETS || [])];
      }
    },

    saveBudgets(budgets) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
        } catch (e) {}
      }
    },

    // --- METAS DE AHORRO ---
    getGoals() {
      const ls = getLocalStorage();
      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.GOALS) : null;
        if (!raw) {
          const defaults = mockData.INITIAL_GOALS || [];
          this.saveGoals(defaults);
          return [...defaults];
        }
        return JSON.parse(raw);
      } catch (e) {
        console.warn("Error leyendo metas, usando semilla inicial:", e);
        return [...(mockData.INITIAL_GOALS || [])];
      }
    },

    saveGoals(goals) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
        } catch (e) {}
      }
    },

    // --- CUENTAS PLAN DE CUENTAS PERSONAL ---
    getPlanAccounts() {
      const ls = getLocalStorage();
      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.PLAN_ACCOUNTS) : null;
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.warn("Error leyendo cuentas del plan contable:", e);
        return [];
      }
    },

    savePlanAccounts(planAccounts) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.setItem(STORAGE_KEYS.PLAN_ACCOUNTS, JSON.stringify(planAccounts));
        } catch (e) {}
      }
    },

    // --- LÁPIDAS DE ELIMINACIÓN (TOMBSTONES - SPEC 016 & SPEC 017) ---
    getDeletedAccounts() {
      const ls = getLocalStorage();
      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.DELETED_ACCOUNTS) : null;
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    saveDeletedAccounts(list) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.setItem(STORAGE_KEYS.DELETED_ACCOUNTS, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) {}
      }
    },

    getDeletedPlanAccounts() {
      const ls = getLocalStorage();
      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.DELETED_PLAN_ACCOUNTS) : null;
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    saveDeletedPlanAccounts(list) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.setItem(STORAGE_KEYS.DELETED_PLAN_ACCOUNTS, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) {}
      }
    },

    getDeletedBudgets() {
      const ls = getLocalStorage();
      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.DELETED_BUDGETS) : null;
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    saveDeletedBudgets(list) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.setItem(STORAGE_KEYS.DELETED_BUDGETS, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) {}
      }
    },

    getDeletedGoals() {
      const ls = getLocalStorage();
      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.DELETED_GOALS) : null;
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    saveDeletedGoals(list) {
      const ls = getLocalStorage();
      if (ls) {
        try {
          ls.setItem(STORAGE_KEYS.DELETED_GOALS, JSON.stringify(Array.isArray(list) ? list : []));
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

    // --- REINICIAR DATOS A DEMO ---
    resetToMockData() {
      this.saveAccounts(mockData.INITIAL_ACCOUNTS || []);
      this.saveTransactions(mockData.INITIAL_TRANSACTIONS || []);
      this.saveBudgets(mockData.INITIAL_BUDGETS || []);
      this.saveGoals(mockData.INITIAL_GOALS || []);
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
      if (calculations && calculations.calcularPatrimonioNeto) {
        return calculations.calcularPatrimonioNeto(accounts);
      }
      return { assets: 0, liabilities: 0, netWorth: 0 };
    }
  };

  return Storage;
});

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

    // --- CONFIGURACIÓN BASE DE DATOS (SUPABASE) ---
    getDbConfig() {
      const ls = getLocalStorage();
      try {
        const raw = ls ? ls.getItem(STORAGE_KEYS.DB_CONFIG) : null;
        return raw ? JSON.parse(raw) : { provider: "none", url: "", anonKey: "" };
      } catch (e) {
        return { provider: "none", url: "", anonKey: "" };
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
        goals: this.getGoals()
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

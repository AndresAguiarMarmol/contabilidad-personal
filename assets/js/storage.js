/**
 * storage.js — Capa de persistencia local y sincronización para Contabilidad Personal
 */
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_GOALS } from "./mockData.js";

const STORAGE_KEYS = {
  ACCOUNTS: "finance_accounts_data",
  TRANSACTIONS: "finance_transactions_data",
  BUDGETS: "finance_budgets_data",
  GOALS: "finance_goals_data",
  THEME: "finance_theme",
  DB_CONFIG: "finance_remote_db_config"
};

export const Storage = {
  // --- CUENTAS ---
  getAccounts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (!raw) {
        this.saveAccounts(INITIAL_ACCOUNTS);
        return [...INITIAL_ACCOUNTS];
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Error leyendo cuentas de localStorage:", e);
      return [...INITIAL_ACCOUNTS];
    }
  },

  saveAccounts(accounts) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  // --- TRANSACCIONES ---
  getTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!raw) {
        this.saveTransactions(INITIAL_TRANSACTIONS);
        return [...INITIAL_TRANSACTIONS];
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Error leyendo transacciones de localStorage:", e);
      return [...INITIAL_TRANSACTIONS];
    }
  },

  saveTransactions(transactions) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  // --- PRESUPUESTOS ---
  getBudgets() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      if (!raw) {
        this.saveBudgets(INITIAL_BUDGETS);
        return [...INITIAL_BUDGETS];
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Error leyendo presupuestos de localStorage:", e);
      return [...INITIAL_BUDGETS];
    }
  },

  saveBudgets(budgets) {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  },

  // --- METAS DE AHORRO ---
  getGoals() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GOALS);
      if (!raw) {
        this.saveGoals(INITIAL_GOALS);
        return [...INITIAL_GOALS];
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Error leyendo metas de localStorage:", e);
      return [...INITIAL_GOALS];
    }
  },

  saveGoals(goals) {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  },

  // --- CONFIGURACIÓN BASE DE DATOS REMOTA (SUPABASE) ---
  getDbConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DB_CONFIG);
      return raw ? JSON.parse(raw) : { provider: "none", url: "", anonKey: "" };
    } catch (e) {
      return { provider: "none", url: "", anonKey: "" };
    }
  },

  saveDbConfig(config) {
    localStorage.setItem(STORAGE_KEYS.DB_CONFIG, JSON.stringify(config));
  },

  // --- TEMA ---
  getTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved) return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  },

  saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  // --- REINICIAR DATOS A DEMO ---
  resetToMockData() {
    this.saveAccounts(INITIAL_ACCOUNTS);
    this.saveTransactions(INITIAL_TRANSACTIONS);
    this.saveBudgets(INITIAL_BUDGETS);
    this.saveGoals(INITIAL_GOALS);
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
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_contabilidad_personal_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  // --- CÁLCULO DE PATRIMONIO NETO ---
  calculateNetWorth() {
    const accounts = this.getAccounts();
    let assets = 0;
    let liabilities = 0;

    accounts.forEach(acc => {
      if (acc.isExcludedFromTotal) return;
      const bal = Number(acc.currentBalance) || 0;
      if (acc.type === "credit_card" || bal < 0) {
        liabilities += Math.abs(bal);
      } else {
        assets += bal;
      }
    });

    return {
      assets,
      liabilities,
      netWorth: assets - liabilities
    };
  }
};

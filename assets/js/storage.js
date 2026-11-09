/**
 * storage.js — Capa de persistencia local y helpers de almacenamiento
 */
import { INITIAL_SUPPLIES, INITIAL_ORDERS, INITIAL_ACCOUNTING } from "./mockData.js";

const STORAGE_KEYS = {
  SUPPLIES: "supply_inventory_data",
  ORDERS: "supply_orders_data",
  ACCOUNTING: "supply_accounting_data",
  THEME: "supply_theme"
};

export const Storage = {
  // --- INSUMOS ---
  getSupplies() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUPPLIES);
      if (!raw) {
        this.saveSupplies(INITIAL_SUPPLIES);
        return [...INITIAL_SUPPLIES];
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Error leyendo suministros de localStorage, usando mock inicial:", e);
      return [...INITIAL_SUPPLIES];
    }
  },

  saveSupplies(supplies) {
    localStorage.setItem(STORAGE_KEYS.SUPPLIES, JSON.stringify(supplies));
  },

  // --- PEDIDOS ---
  getOrders() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (!raw) {
        this.saveOrders(INITIAL_ORDERS);
        return [...INITIAL_ORDERS];
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Error leyendo pedidos de localStorage, usando mock inicial:", e);
      return [...INITIAL_ORDERS];
    }
  },

  saveOrders(orders) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  },

  // --- CONTABILIDAD ---
  getAccounting() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTING);
      if (!raw) {
        this.saveAccounting(INITIAL_ACCOUNTING);
        return [...INITIAL_ACCOUNTING];
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Error leyendo contabilidad de localStorage, usando mock inicial:", e);
      return [...INITIAL_ACCOUNTING];
    }
  },

  saveAccounting(entries) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTING, JSON.stringify(entries));
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

  // --- UTILIDADES ---
  resetToMockData() {
    this.saveSupplies(INITIAL_SUPPLIES);
    this.saveOrders(INITIAL_ORDERS);
    this.saveAccounting(INITIAL_ACCOUNTING);
  },

  exportBackup() {
    const backup = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      supplies: this.getSupplies(),
      orders: this.getOrders(),
      accounting: this.getAccounting()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_insumos_contabilidad_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.supplies) && Array.isArray(data.orders) && Array.isArray(data.accounting)) {
        this.saveSupplies(data.supplies);
        this.saveOrders(data.orders);
        this.saveAccounting(data.accounting);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Error al importar backup JSON:", e);
      return false;
    }
  },

  /**
   * Determina el nivel de alerta del stock para un insumo
   * @param {Object} item 
   * @returns {'out_of_stock' | 'critical' | 'low' | 'optimal'}
   */
  getStockAlertLevel(item) {
    const stock = Number(item.currentStock) || 0;
    const critical = Number(item.criticalStock) || 0;
    const min = Number(item.minStock) || 0;

    if (stock <= 0) return "out_of_stock";
    if (stock <= critical) return "critical";
    if (stock <= min) return "low";
    return "optimal";
  }
};

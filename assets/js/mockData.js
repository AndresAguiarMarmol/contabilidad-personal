/**
 * mockData.js — Datos iniciales de demostración para Contabilidad Personal
 * Exportación universal para navegador (window.ContaPersonal.MockData) y Node.js.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ContaPersonal = root.ContaPersonal || {};
    root.ContaPersonal.MockData = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  
  // Limpieza total para producción multi-usuario (Spec 022)
  const INITIAL_ACCOUNTS = [];

  const INITIAL_CATEGORIES = [
    { id: "CAT-ALIM", name: "Alimentación & Supermercado", type: "expense", icon: "shopping-cart", color: "#f59e0b" },
    { id: "CAT-VIV", name: "Vivienda & Servicios", type: "expense", icon: "home", color: "#3b82f6" },
    { id: "CAT-TRAN", name: "Transporte & Combustible", type: "expense", icon: "car", color: "#64748b" },
    { id: "CAT-SAL", name: "Salud & Bienestar", type: "expense", icon: "heart-pulse", color: "#ef4444" },
    { id: "CAT-OCIO", name: "Ocio, Salidas & Restaurantes", type: "expense", icon: "utensils", color: "#8b5cf6" },
    { id: "CAT-ROPA", name: "Ropa & Cuidado Personal", type: "expense", icon: "shirt", color: "#ec4899" },
    { id: "CAT-EDUC", name: "Educación & Cursos", type: "expense", icon: "book-open", color: "#06b6d4" },
    { id: "CAT-OTRO-G", name: "Otros Gastos", type: "expense", icon: "tag", color: "#94a3b8" },
    { id: "CAT-SUELDO", name: "Sueldo & Salario", type: "income", icon: "briefcase", color: "#10b981" },
    { id: "CAT-FREE", name: "Honorarios & Freelance", type: "income", icon: "laptop", color: "#14b8a6" },
    { id: "CAT-REND", name: "Rendimientos & Inversiones", type: "income", icon: "trending-up", color: "#8b5cf6" },
    { id: "CAT-OTRO-I", name: "Otros Ingresos / Reembolsos", type: "income", icon: "plus-circle", color: "#10b981" }
  ];

  const INITIAL_TRANSACTIONS = [];

  const INITIAL_BUDGETS = [];

  const INITIAL_GOALS = [];

  return {
    INITIAL_ACCOUNTS,
    INITIAL_CATEGORIES,
    INITIAL_TRANSACTIONS,
    INITIAL_BUDGETS,
    INITIAL_GOALS
  };
});

/**
 * mockData.js — Datos iniciales de demostración para Contabilidad Personal
 */

export const INITIAL_ACCOUNTS = [
  {
    id: "ACC-001",
    name: "Banco Principal (Cuenta Corriente)",
    type: "bank",
    initialBalance: 650000,
    currentBalance: 650000,
    currency: "CLP",
    color: "#2563eb",
    icon: "building-2",
    isExcludedFromTotal: false
  },
  {
    id: "ACC-002",
    name: "Billetera Efectivo",
    type: "cash",
    initialBalance: 45000,
    currentBalance: 45000,
    currency: "CLP",
    color: "#16a34a",
    icon: "wallet",
    isExcludedFromTotal: false
  },
  {
    id: "ACC-003",
    name: "Billetera Digital (MercadoPago)",
    type: "wallet",
    initialBalance: 85000,
    currentBalance: 85000,
    currency: "CLP",
    color: "#0284c7",
    icon: "smartphone",
    isExcludedFromTotal: false
  },
  {
    id: "ACC-004",
    name: "Cuenta de Ahorro e Inversión",
    type: "savings",
    initialBalance: 1200000,
    currentBalance: 1200000,
    currency: "CLP",
    color: "#7c3aed",
    icon: "piggy-bank",
    isExcludedFromTotal: false
  },
  {
    id: "ACC-005",
    name: "Tarjeta de Crédito Visa",
    type: "credit_card",
    initialBalance: -120000,
    currentBalance: -120000,
    currency: "CLP",
    color: "#e11d48",
    icon: "credit-card",
    isExcludedFromTotal: false
  }
];

export const INITIAL_CATEGORIES = [
  // Gastos
  { id: "CAT-ALIM", name: "Alimentación & Supermercado", type: "expense", icon: "shopping-cart", color: "#f59e0b" },
  { id: "CAT-VIV", name: "Vivienda & Servicios", type: "expense", icon: "home", color: "#3b82f6" },
  { id: "CAT-TRAN", name: "Transporte & Combustible", type: "expense", icon: "car", color: "#64748b" },
  { id: "CAT-SAL", name: "Salud & Bienestar", type: "expense", icon: "heart-pulse", color: "#ef4444" },
  { id: "CAT-OCIO", name: "Ocio, Salidas & Restaurantes", type: "expense", icon: "utensils", color: "#8b5cf6" },
  { id: "CAT-ROPA", name: "Ropa & Cuidado Personal", type: "expense", icon: "shirt", color: "#ec4899" },
  { id: "CAT-EDUC", name: "Educación & Cursos", type: "expense", icon: "book-open", color: "#06b6d4" },
  { id: "CAT-OTRO-G", name: "Otros Gastos", type: "expense", icon: "tag", color: "#94a3b8" },
  // Ingresos
  { id: "CAT-SUELDO", name: "Sueldo & Salario", type: "income", icon: "briefcase", color: "#10b981" },
  { id: "CAT-FREE", name: "Honorarios & Freelance", type: "income", icon: "laptop", color: "#14b8a6" },
  { id: "CAT-REND", name: "Rendimientos & Inversiones", type: "income", icon: "trending-up", color: "#8b5cf6" },
  { id: "CAT-OTRO-I", name: "Otros Ingresos / Reembolsos", type: "income", icon: "plus-circle", color: "#10b981" }
];

export const INITIAL_TRANSACTIONS = [
  {
    id: "TX-2026-001",
    date: "2026-11-01T09:00:00Z",
    type: "income",
    accountId: "ACC-001",
    category: "Sueldo & Salario",
    amount: 1450000,
    description: "Depósito de sueldo mensual",
    paymentMethod: "transfer",
    isRecurring: true
  },
  {
    id: "TX-2026-002",
    date: "2026-11-02T10:30:00Z",
    type: "expense",
    accountId: "ACC-001",
    category: "Vivienda & Servicios",
    amount: 380000,
    description: "Pago de Alquiler mensual",
    paymentMethod: "transfer",
    isRecurring: true
  },
  {
    id: "TX-2026-003",
    date: "2026-11-03T18:45:00Z",
    type: "expense",
    accountId: "ACC-005",
    category: "Alimentación & Supermercado",
    amount: 145000,
    description: "Compra quincenal de supermercado",
    paymentMethod: "credit",
    isRecurring: false
  },
  {
    id: "TX-2026-004",
    date: "2026-11-04T12:15:00Z",
    type: "expense",
    accountId: "ACC-003",
    category: "Transporte & Combustible",
    amount: 35000,
    description: "Carga de combustible",
    paymentMethod: "debit",
    isRecurring: false
  },
  {
    id: "TX-2026-005",
    date: "2026-11-05T14:00:00Z",
    type: "expense",
    accountId: "ACC-005",
    category: "Vivienda & Servicios",
    amount: 28000,
    description: "Internet Fibra y suscripciones",
    paymentMethod: "credit",
    isRecurring: true
  },
  {
    id: "TX-2026-006",
    date: "2026-11-06T11:00:00Z",
    type: "expense",
    accountId: "ACC-001",
    category: "Salud & Bienestar",
    amount: 42000,
    description: "Farmacia y medicamentos",
    paymentMethod: "debit",
    isRecurring: false
  },
  {
    id: "TX-2026-007",
    date: "2026-11-07T21:30:00Z",
    type: "expense",
    accountId: "ACC-002",
    category: "Ocio, Salidas & Restaurantes",
    amount: 32000,
    description: "Cena de fin de semana con amigos",
    paymentMethod: "cash",
    isRecurring: false
  },
  {
    id: "TX-2026-008",
    date: "2026-11-08T16:00:00Z",
    type: "income",
    accountId: "ACC-003",
    category: "Honorarios & Freelance",
    amount: 180000,
    description: "Cobro trabajo freelance de diseño",
    paymentMethod: "transfer",
    isRecurring: false
  },
  {
    id: "TX-2026-009",
    date: "2026-11-08T19:20:00Z",
    type: "expense",
    accountId: "ACC-005",
    category: "Ocio, Salidas & Restaurantes",
    amount: 30000,
    description: "Entradas concierto y delivery",
    paymentMethod: "credit",
    isRecurring: false
  },
  {
    id: "TX-2026-010",
    date: "2026-11-09T08:30:00Z",
    type: "transfer",
    accountId: "ACC-001",
    toAccountId: "ACC-004",
    category: "Ahorro",
    amount: 150000,
    description: "Aporte mensual a Fondo de Emergencia",
    paymentMethod: "transfer",
    isRecurring: true
  }
];

export const INITIAL_BUDGETS = [
  {
    id: "BUD-001",
    category: "Alimentación & Supermercado",
    limitAmount: 200000,
    spentAmount: 145000,
    month: "2026-11"
  },
  {
    id: "BUD-002",
    category: "Vivienda & Servicios",
    limitAmount: 420000,
    spentAmount: 408000,
    month: "2026-11"
  },
  {
    id: "BUD-003",
    category: "Ocio, Salidas & Restaurantes",
    limitAmount: 50000,
    spentAmount: 62000,
    month: "2026-11"
  },
  {
    id: "BUD-004",
    category: "Transporte & Combustible",
    limitAmount: 60000,
    spentAmount: 35000,
    month: "2026-11"
  }
];

export const INITIAL_GOALS = [
  {
    id: "GOAL-001",
    title: "Fondo de Emergencia (6 Meses)",
    targetAmount: 2000000,
    currentAmount: 1200000,
    deadlineDate: "2027-06-30",
    color: "#10b981"
  },
  {
    id: "GOAL-002",
    title: "Vacaciones de Verano",
    targetAmount: 800000,
    currentAmount: 350000,
    deadlineDate: "2027-01-15",
    color: "#3b82f6"
  }
];

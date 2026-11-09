const test = require("node:test");
const assert = require("node:assert");
const {
  calcularPatrimonioNeto,
  calcularBalanceMes,
  calcularEjecucionPresupuesto
} = require("../assets/js/financeCalculations.js");

test("RF-3: calcularPatrimonioNeto suma activos y resta deudas de tarjetas", () => {
  const cuentas = [
    { id: "1", name: "Banco", type: "bank", currentBalance: 500000, isExcludedFromTotal: false },
    { id: "2", name: "Efectivo", type: "cash", currentBalance: 50000, isExcludedFromTotal: false },
    { id: "3", name: "Visa", type: "credit_card", currentBalance: -100000, isExcludedFromTotal: false },
    { id: "4", name: "Ahorro", type: "savings", currentBalance: 200000, isExcludedFromTotal: false },
    { id: "5", name: "Excluida", type: "bank", currentBalance: 999999, isExcludedFromTotal: true }
  ];

  const resultado = calcularPatrimonioNeto(cuentas);
  // Activos: 500.000 + 50.000 + 200.000 = 750.000
  // Deudas: 100.000
  // Neto: 750.000 - 100.000 = 650.000
  assert.strictEqual(resultado.assets, 750000);
  assert.strictEqual(resultado.liabilities, 100000);
  assert.strictEqual(resultado.netWorth, 650000);
});

test("RF-4: calcularBalanceMes suma ingresos, gastos, calcula saldo neto y tasa de ahorro", () => {
  const transacciones = [
    { type: "income", amount: 1000000, category: "Sueldo", date: "2026-11-01" },
    { type: "expense", amount: 300000, category: "Alquiler", date: "2026-11-02" },
    { type: "expense", amount: 200000, category: "Supermercado", date: "2026-11-03" },
    { type: "transfer", amount: 50000, category: "Ahorro", date: "2026-11-04" }
  ];

  const resultado = calcularBalanceMes(transacciones);
  assert.strictEqual(resultado.income, 1000000);
  assert.strictEqual(resultado.expense, 500000);
  assert.strictEqual(resultado.netSavings, 500000);
  assert.strictEqual(resultado.savingsRate, 50); // 50%
  assert.strictEqual(resultado.categoryExpenses["Alquiler"], 300000);
  assert.strictEqual(resultado.categoryExpenses["Supermercado"], 200000);
});

test("RF-4 Caso límite: calcularBalanceMes con ingresos cero o negativos no divide por cero", () => {
  const transacciones = [
    { type: "expense", amount: 80000, category: "Varios", date: "2026-11-05" }
  ];

  const resultado = calcularBalanceMes(transacciones);
  assert.strictEqual(resultado.income, 0);
  assert.strictEqual(resultado.expense, 80000);
  assert.strictEqual(resultado.netSavings, -80000);
  assert.strictEqual(resultado.savingsRate, 0); // No debe ser NaN o infinito
});

test("Presupuestos: calcularEjecucionPresupuesto calcula porcentaje y estado de semáforo", () => {
  // Caso 1: Óptimo (<= 75%)
  const opt = calcularEjecucionPresupuesto(50000, 100000);
  assert.strictEqual(opt.percentage, 50);
  assert.strictEqual(opt.status, "optimal");

  // Caso 2: Alerta / Atención (> 75% y <= 100%)
  const warn = calcularEjecucionPresupuesto(85000, 100000);
  assert.strictEqual(warn.percentage, 85);
  assert.strictEqual(warn.status, "warning");

  // Caso 3: Excedido (> 100%)
  const exc = calcularEjecucionPresupuesto(120000, 100000);
  assert.strictEqual(exc.percentage, 120);
  assert.strictEqual(exc.status, "exceeded");
});


const test = require("node:test");
const assert = require("node:assert");
const {
  validarPresupuesto,
  calcularGastoCategoriaMes,
  sincronizarPresupuestosConTransacciones
} = require("../assets/js/financeCalculations.js");

test("RF-2: validarPresupuesto rechaza datos vacíos o monto límite menor o igual a cero", () => {
  const res1 = validarPresupuesto(null);
  assert.strictEqual(res1.valida, false);

  const res2 = validarPresupuesto({ category: "Alimentación & Supermercado", limitAmount: 0 });
  assert.strictEqual(res2.valida, false);
  assert.match(res2.error, /límite.*mayor a cero/i);

  const res3 = validarPresupuesto({ category: "Alimentación & Supermercado", limitAmount: -10000 });
  assert.strictEqual(res3.valida, false);
});

test("RF-2: validarPresupuesto rechaza categoría vacía", () => {
  const res = validarPresupuesto({ category: "   ", limitAmount: 150000 });
  assert.strictEqual(res.valida, false);
  assert.match(res.error, /categoría/i);
});

test("RF-2: validarPresupuesto aprueba datos válidos", () => {
  const res = validarPresupuesto({
    category: "Alimentación & Supermercado",
    limitAmount: 250000,
    month: "2026-11"
  });
  assert.strictEqual(res.valida, true);
});

test("RF-3: calcularGastoCategoriaMes suma correctamente los gastos del mes para la categoría", () => {
  const transactions = [
    {
      type: "expense",
      category: "Alimentación & Supermercado",
      amount: 45000,
      date: "2026-11-02T10:00:00Z"
    },
    {
      type: "expense",
      category: "Alimentación & Supermercado",
      amount: 55000,
      date: "2026-11-15T15:00:00Z"
    },
    {
      type: "expense",
      category: "Transporte & Combustible",
      amount: 30000,
      date: "2026-11-05T12:00:00Z"
    },
    {
      type: "expense",
      category: "Alimentación & Supermercado",
      amount: 40000,
      date: "2026-10-25T10:00:00Z" // Otro mes
    },
    {
      type: "income",
      category: "Alimentación & Supermercado",
      amount: 100000,
      date: "2026-11-01T08:00:00Z" // Ingreso, no debe sumarse
    }
  ];

  const total = calcularGastoCategoriaMes(transactions, "Alimentación & Supermercado", "2026-11");
  assert.strictEqual(total, 100000); // 45.000 + 55.000
});

test("RF-3: calcularGastoCategoriaMes incluye partidas split de gasto de la categoría", () => {
  const transactions = [
    {
      type: "expense",
      amount: 150000,
      date: "2026-11-08T18:00:00Z",
      isSplit: true,
      splitLines: [
        { id: "1", amount: 60000, category: "Alimentación & Supermercado" },
        { id: "2", amount: 90000, category: "Ocio, Salidas & Restaurantes" }
      ]
    },
    {
      type: "expense",
      amount: 1000000,
      date: "2026-11-09T12:00:00Z",
      isSplit: true,
      splitLines: [
        { id: "1", amount: 80000, category: "Activos del Hogar", targetAccountId: "ACC-006" } // Transferencia a cuenta de activo, no es consumo
      ]
    }
  ];

  const total = calcularGastoCategoriaMes(transactions, "Alimentación & Supermercado", "2026-11");
  assert.strictEqual(total, 60000);
});

test("RF-3: sincronizarPresupuestosConTransacciones recalcula los gastados inmutablemente", () => {
  const budgets = [
    {
      id: "BUD-001",
      category: "Alimentación & Supermercado",
      limitAmount: 200000,
      spentAmount: 0,
      month: "2026-11"
    },
    {
      id: "BUD-002",
      category: "Transporte & Combustible",
      limitAmount: 50000,
      spentAmount: 0,
      month: "2026-11"
    }
  ];

  const transactions = [
    { type: "expense", category: "Alimentación & Supermercado", amount: 75000, date: "2026-11-03T10:00:00Z" },
    { type: "expense", category: "Transporte & Combustible", amount: 20000, date: "2026-11-04T12:00:00Z" }
  ];

  const actualizados = sincronizarPresupuestosConTransacciones(budgets, transactions);

  assert.notStrictEqual(actualizados, budgets);
  assert.strictEqual(actualizados[0].spentAmount, 75000);
  assert.strictEqual(actualizados[1].spentAmount, 20000);
  // Presupuesto original no mutado
  assert.strictEqual(budgets[0].spentAmount, 0);
});

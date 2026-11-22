const test = require("node:test");
const assert = require("node:assert");
const Calculations = require("../assets/js/financeCalculations.js");

test("Spec 025 - RF-2: recalcularBalancesCuentas calcula balances deterministas con gastos, ingresos y transferencias", () => {
  assert.strictEqual(typeof Calculations.recalcularBalancesCuentas, "function", "recalcularBalancesCuentas debe ser una función");

  const cuentas = [
    { id: "ACC-1", name: "Banco Chile", initialBalance: 1000, currentBalance: 1000, currency: "CLP" },
    { id: "ACC-2", name: "Billetera", initialBalance: 500, currentBalance: 500, currency: "CLP" }
  ];

  const transacciones = [
    { id: "TX-1", type: "expense", amount: 200, accountId: "ACC-1" },
    { id: "TX-2", type: "income", amount: 300, accountId: "ACC-2" },
    { id: "TX-3", type: "transfer", amount: 100, accountId: "ACC-1", toAccountId: "ACC-2" }
  ];

  const resultado = Calculations.recalcularBalancesCuentas(cuentas, transacciones);

  const acc1 = resultado.find(a => a.id === "ACC-1");
  const acc2 = resultado.find(a => a.id === "ACC-2");

  // ACC-1: 1000 - 200 (gasto) - 100 (transferencia origen) = 700
  assert.strictEqual(acc1.currentBalance, 700);
  // ACC-2: 500 + 300 (ingreso) + 100 (transferencia destino) = 900
  assert.strictEqual(acc2.currentBalance, 900);
});

test("Spec 025 - RF-2: recalcularBalancesCuentas soporta transferencias multidivisa y partidas split", () => {
  const cuentas = [
    { id: "ACC-CLP", name: "Cuenta Corriente CLP", initialBalance: 100000, currentBalance: 100000, currency: "CLP" },
    { id: "ACC-USD", name: "Billetera USD", initialBalance: 50, currentBalance: 50, currency: "USD" },
    { id: "ACC-SAV", name: "Cuenta Ahorro CLP", initialBalance: 10000, currentBalance: 10000, currency: "CLP" }
  ];

  const transacciones = [
    // Transferencia multidivisa: 95000 CLP enviados, 100 USD acreditados
    {
      id: "TX-FX",
      type: "transfer",
      amount: 95000,
      toAmount: 100,
      accountId: "ACC-CLP",
      toAccountId: "ACC-USD"
    },
    // Movimiento dividido (Split): 5000 CLP debitados de ACC-CLP, 2000 asignados a ahorro ACC-SAV y 3000 a gasto
    {
      id: "TX-SPLIT",
      type: "expense",
      isSplit: true,
      amount: 5000,
      accountId: "ACC-CLP",
      splitLines: [
        { id: "L-1", amount: 3000, category: "Alimentación" },
        { id: "L-2", amount: 2000, targetAccountId: "ACC-SAV" }
      ]
    }
  ];

  const resultado = Calculations.recalcularBalancesCuentas(cuentas, transacciones);

  const accClp = resultado.find(a => a.id === "ACC-CLP");
  const accUsd = resultado.find(a => a.id === "ACC-USD");
  const accSav = resultado.find(a => a.id === "ACC-SAV");

  // ACC-CLP: 100000 - 95000 - 5000 = 0
  assert.strictEqual(accClp.currentBalance, 0);
  // ACC-USD: 50 + 100 = 150
  assert.strictEqual(accUsd.currentBalance, 150);
  // ACC-SAV: 10000 + 2000 = 12000
  assert.strictEqual(accSav.currentBalance, 12000);
});

test("Spec 025 - RF-4: Edición de movimiento recalcula balances con precisión contable", () => {
  const cuentas = [
    { id: "ACC-1", name: "Tarjeta Crédito", initialBalance: -50000, currentBalance: -50000, currency: "CLP" }
  ];

  // Movimiento original de gasto por 20000
  let transacciones = [
    { id: "TX-1", type: "expense", amount: 20000, description: "Compra Supermercado", accountId: "ACC-1" }
  ];

  let cuentasActualizadas = Calculations.recalcularBalancesCuentas(cuentas, transacciones);
  assert.strictEqual(cuentasActualizadas[0].currentBalance, -70000);

  // Usuario edita el movimiento: monto corregido a 35000
  transacciones = transacciones.map(t => {
    if (t.id === "TX-1") {
      return { ...t, amount: 35000, description: "Compra Supermercado Grande" };
    }
    return t;
  });

  cuentasActualizadas = Calculations.recalcularBalancesCuentas(cuentas, transacciones);
  // Balance: -50000 - 35000 = -85000
  assert.strictEqual(cuentasActualizadas[0].currentBalance, -85000);
});

test("Spec 025 - RF-5: Eliminación de movimiento restaura el saldo contable previo", () => {
  const cuentas = [
    { id: "ACC-1", name: "Caja Chica", initialBalance: 50000, currentBalance: 50000, currency: "CLP" }
  ];

  const tx1 = { id: "TX-1", type: "expense", amount: 15000, accountId: "ACC-1" };
  const tx2 = { id: "TX-2", type: "income", amount: 5000, accountId: "ACC-1" };

  let transacciones = [tx1, tx2];
  let cuentasActualizadas = Calculations.recalcularBalancesCuentas(cuentas, transacciones);
  // 50000 - 15000 + 5000 = 40000
  assert.strictEqual(cuentasActualizadas[0].currentBalance, 40000);

  // Eliminar TX-1
  transacciones = transacciones.filter(t => t.id !== "TX-1");
  cuentasActualizadas = Calculations.recalcularBalancesCuentas(cuentas, transacciones);
  // 50000 + 5000 = 55000
  assert.strictEqual(cuentasActualizadas[0].currentBalance, 55000);
});

test("Spec 025 - RF-6: fusionarEstadoContable respeta deletedTransactions impidiendo resurrección", () => {
  const localState = {
    accounts: [{ id: "ACC-1", name: "Banco", initialBalance: 1000, currentBalance: 1000 }],
    transactions: [],
    deletedTransactions: ["TX-1"] // Localmente se eliminó TX-1
  };

  const remoteState = {
    accounts: [{ id: "ACC-1", name: "Banco", initialBalance: 1000, currentBalance: 800 }],
    transactions: [
      { id: "TX-1", type: "expense", amount: 200, accountId: "ACC-1" },
      { id: "TX-2", type: "expense", amount: 100, accountId: "ACC-1" }
    ],
    deletedTransactions: []
  };

  const fusion = Calculations.fusionarEstadoContable(localState, remoteState);

  // TX-1 no debe resucitar porque está en deletedTransactions
  const txIds = fusion.mergedState.transactions.map(t => t.id);
  assert.ok(!txIds.includes("TX-1"), "TX-1 eliminada no debe aparecer en las transacciones fusionadas");
  assert.ok(txIds.includes("TX-2"), "TX-2 debe conservarse");

  // Las lápidas unificadas deben contener TX-1
  assert.ok(fusion.mergedState.deletedTransactions.includes("TX-1"));

  // El saldo de ACC-1 debe considerar únicamente TX-2 (1000 - 100 = 900)
  const acc = fusion.mergedState.accounts.find(a => a.id === "ACC-1");
  assert.strictEqual(acc.currentBalance, 900);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const Calculations = require('../assets/js/financeCalculations.js');

test('RF-1: fusionarEstadoContable existe en Calculations', () => {
  assert.equal(typeof Calculations.fusionarEstadoContable, 'function');
});

test('RF-1: fusionarEstadoContable une transacciones de PC y de iPhone sin duplicación', () => {
  const local = {
    accounts: [{ id: "acc-1", name: "Banco", initialBalance: 100000, currentBalance: 70000 }],
    transactions: [
      { id: "tx-pc-1", date: "2026-11-18", type: "expense", accountId: "acc-1", amount: 30000, description: "Supermercado en PC" }
    ],
    budgets: [],
    goals: [],
    planAccounts: []
  };

  const remote = {
    accounts: [{ id: "acc-1", name: "Banco", initialBalance: 100000, currentBalance: 85000 }],
    transactions: [
      { id: "tx-iphone-1", date: "2026-11-18", type: "expense", accountId: "acc-1", amount: 15000, description: "Café en iPhone" }
    ],
    budgets: [],
    goals: [],
    planAccounts: []
  };

  const result = Calculations.fusionarEstadoContable(local, remote);

  assert.equal(result.mergedState.transactions.length, 2);
  const txIds = result.mergedState.transactions.map(t => t.id);
  assert.ok(txIds.includes("tx-pc-1"));
  assert.ok(txIds.includes("tx-iphone-1"));
  assert.equal(result.hasChangesFromRemote, true);
  assert.equal(result.newTransactionsFromRemote, 1);
});

test('RF-1: fusionarEstadoContable recalcula correctamente el balance contable de cuentas combinadas', () => {
  const local = {
    accounts: [{ id: "acc-1", name: "Banco", initialBalance: 100000, currentBalance: 70000 }],
    transactions: [
      { id: "tx-pc-1", date: "2026-11-17", type: "expense", accountId: "acc-1", amount: 30000, description: "Compra PC" }
    ],
    budgets: [],
    goals: [],
    planAccounts: []
  };

  const remote = {
    accounts: [{ id: "acc-1", name: "Banco", initialBalance: 100000, currentBalance: 85000 }],
    transactions: [
      { id: "tx-iphone-1", date: "2026-11-18", type: "expense", accountId: "acc-1", amount: 15000, description: "Gasto iPhone" },
      { id: "tx-iphone-2", date: "2026-11-18", type: "income", accountId: "acc-1", amount: 50000, description: "Abono iPhone" }
    ],
    budgets: [],
    goals: [],
    planAccounts: []
  };

  // Saldo esperado: 100000 (inicial) - 30000 (gasto PC) - 15000 (gasto iPhone) + 50000 (ingreso iPhone) = 105000
  const result = Calculations.fusionarEstadoContable(local, remote);
  const cuentaCombinada = result.mergedState.accounts.find(a => a.id === "acc-1");

  assert.equal(cuentaCombinada.currentBalance, 105000);
});

test('RF-1: fusionarEstadoContable incorpora cuentas y metas nuevas de cualquier dispositivo', () => {
  const local = {
    accounts: [{ id: "acc-1", name: "Banco PC", initialBalance: 50000, currentBalance: 50000 }],
    transactions: [],
    budgets: [{ id: "b-1", category: "Alimentación", limitAmount: 100000 }],
    goals: [{ id: "g-1", title: "Meta PC", targetAmount: 200000, currentAmount: 50000 }],
    planAccounts: []
  };

  const remote = {
    accounts: [
      { id: "acc-1", name: "Banco PC", initialBalance: 50000, currentBalance: 50000 },
      { id: "acc-2", name: "Billetera iPhone", initialBalance: 20000, currentBalance: 20000 }
    ],
    transactions: [],
    budgets: [{ id: "b-2", category: "Transporte", limitAmount: 40000 }],
    goals: [{ id: "g-2", title: "Meta iPhone", targetAmount: 300000, currentAmount: 10000 }],
    planAccounts: [{ id: "p-sub-1", code: "5.1.01.01", name: "Panadería", parentCode: "5.1.01", isSubaccount: true }]
  };

  const result = Calculations.fusionarEstadoContable(local, remote);

  assert.equal(result.mergedState.accounts.length, 2);
  assert.equal(result.mergedState.budgets.length, 2);
  assert.equal(result.mergedState.goals.length, 2);
  assert.equal(result.mergedState.planAccounts.length, 1);
});

test('RF-1: fusionarEstadoContable opera de forma defensiva con datos nulos o vacíos', () => {
  const local = {
    accounts: [{ id: "acc-1", name: "Efectivo", initialBalance: 10000, currentBalance: 10000 }],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: []
  };

  const resultNull = Calculations.fusionarEstadoContable(local, null);
  assert.equal(resultNull.mergedState.accounts.length, 1);
  assert.equal(resultNull.hasChangesFromRemote, false);

  const resultEmpty = Calculations.fusionarEstadoContable(null, local);
  assert.equal(resultEmpty.mergedState.accounts.length, 1);
});

// ========================================================
// SPEC 016: ELIMINACIÓN DEFINITIVA (TOMBSTONES) Y PRECEDENCIA LOCAL
// ========================================================

test('Spec 016 - RF-2: Subcuenta eliminada localmente no resucita aunque exista en el estado remoto de Firestore', () => {
  const local = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [],
    deletedPlanAccounts: ["1.1.02.02", "PLAN-ACC-999"]
  };

  const remote = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [
      { id: "PLAN-ACC-999", code: "1.1.02.02", name: "Cuenta Antigua Que Debe Morir", parentCode: "1.1.02", isSubaccount: true },
      { id: "PLAN-ACC-888", code: "5.1.01.01", name: "Subcuenta Activa", parentCode: "5.1.01", isSubaccount: true }
    ],
    deletedPlanAccounts: []
  };

  const result = Calculations.fusionarEstadoContable(local, remote);
  const encontrada = result.mergedState.planAccounts.find(p => p.code === "1.1.02.02" || p.id === "PLAN-ACC-999");

  assert.equal(encontrada, undefined, "La subcuenta eliminada 1.1.02.02 NO debe resucitar");
  assert.equal(result.mergedState.planAccounts.length, 1, "Solo debe quedar la subcuenta activa");
  assert.ok(result.mergedState.deletedPlanAccounts.includes("1.1.02.02"), "La lista de eliminados unificada debe conservar 1.1.02.02");
});

test('Spec 016 - RF-2: Subcuenta eliminada en remoto es purgada de los datos locales sin resucitar', () => {
  const local = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [
      { id: "P-1", code: "5.1.01.01", name: "Subcuenta Borrada en Otro Dispositivo", parentCode: "5.1.01", isSubaccount: true }
    ],
    deletedPlanAccounts: []
  };

  const remote = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [],
    deletedPlanAccounts: ["5.1.01.01"]
  };

  const result = Calculations.fusionarEstadoContable(local, remote);
  const encontrada = result.mergedState.planAccounts.find(p => p.code === "5.1.01.01");

  assert.equal(encontrada, undefined, "La subcuenta eliminada en el otro dispositivo debe ser purgada");
  assert.ok(result.mergedState.deletedPlanAccounts.includes("5.1.01.01"));
});

test('Spec 016 - RF-2: Presupuestos y metas eliminados no resucitan durante la fusión', () => {
  const local = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [],
    deletedBudgets: ["b-del-1"],
    deletedGoals: ["g-del-1"]
  };

  const remote = {
    accounts: [],
    transactions: [],
    budgets: [
      { id: "b-del-1", category: "Ocio", limitAmount: 50000 },
      { id: "b-act-2", category: "Alimentación", limitAmount: 100000 }
    ],
    goals: [
      { id: "g-del-1", title: "Meta Borrada", targetAmount: 100000 },
      { id: "g-act-2", title: "Meta Activa", targetAmount: 200000 }
    ],
    planAccounts: []
  };

  const result = Calculations.fusionarEstadoContable(local, remote);

  assert.equal(result.mergedState.budgets.length, 1, "El presupuesto eliminado no debe resucitar");
  assert.equal(result.mergedState.budgets[0].id, "b-act-2");
  assert.equal(result.mergedState.goals.length, 1, "La meta eliminada no debe resucitar");
  assert.equal(result.mergedState.goals[0].id, "g-act-2");
});

test('Spec 016 - RF-6: Las modificaciones locales de atributos de cuentas prevalecen sobre el estado remoto de la nube', () => {
  const local = {
    accounts: [
      { id: "ACC-001", name: "BancoEstado Cuenta RUT", type: "bank", color: "#e11d48", initialBalance: 500000, currentBalance: 500000 }
    ],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: []
  };

  const remote = {
    accounts: [
      { id: "ACC-001", name: "Banco Principal (Cuenta Corriente)", type: "bank", color: "#2563eb", initialBalance: 500000, currentBalance: 500000 }
    ],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: []
  };

  const result = Calculations.fusionarEstadoContable(local, remote);
  const cuenta = result.mergedState.accounts.find(a => a.id === "ACC-001");

  assert.equal(cuenta.name, "BancoEstado Cuenta RUT", "El nombre editado localmente debe conservarse y tener precedencia");
  assert.equal(cuenta.color, "#e11d48", "El color editado localmente debe conservarse");
});

test('Spec 016 - RF-6: obtenerCatalogoPlanCuentas actualiza el nombre del catálogo cuando una cuenta vinculada es renombrada', () => {
  const cuentasPersonalizadas = [];
  const cuentasFinancieras = [
    { id: "ACC-001", name: "BancoEstado Cuenta RUT", type: "bank", currentBalance: 500000 }
  ];

  const catalogo = Calculations.obtenerCatalogoPlanCuentas(cuentasPersonalizadas, cuentasFinancieras, []);
  const itemBanco = catalogo.find(c => c.financialAccountId === "ACC-001");

  assert.ok(itemBanco, "Debe existir el elemento del catálogo vinculado a ACC-001");
  assert.equal(itemBanco.name, "BancoEstado Cuenta RUT", "El nombre en el catálogo contable debe reflejar el nombre de la cuenta financiera");
});

// ========================================================
// SPEC 017: CRUD CUENTAS FINANCIERAS Y PREVENCIÓN DE RESURRECCIÓN
// ========================================================

test('Spec 017 - RF-6: Cuenta financiera eliminada localmente no resucita aunque exista en Firestore', () => {
  const local = {
    accounts: [
      { id: "ACC-001", name: "Banco Principal", type: "bank", initialBalance: 100000, currentBalance: 100000 }
    ],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [],
    deletedAccounts: ["ACC-002", "ACC-005"]
  };

  const remote = {
    accounts: [
      { id: "ACC-001", name: "Banco Principal", type: "bank", initialBalance: 100000, currentBalance: 100000 },
      { id: "ACC-002", name: "Efectivo", type: "cash", initialBalance: 20000, currentBalance: 20000 },
      { id: "ACC-005", name: "Tarjeta de Crédito", type: "credit_card", initialBalance: 0, currentBalance: 0 }
    ],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [],
    deletedAccounts: []
  };

  const result = Calculations.fusionarEstadoContable(local, remote);
  const ids = result.mergedState.accounts.map(a => a.id);

  assert.deepStrictEqual(ids, ["ACC-001"], "Las cuentas en deletedAccounts no deben resucitar");
  assert.ok(result.mergedState.deletedAccounts.includes("ACC-002"));
  assert.ok(result.mergedState.deletedAccounts.includes("ACC-005"));
});

test('Spec 017 - RF-6: Cuenta financiera eliminada remotamente es purgada de los datos locales sin resucitar', () => {
  const local = {
    accounts: [
      { id: "ACC-001", name: "Banco Principal", type: "bank", initialBalance: 100000, currentBalance: 100000 },
      { id: "ACC-003", name: "Billetera Digital", type: "wallet", initialBalance: 30000, currentBalance: 30000 }
    ],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [],
    deletedAccounts: []
  };

  const remote = {
    accounts: [
      { id: "ACC-001", name: "Banco Principal", type: "bank", initialBalance: 100000, currentBalance: 100000 }
    ],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [],
    deletedAccounts: ["ACC-003"]
  };

  const result = Calculations.fusionarEstadoContable(local, remote);
  const ids = result.mergedState.accounts.map(a => a.id);

  assert.deepStrictEqual(ids, ["ACC-001"], "La cuenta eliminada en remoto debe ser purgada");
  assert.ok(result.mergedState.deletedAccounts.includes("ACC-003"));
});


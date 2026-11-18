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

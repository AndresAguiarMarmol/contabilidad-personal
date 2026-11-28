const { test } = require('node:test');
const assert = require('node:assert/strict');
const Calculations = require('../assets/js/financeCalculations.js');

test('Spec 051 - R2: fusionarEstadoContable adopta cuenta remota cuando remote.updatedAt es más reciente', () => {
  const local = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [
      {
        id: "P-5-1-01",
        code: "5.1.01",
        name: "Luz",
        classNumber: 5,
        updatedAt: "2026-11-26T10:00:00.000Z"
      }
    ]
  };

  const remote = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [
      {
        id: "P-5-1-01",
        code: "5.1.01",
        name: "Alquileres, Gastos Comunes, Jardinería, Reparaciones",
        classNumber: 5,
        updatedAt: "2026-11-27T15:30:00.000Z"
      }
    ]
  };

  const result = Calculations.fusionarEstadoContable(local, remote);
  const plan = result.mergedState.planAccounts;
  const acc5101 = plan.find(p => p.code === "5.1.01");

  assert.ok(acc5101, "La cuenta 5.1.01 debe existir en el plan fusionado");
  assert.equal(acc5101.name, "Alquileres, Gastos Comunes, Jardinería, Reparaciones");
  assert.equal(result.hasPlanAccountsUpdated, true);
  assert.equal(result.hasChangesFromRemote, true);
});

test('Spec 051 - R2: fusionarEstadoContable preserva cuenta local cuando local.updatedAt es más reciente', () => {
  const local = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [
      {
        id: "P-5-1-01",
        code: "5.1.01",
        name: "Alquileres y Gastos Comunes",
        classNumber: 5,
        updatedAt: "2026-11-28T09:00:00.000Z"
      }
    ]
  };

  const remote = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [
      {
        id: "P-5-1-01",
        code: "5.1.01",
        name: "Luz",
        classNumber: 5,
        updatedAt: "2026-11-27T12:00:00.000Z"
      }
    ]
  };

  const result = Calculations.fusionarEstadoContable(local, remote);
  const plan = result.mergedState.planAccounts;
  const acc5101 = plan.find(p => p.code === "5.1.01");

  assert.ok(acc5101);
  assert.equal(acc5101.name, "Alquileres y Gastos Comunes");
  assert.equal(result.hasPlanAccountsUpdated, false);
});

test('Spec 051 - R2: migración heredada si la cuenta local no tiene updatedAt pero la remota sí', () => {
  const local = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [
      {
        id: "P-5-1-01",
        code: "5.1.01",
        name: "Luz",
        classNumber: 5
      }
    ]
  };

  const remote = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [
      {
        id: "P-5-1-01",
        code: "5.1.01",
        name: "Alquileres, Gastos Comunes, Jardinería, Reparaciones",
        classNumber: 5,
        updatedAt: "2026-11-27T18:00:00.000Z"
      }
    ]
  };

  const result = Calculations.fusionarEstadoContable(local, remote);
  const plan = result.mergedState.planAccounts;
  const acc5101 = plan.find(p => p.code === "5.1.01");

  assert.equal(acc5101.name, "Alquileres, Gastos Comunes, Jardinería, Reparaciones");
  assert.equal(result.hasPlanAccountsUpdated, true);
  assert.equal(result.hasChangesFromRemote, true);
});

test('Spec 051 - R3: cuentas en deletedPlanAccounts no se resucitan en la fusión', () => {
  const local = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [],
    deletedPlanAccounts: ["5.1.01.99"]
  };

  const remote = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [
      {
        id: "PLAN-DEL-1",
        code: "5.1.01.99",
        name: "Subcuenta Antigua",
        classNumber: 5,
        updatedAt: "2026-11-28T09:00:00.000Z"
      }
    ],
    deletedPlanAccounts: []
  };

  const result = Calculations.fusionarEstadoContable(local, remote);
  const plan = result.mergedState.planAccounts;
  assert.equal(plan.some(p => p.code === "5.1.01.99"), false);
});

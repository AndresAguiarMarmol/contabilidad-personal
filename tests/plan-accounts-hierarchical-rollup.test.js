const { test } = require('node:test');
const assert = require('node:assert/strict');
const Calculations = require('../assets/js/financeCalculations.js');

test('Spec 052 - R1: cuenta padre con 3 hijos de 1, 2 y 3 totaliza 6 en periodMovement', () => {
  const customPlanAccounts = [
    {
      id: "P-5-1-01",
      code: "5.1.01",
      name: "Alquileres, Gastos Comunes, Jardinería, Reparaciones",
      classNumber: 5,
      classType: "expense",
      isSystem: true
    },
    {
      id: "P-5-1-01-01",
      code: "5.1.01.01",
      name: "Hijo 1",
      parentCode: "5.1.01",
      classNumber: 5,
      classType: "expense",
      isSubaccount: true
    },
    {
      id: "P-5-1-01-02",
      code: "5.1.01.02",
      name: "Hijo 2",
      parentCode: "5.1.01",
      classNumber: 5,
      classType: "expense",
      isSubaccount: true
    },
    {
      id: "P-5-1-01-03",
      code: "5.1.01.03",
      name: "Hijo 3",
      parentCode: "5.1.01",
      classNumber: 5,
      classType: "expense",
      isSubaccount: true
    }
  ];

  const transactions = [
    { id: "tx-1", type: "expense", categoryCode: "5.1.01.01", category: "Hijo 1", amount: 1 },
    { id: "tx-2", type: "expense", categoryCode: "5.1.01.02", category: "Hijo 2", amount: 2 },
    { id: "tx-3", type: "expense", categoryCode: "5.1.01.03", category: "Hijo 3", amount: 3 }
  ];

  const catalog = Calculations.obtenerCatalogoPlanCuentas(customPlanAccounts, [], transactions);

  const parent = catalog.find(c => c.code === "5.1.01");
  const child1 = catalog.find(c => c.code === "5.1.01.01");
  const child2 = catalog.find(c => c.code === "5.1.01.02");
  const child3 = catalog.find(c => c.code === "5.1.01.03");

  assert.ok(parent, "Debe existir la cuenta padre 5.1.01");
  assert.equal(child1.periodMovement, 1);
  assert.equal(child2.periodMovement, 2);
  assert.equal(child3.periodMovement, 3);
  assert.equal(parent.periodMovement, 6, "La cuenta padre debe totalizar la sumatoria de las cuentas hijos (1 + 2 + 3 = 6)");
});

test('Spec 052 - R1: cuenta padre con movimientos directos previos suma sus directos más los de sus hijos', () => {
  const customPlanAccounts = [
    {
      id: "P-5-1-01",
      code: "5.1.01",
      name: "Alquileres, Gastos Comunes, Jardinería, Reparaciones",
      classNumber: 5,
      classType: "expense"
    },
    {
      id: "P-5-1-01-01",
      code: "5.1.01.01",
      name: "Hijo 1",
      parentCode: "5.1.01",
      classNumber: 5,
      classType: "expense"
    }
  ];

  const transactions = [
    { id: "tx-p", type: "expense", categoryCode: "5.1.01", category: "Alquileres Directo", amount: 4 },
    { id: "tx-c1", type: "expense", categoryCode: "5.1.01.01", category: "Hijo 1", amount: 6 }
  ];

  const catalog = Calculations.obtenerCatalogoPlanCuentas(customPlanAccounts, [], transactions);
  const parent = catalog.find(c => c.code === "5.1.01");

  assert.equal(parent.periodMovement, 10, "4 directos + 6 del hijo = 10");
});

test('Spec 052 - R1: cuenta padre de Clase 1 (Activos) totaliza balance de cuentas bancarias asociadas', () => {
  const mockAccounts = [
    { id: "ACC-001", name: "Banco Principal", type: "bank", currentBalance: 1500000 },
    { id: "ACC-002", name: "Banco Secundario", type: "bank", currentBalance: 500000 }
  ];

  const catalog = Calculations.obtenerCatalogoPlanCuentas([], mockAccounts, []);
  const parentBank = catalog.find(c => c.code === "1.1.02");

  assert.ok(parentBank, "Debe existir la cuenta padre 1.1.02");
  assert.equal(parentBank.balance, 2000000, "1.1.02 debe totalizar 1.500.000 + 500.000 = 2.000.000");
});

test('Spec 052 - R2: consolidación multinivel (hijo de hijo)', () => {
  const customPlanAccounts = [
    { id: "P-5-1-01", code: "5.1.01", name: "Padre", classNumber: 5, classType: "expense" },
    { id: "P-5-1-01-01", code: "5.1.01.01", name: "Hijo", parentCode: "5.1.01", classNumber: 5, classType: "expense" },
    { id: "P-5-1-01-01-01", code: "5.1.01.01.01", name: "Nieto", parentCode: "5.1.01.01", classNumber: 5, classType: "expense" }
  ];

  const transactions = [
    { id: "tx-grandchild", type: "expense", categoryCode: "5.1.01.01.01", category: "Nieto", amount: 15 },
    { id: "tx-child", type: "expense", categoryCode: "5.1.01.01", category: "Hijo", amount: 5 }
  ];

  const catalog = Calculations.obtenerCatalogoPlanCuentas(customPlanAccounts, [], transactions);
  const grandchild = catalog.find(c => c.code === "5.1.01.01.01");
  const child = catalog.find(c => c.code === "5.1.01.01");
  const parent = catalog.find(c => c.code === "5.1.01");

  assert.equal(grandchild.periodMovement, 15);
  assert.equal(child.periodMovement, 20, "5 directo + 15 del nieto = 20");
  assert.equal(parent.periodMovement, 20, "Hijo consolidado de 20 sube al padre");
});

test('Spec 052 - R3: calcularResumenPlanCuentas no duplica totales de clase al totalizar padres e hijos', () => {
  const customPlanAccounts = [
    { id: "P-5-1-01", code: "5.1.01", name: "Padre", classNumber: 5, classType: "expense" },
    { id: "P-5-1-01-01", code: "5.1.01.01", name: "Hijo 1", parentCode: "5.1.01", classNumber: 5, classType: "expense" },
    { id: "P-5-1-01-02", code: "5.1.01.02", name: "Hijo 2", parentCode: "5.1.01", classNumber: 5, classType: "expense" },
    { id: "P-5-1-01-03", code: "5.1.01.03", name: "Hijo 3", parentCode: "5.1.01", classNumber: 5, classType: "expense" }
  ];

  const transactions = [
    { id: "tx-1", type: "expense", categoryCode: "5.1.01.01", category: "Hijo 1", amount: 1 },
    { id: "tx-2", type: "expense", categoryCode: "5.1.01.02", category: "Hijo 2", amount: 2 },
    { id: "tx-3", type: "expense", categoryCode: "5.1.01.03", category: "Hijo 3", amount: 3 }
  ];

  const catalog = Calculations.obtenerCatalogoPlanCuentas(customPlanAccounts, [], transactions);
  const resumen = Calculations.calcularResumenPlanCuentas(catalog);

  assert.equal(resumen.totalExpenses, 6, "El total de gastos debe ser 6, no 12 (sin doble conteo)");
});

const test = require("node:test");
const assert = require("node:assert/strict");
const Calculations = require("../assets/js/financeCalculations.js");

test("RF-2: Catalogo base de Plan de Cuentas Personal contiene las 5 clases contables y cuentas clave", () => {
  assert.equal(typeof Calculations.obtenerCatalogoPlanCuentas, "function");

  const catalogo = Calculations.obtenerCatalogoPlanCuentas([], [], []);
  assert.ok(Array.isArray(catalogo));
  assert.ok(catalogo.length >= 25, `El catálogo debe tener al menos 25 cuentas, tiene ${catalogo.length}`);

  // Verificar que existan las 5 clases contables
  const clases = new Set(catalogo.map(c => c.classNumber));
  assert.ok(clases.has(1), "Debe incluir Clase 1: Activos");
  assert.ok(clases.has(2), "Debe incluir Clase 2: Pasivos");
  assert.ok(clases.has(3), "Debe incluir Clase 3: Patrimonio");
  assert.ok(clases.has(4), "Debe incluir Clase 4: Ingresos");
  assert.ok(clases.has(5), "Debe incluir Clase 5: Gastos");

  // Verificar cuentas esenciales de finanzas personales
  const codigos = new Set(catalogo.map(c => c.code));
  assert.ok(codigos.has("1.1.01"), "Debe tener Efectivo (1.1.01)");
  assert.ok(codigos.has("1.1.02"), "Debe tener Cuentas Bancarias (1.1.02)");
  assert.ok(codigos.has("2.1.01"), "Debe tener Tarjetas de Crédito (2.1.01)");
  assert.ok(codigos.has("4.1.01"), "Debe tener Sueldo y Salario (4.1.01)");
  assert.ok(codigos.has("5.2.01"), "Debe tener Supermercado y Despensa (5.2.01)");
});

test("RF-2 y RF-3: obtenerCatalogoPlanCuentas integra cuentas financieras y calcula saldos de balance e ingresos/gastos", () => {
  const mockAccounts = [
    { id: "ACC-001", name: "Banco Principal", type: "bank", currentBalance: 500000 },
    { id: "ACC-005", name: "Tarjeta Visa", type: "credit_card", currentBalance: -120000 }
  ];

  const mockTransactions = [
    { id: "TX-1", type: "income", amount: 1200000, category: "Sueldo & Salario", accountId: "ACC-001" },
    { id: "TX-2", type: "expense", amount: 80000, category: "Alimentación & Supermercado", accountId: "ACC-001" }
  ];

  const catalogo = Calculations.obtenerCatalogoPlanCuentas([], mockAccounts, mockTransactions);

  // Cuenta bancaria en activo
  const cuentaBanco = catalogo.find(c => c.financialAccountId === "ACC-001" || c.name.includes("Banco Principal"));
  assert.ok(cuentaBanco, "Debe mapear o incluir el Banco Principal en Activos");
  assert.equal(cuentaBanco.balance, 500000);

  // Tarjeta de crédito en pasivo
  const tarjeta = catalogo.find(c => c.financialAccountId === "ACC-005" || c.name.includes("Tarjeta Visa"));
  assert.ok(tarjeta, "Debe mapear o incluir la Tarjeta en Pasivos");
  assert.equal(tarjeta.balance, 120000); // Saldo adeudado

  // Cuenta de gasto con movimiento acumulado
  const gastoSuper = catalogo.find(c => c.code === "5.2.01" || c.name.includes("Supermercado"));
  assert.ok(gastoSuper, "Debe existir cuenta de Supermercado");
  assert.equal(gastoSuper.periodMovement, 80000);

  // Cuenta de ingreso con movimiento acumulado
  const ingresoSueldo = catalogo.find(c => c.code === "4.1.01" || c.name.includes("Sueldo"));
  assert.ok(ingresoSueldo, "Debe existir cuenta de Sueldo");
  assert.equal(ingresoSueldo.periodMovement, 1200000);
});

test("RF-3: calcularResumenPlanCuentas calcula Activos, Pasivos, Patrimonio Neto, Ingresos, Gastos y Resultado", () => {
  const mockCatalogo = [
    { code: "1.1.01", classNumber: 1, balance: 1000000, periodMovement: 0 },
    { code: "2.1.01", classNumber: 2, balance: 200000, periodMovement: 0 },
    { code: "3.1.01", classNumber: 3, balance: 800000, periodMovement: 0 },
    { code: "4.1.01", classNumber: 4, balance: 0, periodMovement: 1500000 },
    { code: "5.1.01", classNumber: 5, balance: 0, periodMovement: 600000 }
  ];

  const resumen = Calculations.calcularResumenPlanCuentas(mockCatalogo);
  assert.equal(resumen.totalAssets, 1000000);
  assert.equal(resumen.totalLiabilities, 200000);
  assert.equal(resumen.netWorth, 800000); // 1.000.000 - 200.000
  assert.equal(resumen.totalIncome, 1500000);
  assert.equal(resumen.totalExpenses, 600000);
  assert.equal(resumen.netResult, 900000); // 1.500.000 - 600.000
});

test("RF-5 y RF-6: validarCuentaPlan valida código, nombre y clase contable", () => {
  const existentes = [
    { id: "P-1", code: "1.1.01", name: "Efectivo", classNumber: 1 }
  ];

  // Rechaza código vacío
  const resVacio = Calculations.validarCuentaPlan({ code: "", name: "Mi Cuenta", classNumber: 1 }, existentes);
  assert.equal(resVacio.valida, false);

  // Rechaza código duplicado
  const resDup = Calculations.validarCuentaPlan({ code: "1.1.01", name: "Otra Cuenta", classNumber: 1 }, existentes);
  assert.equal(resDup.valida, false);

  // Rechaza clase inválida
  const resClase = Calculations.validarCuentaPlan({ code: "9.9.99", name: "Invalida", classNumber: 9 }, existentes);
  assert.equal(resClase.valida, false);

  // Aprueba cuenta válida
  const resOk = Calculations.validarCuentaPlan({ code: "1.3.05", name: "Instrumentos Musicales", classNumber: 1, groupName: "Bienes Personales" }, existentes);
  assert.equal(resOk.valida, true);
});

test("RF-7: puedeEliminarCuentaPlan protege cuentas del sistema o con movimientos", () => {
  const cuentaSistema = { id: "P-SYS", isSystem: true, name: "Efectivo", code: "1.1.01" };
  const cuentaConMovimiento = { id: "P-CUSTOM-1", isSystem: false, name: "Caja Chica Secundaria", code: "1.1.01.02", periodMovement: 25000, balance: 0 };
  const cuentaLibre = { id: "P-CUSTOM-2", isSystem: false, name: "Cuenta Sin Uso", code: "1.3.99", periodMovement: 0, balance: 0 };

  const check1 = Calculations.puedeEliminarCuentaPlan(cuentaSistema);
  assert.equal(check1.puede, false);

  const check2 = Calculations.puedeEliminarCuentaPlan(cuentaConMovimiento);
  assert.equal(check2.puede, false);

  const check3 = Calculations.puedeEliminarCuentaPlan(cuentaLibre);
  assert.equal(check3.puede, true);
});

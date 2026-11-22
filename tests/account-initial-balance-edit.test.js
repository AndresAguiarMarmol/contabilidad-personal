// tests/account-initial-balance-edit.test.js — Pruebas unitarias para Spec 026: Edición de Saldo Inicial en Cuentas
const test = require("node:test");
const assert = require("node:assert/strict");
const Calculations = require("../assets/js/financeCalculations.js");

test("Spec 026 - RF-2: validarEdicionCuenta valida correctamente el saldo inicial", () => {
  const cuentas = [{ id: "ACC-001", name: "Banco Estado" }];

  // Saldo inicial válido (positivo, cero, negativo)
  const resPos = Calculations.validarEdicionCuenta({ name: "Banco Estado", type: "bank", initialBalance: 150000 }, cuentas, "ACC-001");
  assert.equal(resPos.valida, true);

  const resCero = Calculations.validarEdicionCuenta({ name: "Banco Estado", type: "bank", initialBalance: 0 }, cuentas, "ACC-001");
  assert.equal(resCero.valida, true);

  const resNeg = Calculations.validarEdicionCuenta({ name: "Banco Estado", type: "bank", initialBalance: -25000 }, cuentas, "ACC-001");
  assert.equal(resNeg.valida, true);

  // Cadena numérica válida
  const resStr = Calculations.validarEdicionCuenta({ name: "Banco Estado", type: "bank", initialBalance: "500000" }, cuentas, "ACC-001");
  assert.equal(resStr.valida, true);

  // Valor no numérico o inválido
  const resInvalido = Calculations.validarEdicionCuenta({ name: "Banco Estado", type: "bank", initialBalance: "abc" }, cuentas, "ACC-001");
  assert.equal(resInvalido.valida, false);
  assert.match(resInvalido.error, /saldo inicial/i);

  const resNaN = Calculations.validarEdicionCuenta({ name: "Banco Estado", type: "bank", initialBalance: NaN }, cuentas, "ACC-001");
  assert.equal(resNaN.valida, false);
});

test("Spec 026 - RF-4: normalizarSaldoInicialCuenta aplica la regla de deuda en tarjetas de crédito", () => {
  // En activos (banco, caja, ahorros, billeteras), se preserva el número
  assert.equal(Calculations.normalizarSaldoInicialCuenta("bank", 100000), 100000);
  assert.equal(Calculations.normalizarSaldoInicialCuenta("savings", 5000000), 5000000);
  assert.equal(Calculations.normalizarSaldoInicialCuenta("cash", 0), 0);
  assert.equal(Calculations.normalizarSaldoInicialCuenta("wallet", 35000), 35000);

  // En tarjeta de crédito, saldo positivo ingresado se convierte en deuda negativa
  assert.equal(Calculations.normalizarSaldoInicialCuenta("credit_card", 80000), -80000);
  // Si ya se ingresa negativo, se mantiene negativo
  assert.equal(Calculations.normalizarSaldoInicialCuenta("credit_card", -45000), -45000);
  // Cero se mantiene en cero
  assert.equal(Calculations.normalizarSaldoInicialCuenta("credit_card", 0), 0);
});

test("Spec 026 - RF-3: Modificación de saldo inicial en cuenta sin movimientos recalcula balance inmediatamente", () => {
  const cuentaAhorro = {
    id: "ACC-SAV-01",
    name: "Ahorro Plazo Fijo",
    type: "savings",
    initialBalance: 0,
    currentBalance: 0,
    currency: "CLP"
  };

  // El usuario edita la cuenta y le asigna un capital inicial de 3.000.000
  const nuevoSaldoInicial = Calculations.normalizarSaldoInicialCuenta(cuentaAhorro.type, 3000000);
  cuentaAhorro.initialBalance = nuevoSaldoInicial;

  const cuentasActualizadas = Calculations.recalcularBalancesCuentas([cuentaAhorro], []);
  assert.equal(cuentasActualizadas[0].initialBalance, 3000000);
  assert.equal(cuentasActualizadas[0].currentBalance, 3000000);
});

test("Spec 026 - RF-3: Modificación de saldo inicial en cuenta con movimientos existentes recalcula balance con precisión", () => {
  const cuentaBancaria = {
    id: "ACC-BANK-01",
    name: "Cuenta Corriente",
    type: "bank",
    initialBalance: 0,
    currentBalance: 70000,
    currency: "CLP"
  };

  const movimientos = [
    { id: "TX-1", accountId: "ACC-BANK-01", type: "income", amount: 100000 },
    { id: "TX-2", accountId: "ACC-BANK-01", type: "expense", amount: 30000 }
  ];

  // Supongamos que la cuenta comenzó en 0 (saldo actual = 70.000), y luego el usuario recuerda que comenzó con 500.000 de capital
  const nuevoSaldoInicial = Calculations.normalizarSaldoInicialCuenta(cuentaBancaria.type, 500000);
  cuentaBancaria.initialBalance = nuevoSaldoInicial;

  const cuentasActualizadas = Calculations.recalcularBalancesCuentas([cuentaBancaria], movimientos);
  // Balance esperado: 500.000 + 100.000 - 30.000 = 570.000
  assert.equal(cuentasActualizadas[0].initialBalance, 500000);
  assert.equal(cuentasActualizadas[0].currentBalance, 570000);
});

test("Spec 026 - RF-3 & RF-4: Edición de saldo inicial en tarjeta de crédito con pagos y consumos", () => {
  const tarjeta = {
    id: "ACC-CARD-01",
    name: "Tarjeta CMR",
    type: "credit_card",
    initialBalance: 0,
    currentBalance: -50000,
    currency: "CLP"
  };

  const movimientos = [
    { id: "TX-CARD-1", accountId: "ACC-CARD-01", type: "expense", amount: 50000 } // Consumo de 50.000
  ];

  // El usuario indica que la tarjeta ya traía una deuda inicial de 20.000 (ingresa 20000 en el input)
  const nuevoSaldoInicial = Calculations.normalizarSaldoInicialCuenta(tarjeta.type, 20000);
  tarjeta.initialBalance = nuevoSaldoInicial;

  const cuentasActualizadas = Calculations.recalcularBalancesCuentas([tarjeta], movimientos);
  // Balance esperado: -20.000 (deuda inicial) - 50.000 (consumo) = -70.000
  assert.equal(cuentasActualizadas[0].initialBalance, -20000);
  assert.equal(cuentasActualizadas[0].currentBalance, -70000);
});

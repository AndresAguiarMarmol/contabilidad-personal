const test = require("node:test");
const assert = require("node:assert");
const {
  validarNuevaCuenta,
  crearCuentaObjeto
} = require("../assets/js/financeCalculations.js");

test("RF-2: validarNuevaCuenta rechaza nombre vacío o compuesto por espacios", () => {
  const cuentasExistentes = [{ id: "1", name: "Banco Estado" }];
  const res1 = validarNuevaCuenta({ name: "", type: "bank", initialBalance: 1000 }, cuentasExistentes);
  assert.strictEqual(res1.valida, false);
  assert.match(res1.error, /nombre/i);

  const res2 = validarNuevaCuenta({ name: "   ", type: "bank", initialBalance: 1000 }, cuentasExistentes);
  assert.strictEqual(res2.valida, false);
});

test("RF-2: validarNuevaCuenta rechaza nombre duplicado insensible a mayúsculas", () => {
  const cuentasExistentes = [
    { id: "1", name: "Banco Santander" },
    { id: "2", name: "Billetera Efectivo" }
  ];

  const res1 = validarNuevaCuenta({ name: "banco santander", type: "bank" }, cuentasExistentes);
  assert.strictEqual(res1.valida, false);
  assert.match(res1.error, /ya existe/i);

  const res2 = validarNuevaCuenta({ name: "  Billetera Efectivo  ", type: "cash" }, cuentasExistentes);
  assert.strictEqual(res2.valida, false);
});

test("RF-2: validarNuevaCuenta rechaza tipo de cuenta no soportado", () => {
  const cuentas = [];
  const res = validarNuevaCuenta({ name: "Caja Fuerte", type: "cripto_desconocido" }, cuentas);
  assert.strictEqual(res.valida, false);
  assert.match(res.error, /tipo/i);
});

test("RF-2: validarNuevaCuenta aprueba datos de cuenta correctos", () => {
  const cuentas = [{ id: "1", name: "Banco Estado" }];
  const res = validarNuevaCuenta({ name: "Banco Scotiabank", type: "bank", initialBalance: 50000 }, cuentas);
  assert.strictEqual(res.valida, true);
});

test("RF-3 y RF-4: crearCuentaObjeto construye el objeto con icono, color y saldo contable adecuado", () => {
  // Cuenta bancaria estándar
  const acc1 = crearCuentaObjeto({
    name: "Banco BCI",
    type: "bank",
    initialBalance: 250000,
    currency: "CLP"
  });

  assert.strictEqual(acc1.name, "Banco BCI");
  assert.strictEqual(acc1.type, "bank");
  assert.strictEqual(acc1.initialBalance, 250000);
  assert.strictEqual(acc1.currentBalance, 250000);
  assert.strictEqual(acc1.icon, "building-2");
  assert.strictEqual(acc1.color, "#2563eb");
  assert.strictEqual(acc1.isExcludedFromTotal, false);
  assert.match(acc1.id, /^ACC-/);

  // Tarjeta de crédito con deuda inicial positiva (debe convertirse en saldo negativo)
  const acc2 = crearCuentaObjeto({
    name: "Tarjeta Mastercard",
    type: "credit_card",
    initialBalance: 80000,
    currency: "CLP"
  });

  assert.strictEqual(acc2.type, "credit_card");
  assert.strictEqual(acc2.initialBalance, -80000);
  assert.strictEqual(acc2.currentBalance, -80000);
  assert.strictEqual(acc2.icon, "credit-card");
  assert.strictEqual(acc2.color, "#e11d48");
});


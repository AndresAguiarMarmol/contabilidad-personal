const test = require("node:test");
const assert = require("node:assert");
const {
  validarTransaccion,
  aplicarTransaccionEnCuentas
} = require("../assets/js/financeCalculations.js");

test("RF-4: validarTransaccion rechaza monto menor o igual a cero", () => {
  const txInvalida1 = { amount: 0, description: "Café", accountId: "ACC-001", type: "expense" };
  const res1 = validarTransaccion(txInvalida1);
  assert.strictEqual(res1.valida, false);
  assert.match(res1.error, /monto/i);

  const txInvalida2 = { amount: -5000, description: "Café", accountId: "ACC-001", type: "expense" };
  const res2 = validarTransaccion(txInvalida2);
  assert.strictEqual(res2.valida, false);
});

test("RF-4: validarTransaccion rechaza descripción vacía", () => {
  const tx = { amount: 15000, description: "   ", accountId: "ACC-001", type: "expense" };
  const res = validarTransaccion(tx);
  assert.strictEqual(res.valida, false);
  assert.match(res.error, /descripci/i);
});

test("RF-4: validarTransaccion rechaza transferencia si las cuentas son idénticas o falta destino", () => {
  const txMismaCuenta = {
    amount: 20000,
    description: "Auto-transferencia",
    accountId: "ACC-001",
    toAccountId: "ACC-001",
    type: "transfer"
  };
  const res1 = validarTransaccion(txMismaCuenta);
  assert.strictEqual(res1.valida, false);
  assert.match(res1.error, /distinta/i);

  const txSinDestino = {
    amount: 20000,
    description: "Transferencia sin destino",
    accountId: "ACC-001",
    type: "transfer"
  };
  const res2 = validarTransaccion(txSinDestino);
  assert.strictEqual(res2.valida, false);
});

test("RF-4: validarTransaccion aprueba movimientos con todos los campos correctos", () => {
  const gastoValido = {
    amount: 45000,
    description: "Cena familiar",
    accountId: "ACC-001",
    category: "Ocio",
    type: "expense"
  };
  assert.strictEqual(validarTransaccion(gastoValido).valida, true);

  const transValida = {
    amount: 100000,
    description: "Ahorro mensual",
    accountId: "ACC-001",
    toAccountId: "ACC-002",
    type: "transfer"
  };
  assert.strictEqual(validarTransaccion(transValida).valida, true);
});

test("RF-5: aplicarTransaccionEnCuentas debita el monto al registrar un gasto", () => {
  const cuentas = [
    { id: "ACC-001", currentBalance: 500000 },
    { id: "ACC-002", currentBalance: 100000 }
  ];
  const gasto = { accountId: "ACC-001", amount: 120000, type: "expense" };

  const nuevasCuentas = aplicarTransaccionEnCuentas(cuentas, gasto);
  const c1 = nuevasCuentas.find(c => c.id === "ACC-001");
  const c2 = nuevasCuentas.find(c => c.id === "ACC-002");

  assert.strictEqual(c1.currentBalance, 380000);
  assert.strictEqual(c2.currentBalance, 100000);
  // Verificar inmutabilidad: el array original no debe modificarse
  assert.strictEqual(cuentas[0].currentBalance, 500000);
});

test("RF-6: aplicarTransaccionEnCuentas acredita el monto al registrar un ingreso", () => {
  const cuentas = [{ id: "ACC-001", currentBalance: 300000 }];
  const ingreso = { accountId: "ACC-001", amount: 250000, type: "income" };

  const nuevasCuentas = aplicarTransaccionEnCuentas(cuentas, ingreso);
  assert.strictEqual(nuevasCuentas[0].currentBalance, 550000);
});

test("RF-7: aplicarTransaccionEnCuentas debita origen y acredita destino en transferencias", () => {
  const cuentas = [
    { id: "ACC-001", currentBalance: 400000 },
    { id: "ACC-002", currentBalance: 150000 }
  ];
  const transferencia = {
    accountId: "ACC-001",
    toAccountId: "ACC-002",
    amount: 80000,
    type: "transfer"
  };

  const nuevasCuentas = aplicarTransaccionEnCuentas(cuentas, transferencia);
  const origen = nuevasCuentas.find(c => c.id === "ACC-001");
  const destino = nuevasCuentas.find(c => c.id === "ACC-002");

  assert.strictEqual(origen.currentBalance, 320000);
  assert.strictEqual(destino.currentBalance, 230000);
});

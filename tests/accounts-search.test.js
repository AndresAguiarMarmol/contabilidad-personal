const test = require("node:test");
const assert = require("node:assert");

const {
  filtrarCuentasFinancieras
} = require("../assets/js/financeCalculations.js");

const CUENTAS_PRUEBA = [
  {
    id: "ACC-1",
    name: "Banco de Chile (Cuenta Corriente)",
    type: "bank",
    currency: "CLP",
    currentBalance: 750000
  },
  {
    id: "ACC-2",
    name: "Billetera Efectivo Diario",
    type: "cash",
    currency: "CLP",
    currentBalance: 35000
  },
  {
    id: "ACC-3",
    name: "MercadoPago Digital",
    type: "wallet",
    currency: "CLP",
    currentBalance: 120000
  },
  {
    id: "ACC-4",
    name: "Cuenta Ahorro Dólares",
    type: "savings",
    currency: "USD",
    currentBalance: 1500
  },
  {
    id: "ACC-5",
    name: "Tarjeta de Crédito Santander Visa",
    type: "credit_card",
    currency: "CLP",
    currentBalance: -250000
  }
];

test("Spec 023 - RF-3: filtrarCuentasFinancieras retorna la lista completa si el término está vacío", () => {
  assert.strictEqual(filtrarCuentasFinancieras(CUENTAS_PRUEBA, "").length, 5);
  assert.strictEqual(filtrarCuentasFinancieras(CUENTAS_PRUEBA, "   ").length, 5);
  assert.strictEqual(filtrarCuentasFinancieras(CUENTAS_PRUEBA, null).length, 5);
  assert.strictEqual(filtrarCuentasFinancieras(CUENTAS_PRUEBA, undefined).length, 5);
});

test("Spec 023 - RF-2: filtrarCuentasFinancieras filtra por nombre insensible a mayúsculas y acentos", () => {
  // Búsqueda simple
  const resBanco = filtrarCuentasFinancieras(CUENTAS_PRUEBA, "banco");
  assert.strictEqual(resBanco.length, 1);
  assert.strictEqual(resBanco[0].id, "ACC-1");

  // Búsqueda con acento inverso ("chíle" vs "Chile")
  const resChile = filtrarCuentasFinancieras(CUENTAS_PRUEBA, "chíle");
  assert.strictEqual(resChile.length, 1);
  assert.strictEqual(resChile[0].id, "ACC-1");

  // Búsqueda en mayúsculas
  const resSantander = filtrarCuentasFinancieras(CUENTAS_PRUEBA, "SANTANDER");
  assert.strictEqual(resSantander.length, 1);
  assert.strictEqual(resSantander[0].id, "ACC-5");
});

test("Spec 023 - RF-2: filtrarCuentasFinancieras filtra por tipo de cuenta en español o técnico", () => {
  // "tarjeta" o "credito" encuentra la tarjeta de crédito
  const resCredito = filtrarCuentasFinancieras(CUENTAS_PRUEBA, "credito");
  assert.ok(resCredito.some(c => c.id === "ACC-5"));

  // "efectivo" encuentra la billetera de efectivo
  const resEfectivo = filtrarCuentasFinancieras(CUENTAS_PRUEBA, "efectivo");
  assert.ok(resEfectivo.some(c => c.id === "ACC-2"));

  // "ahorro" encuentra la cuenta de ahorro
  const resAhorro = filtrarCuentasFinancieras(CUENTAS_PRUEBA, "ahorro");
  assert.ok(resAhorro.some(c => c.id === "ACC-4"));
});

test("Spec 023 - RF-2: filtrarCuentasFinancieras filtra por código de divisa", () => {
  const resUSD = filtrarCuentasFinancieras(CUENTAS_PRUEBA, "USD");
  assert.strictEqual(resUSD.length, 1);
  assert.strictEqual(resUSD[0].currency, "USD");

  const resCLP = filtrarCuentasFinancieras(CUENTAS_PRUEBA, "clp");
  assert.strictEqual(resCLP.length, 4);
});

test("Spec 023 - RF-4: filtrarCuentasFinancieras retorna array vacío cuando no hay coincidencias", () => {
  const resNada = filtrarCuentasFinancieras(CUENTAS_PRUEBA, "cuenta-inexistente-xyz");
  assert.ok(Array.isArray(resNada));
  assert.strictEqual(resNada.length, 0);
});

test("Spec 023 - RNF-3: filtrarCuentasFinancieras opera de forma defensiva ante entradas nulas o anómalas", () => {
  assert.deepStrictEqual(filtrarCuentasFinancieras(null, "banco"), []);
  assert.deepStrictEqual(filtrarCuentasFinancieras("no-un-array", "banco"), []);
  assert.deepStrictEqual(filtrarCuentasFinancieras([null, undefined, {}, { name: "Test" }], "test").length, 1);
});

const test = require("node:test");
const assert = require("node:assert");

const {
  puedeAccederApp,
  crearEstadoInicialLimpio,
  purgarDatosDemoLocales
} = require("../assets/js/financeCalculations.js");

const mockData = require("../assets/js/mockData.js");

test("Spec 022 - RF-1: puedeAccederApp rechaza accesos sin sesión o sin UID/token", () => {
  assert.strictEqual(puedeAccederApp(null), false);
  assert.strictEqual(puedeAccederApp({}), false);
  assert.strictEqual(puedeAccederApp({ uid: "" }), false);
  assert.strictEqual(puedeAccederApp({ uid: "user-123" }), false, "Requiere token de acceso");
  assert.strictEqual(puedeAccederApp({ idToken: "jwt-token" }), false, "Requiere UID");
});

test("Spec 022 - RF-1: puedeAccederApp aprueba usuarios con sesión activa y token", () => {
  const sesionActiva = {
    uid: "USER-ABC-123",
    email: "usuario@ejemplo.com",
    idToken: "token-valido-jwt",
    refreshToken: "refresh-valido"
  };
  assert.strictEqual(puedeAccederApp(sesionActiva), true);
});

test("Spec 022 - RF-4: crearEstadoInicialLimpio genera una estructura completamente vacía de cuentas y transacciones", () => {
  const estadoLimpio = crearEstadoInicialLimpio("USER-999", "admin@contabilidad.cl");

  assert.ok(Array.isArray(estadoLimpio.accounts), "Accounts debe ser un array");
  assert.strictEqual(estadoLimpio.accounts.length, 0, "No debe contener cuentas de demostración");

  assert.ok(Array.isArray(estadoLimpio.transactions), "Transactions debe ser un array");
  assert.strictEqual(estadoLimpio.transactions.length, 0, "No debe contener transacciones de prueba");

  assert.ok(Array.isArray(estadoLimpio.budgets));
  assert.strictEqual(estadoLimpio.budgets.length, 0);

  assert.ok(Array.isArray(estadoLimpio.goals));
  assert.strictEqual(estadoLimpio.goals.length, 0);

  assert.ok(Array.isArray(estadoLimpio.currencies));
  assert.ok(estadoLimpio.currencies.length >= 1, "Debe preservar al menos la moneda base CLP");
});

test("Spec 022 - RF-4: purgarDatosDemoLocales filtra registros que contengan identificadores de prueba semilla", () => {
  const listaCuentas = [
    { id: "ACC-001", name: "Banco de Chile (Demo)" },
    { id: "ACC-002", name: "Billetera Efectivo (Demo)" },
    { id: "ACC-REAL-1", name: "Mi Cuenta Corriente Real" }
  ];

  const filtradas = purgarDatosDemoLocales(listaCuentas, "accounts");
  assert.strictEqual(filtradas.length, 1);
  assert.strictEqual(filtradas[0].id, "ACC-REAL-1");
});

test("Spec 022 - RF-4: mockData debe tener las semillas demo vacías para cuentas y movimientos", () => {
  assert.strictEqual(mockData.INITIAL_ACCOUNTS.length, 0, "INITIAL_ACCOUNTS debe estar limpio");
  assert.strictEqual(mockData.INITIAL_TRANSACTIONS.length, 0, "INITIAL_TRANSACTIONS debe estar limpio");
  assert.strictEqual(mockData.INITIAL_BUDGETS.length, 0, "INITIAL_BUDGETS debe estar limpio");
  assert.strictEqual(mockData.INITIAL_GOALS.length, 0, "INITIAL_GOALS debe estar limpio");
});

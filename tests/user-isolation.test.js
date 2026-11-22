const test = require("node:test");
const assert = require("node:assert");
const Calculations = require("../assets/js/financeCalculations.js");

// Mock simple de localStorage para pruebas en entorno Node.js
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.window = globalThis.window || {};
globalThis.window.localStorage = new MockLocalStorage();

const Storage = require("../assets/js/storage.js");

test("Spec 024 - RF-1: obtenerClaveStorage deriva correctamente claves con prefijo por UID y respeta claves globales", () => {
  assert.strictEqual(typeof Calculations.obtenerClaveStorage, "function", "obtenerClaveStorage debe ser una función");

  // Partición por UID para claves contables privadas
  const claveAndresAcc = Calculations.obtenerClaveStorage("finance_accounts_data", "usr_andres_123");
  assert.strictEqual(claveAndresAcc, "finance_usr_andres_123_accounts_data");

  const claveEsposaTx = Calculations.obtenerClaveStorage("finance_transactions_data", "usr_esposa_456");
  assert.strictEqual(claveEsposaTx, "finance_usr_esposa_456_transactions_data");

  const claveSinPrefijo = Calculations.obtenerClaveStorage("budgets_data", "usr_andres_123");
  assert.strictEqual(claveSinPrefijo, "finance_usr_andres_123_budgets_data");

  // Sin UID debe retornar la clave original
  assert.strictEqual(Calculations.obtenerClaveStorage("finance_accounts_data", null), "finance_accounts_data");
  assert.strictEqual(Calculations.obtenerClaveStorage("finance_accounts_data", ""), "finance_accounts_data");
  assert.strictEqual(Calculations.obtenerClaveStorage("finance_accounts_data", undefined), "finance_accounts_data");

  // Claves de dispositivo/configuración no se particionan por UID
  assert.strictEqual(Calculations.obtenerClaveStorage("finance_theme", "usr_andres_123"), "finance_theme");
  assert.strictEqual(Calculations.obtenerClaveStorage("finance_auth_session", "usr_andres_123"), "finance_auth_session");
  assert.strictEqual(Calculations.obtenerClaveStorage("finance_remote_db_config", "usr_andres_123"), "finance_remote_db_config");
});

test("Spec 024 - RF-2 & RF-3: Storage particiona los datos por UID activo impidiendo mezcla entre cónyuges", () => {
  globalThis.window.localStorage.clear();

  // 1. Usuario Andres inicia sesión
  Storage.setActiveUid("usr_andres_123");
  assert.strictEqual(Storage.getActiveUid(), "usr_andres_123");

  // Guardar cuentas de Andres
  const cuentasAndres = [
    { id: "ACC-A01", name: "Banco de Chile - Andres", type: "bank", currentBalance: 500000, currency: "CLP" },
    { id: "ACC-A02", name: "Billetera Efectivo Andres", type: "cash", currentBalance: 25000, currency: "CLP" }
  ];
  Storage.saveAccounts(cuentasAndres);

  // Verificar que se guardó en su clave de namespace
  const rawAndres = globalThis.window.localStorage.getItem("finance_usr_andres_123_accounts_data");
  assert.ok(rawAndres, "Debe existir la clave particionada para Andres");
  assert.strictEqual(JSON.parse(rawAndres).length, 2);

  // 2. Conmutar a la cuenta de su esposa en el mismo navegador
  Storage.setActiveUid("usr_esposa_456");
  assert.strictEqual(Storage.getActiveUid(), "usr_esposa_456");

  // La esposa debe arrancar con su propio espacio limpio (0 cuentas de Andres)
  const cuentasEsposaInicial = Storage.getAccounts();
  assert.deepStrictEqual(cuentasEsposaInicial, [], "La esposa no debe ver ninguna cuenta de Andres");

  // Guardar cuentas de la esposa
  const cuentasEsposa = [
    { id: "ACC-E01", name: "Banco Santander - Esposa", type: "bank", currentBalance: 750000, currency: "CLP" }
  ];
  Storage.saveAccounts(cuentasEsposa);

  // Verificar que se guardó en la clave de la esposa
  const rawEsposa = globalThis.window.localStorage.getItem("finance_usr_esposa_456_accounts_data");
  assert.ok(rawEsposa, "Debe existir la clave particionada para la esposa");
  assert.strictEqual(JSON.parse(rawEsposa).length, 1);

  // 3. Volver al usuario Andres
  Storage.setActiveUid("usr_andres_123");
  const cuentasAndresRecuperadas = Storage.getAccounts();
  assert.strictEqual(cuentasAndresRecuperadas.length, 2);
  assert.strictEqual(cuentasAndresRecuperadas[0].name, "Banco de Chile - Andres");
  assert.strictEqual(cuentasAndresRecuperadas[1].name, "Billetera Efectivo Andres");

  // No contiene la cuenta de su esposa
  assert.ok(!cuentasAndresRecuperadas.some(c => c.id === "ACC-E01"));
});

test("Spec 024 - RF-4 & RF-5: Lápidas de eliminación están aisladas por UID para permitir descontaminar", () => {
  globalThis.window.localStorage.clear();

  // Supongamos que en la sesión de Andres se mezcló por error la cuenta ACC-E01
  Storage.setActiveUid("usr_andres_123");
  Storage.saveDeletedAccounts(["ACC-E01"]);

  assert.deepStrictEqual(Storage.getDeletedAccounts(), ["ACC-E01"]);
  assert.ok(globalThis.window.localStorage.getItem("finance_usr_andres_123_deleted_accounts_data"));

  // En la sesión de la esposa, su lista de eliminados está completamente intacta
  Storage.setActiveUid("usr_esposa_456");
  assert.deepStrictEqual(Storage.getDeletedAccounts(), [], "Las lápidas de Andres no deben afectar a su esposa");
});

test("Spec 024 - RF-4: Cierre de sesión y purga desconecta el UID activo y previene fugas", () => {
  globalThis.window.localStorage.clear();

  Storage.saveAuthSession({ uid: "usr_andres_123", email: "andres@test.com", idToken: "tok123" });
  Storage.setActiveUid("usr_andres_123");
  Storage.saveAccounts([{ id: "ACC-A01", name: "Cuenta Privada" }]);

  // Cerrar sesión
  Storage.clearAuthSession();
  Storage.setActiveUid(null);

  assert.strictEqual(Storage.getActiveUid(), null);
  assert.strictEqual(Storage.getAuthSession(), null);

  // Al no haber UID activo, getAccounts no debe retornar las cuentas privadas de usr_andres_123
  const cuentasSinSesion = Storage.getAccounts();
  assert.ok(!cuentasSinSesion.some(c => c.id === "ACC-A01"));
});

test("Spec 024 - RF-5: DbAdapter.syncBidirectional bloquea sincronización si no hay sesión autenticada con UID", async () => {
  globalThis.window.localStorage.clear();
  Storage.clearAuthSession();
  Storage.setActiveUid(null);

  const DbAdapter = require("../assets/js/dbAdapter.js");
  const res = await DbAdapter.syncBidirectional();

  assert.strictEqual(res.synced, false);
  assert.ok(res.message.includes("No hay sesión activa autenticada"));
});

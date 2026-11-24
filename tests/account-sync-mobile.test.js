const test = require("node:test");
const assert = require("node:assert/strict");

// Mock simple de localStorage para Node.js
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
if (!globalThis.window.localStorage) {
  globalThis.window.localStorage = new MockLocalStorage();
}

const Calculations = require("../assets/js/financeCalculations.js");

test("Spec 037 - RF-2: fusionarEstadoContable adopta cuenta remota cuando local es 0 y remota tiene saldo no nulo ante empate de timestamp", () => {
  const local = {
    accounts: [
      {
        id: "acc-ledger",
        name: "La Billetera Ledger",
        type: "wallet",
        currency: "BTC",
        initialBalance: 0,
        currentBalance: 0,
        updatedAt: "2026-11-24T18:00:00.000Z"
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T18:00:00.000Z"
  };

  const remote = {
    accounts: [
      {
        id: "acc-ledger",
        name: "La Billetera Ledger",
        type: "wallet",
        currency: "BTC",
        initialBalance: 0.45,
        currentBalance: 0.45,
        updatedAt: "2026-11-24T18:00:00.000Z" // Mismo timestamp o ausencia de diferencia individual
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T19:30:00.000Z" // Workspace remoto actualizado más recientemente desde la PC
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const acc = fusion.mergedState.accounts.find(a => a.id === "acc-ledger");

  assert.equal(acc.initialBalance, 0.45, "El teléfono con saldo local 0 debe adoptar el saldo 0.45 BTC actualizado desde la PC");
  assert.equal(acc.currentBalance, 0.45, "El balance actual debe ser 0.45 BTC");
  assert.equal(fusion.hasChangesFromRemote, true, "Debe notificar que hubo cambios remotos para refrescar la interfaz");
});

test("Spec 037 - RF-2: fusionarEstadoContable adopta cuenta remota cuando ambos carecen de timestamp y local es 0", () => {
  const local = {
    accounts: [
      {
        id: "acc-btc-phone",
        name: "Billetera Ledger",
        type: "wallet",
        currency: "BTC",
        initialBalance: 0,
        currentBalance: 0
      }
    ],
    transactions: []
  };

  const remote = {
    accounts: [
      {
        id: "acc-btc-phone",
        name: "Billetera Ledger",
        type: "wallet",
        currency: "BTC",
        initialBalance: 0.45,
        currentBalance: 0.45
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T19:35:00.000Z"
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const acc = fusion.mergedState.accounts.find(a => a.id === "acc-btc-phone");

  assert.equal(acc.initialBalance, 0.45, "Debe adoptar el saldo 0.45 de la nube si el local es 0");
  assert.equal(acc.currentBalance, 0.45);
  assert.equal(fusion.hasChangesFromRemote, true);
});

test("Spec 037 - RF-2: fusionarEstadoContable preserva cuenta local cuando local tiene saldo modificado y remota es 0", () => {
  // Asegurar que la protección de Spec 036 no se rompa: si en la PC el usuario acaba de escribir 0.45 y la nube aún tiene 0
  const local = {
    accounts: [
      {
        id: "acc-ledger",
        name: "La Billetera Ledger",
        type: "wallet",
        currency: "BTC",
        initialBalance: 0.45,
        currentBalance: 0.45,
        updatedAt: "2026-11-24T19:40:00.000Z"
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T19:40:00.000Z"
  };

  const remote = {
    accounts: [
      {
        id: "acc-ledger",
        name: "La Billetera Ledger",
        type: "wallet",
        currency: "BTC",
        initialBalance: 0,
        currentBalance: 0
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T19:30:00.000Z"
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const acc = fusion.mergedState.accounts.find(a => a.id === "acc-ledger");

  assert.equal(acc.initialBalance, 0.45, "La edición local en la PC (0.45 BTC) debe preservarse sobre la nube antigua");
  assert.equal(acc.currentBalance, 0.45);
});

test("Spec 037 - RF-2: fusionarEstadoContable adopta cuenta remota cuando remote.updatedAt de workspace es más reciente ante cuentas con saldos distintos", () => {
  const local = {
    accounts: [
      {
        id: "acc-bank",
        name: "Banco Santander",
        type: "bank",
        initialBalance: 100000,
        currentBalance: 100000,
        updatedAt: "2026-11-24T12:00:00.000Z"
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T12:00:00.000Z"
  };

  const remote = {
    accounts: [
      {
        id: "acc-bank",
        name: "Banco Santander",
        type: "bank",
        initialBalance: 350000,
        currentBalance: 350000,
        updatedAt: "2026-11-24T12:00:00.000Z" // Timestamp de cuenta igual
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T19:50:00.000Z" // Documento remoto guardado después
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const acc = fusion.mergedState.accounts.find(a => a.id === "acc-bank");

  assert.equal(acc.initialBalance, 350000, "Debe adoptar el saldo remoto de 350000 cuando el documento remoto es más reciente");
  assert.equal(acc.currentBalance, 350000);
  assert.equal(fusion.hasChangesFromRemote, true);
});

test("Spec 037 - RF-1: DbAdapter.syncBidirectional aborta sin pisar remoto ante error de red o HTTP", async () => {
  const DbAdapter = require("../assets/js/dbAdapter.js");
  const Storage = require("../assets/js/storage.js");

  // Simular sesión autenticada
  Storage.saveAuthSession({
    uid: "test-user-37",
    email: "test@example.com",
    idToken: "token-valid",
    expiresAt: Date.now() + 3600000
  });

  // Mock de fetchRemoteWorkspace simulando error de red
  const originalFetch = DbAdapter.fetchRemoteWorkspace;
  let saveCalled = false;
  const originalSave = DbAdapter.saveRemoteWorkspace;

  DbAdapter.fetchRemoteWorkspace = async () => ({ error: true, message: "Network connection lost" });
  DbAdapter.saveRemoteWorkspace = async () => { saveCalled = true; return { success: true }; };

  const result = await DbAdapter.syncBidirectional();

  assert.equal(result.synced, false, "La sincronización debe fallar limpiamente");
  assert.ok(result.message.includes("Network connection lost") || result.message.includes("Error al contactar"), "Debe reportar mensaje de error");
  assert.equal(saveCalled, false, "saveRemoteWorkspace NO debe ser llamado ante error de red");

  // Restaurar mocks
  DbAdapter.fetchRemoteWorkspace = originalFetch;
  DbAdapter.saveRemoteWorkspace = originalSave;
  Storage.saveAuthSession(null);
});

test("Spec 037 - RF-3: DbAdapter.forcePullFromRemote descarga y reemplaza el estado local con recálculo de balances", async () => {
  const DbAdapter = require("../assets/js/dbAdapter.js");
  const Storage = require("../assets/js/storage.js");

  Storage.saveAuthSession({
    uid: "user-pull-37",
    email: "pull@example.com",
    idToken: "valid-token",
    expiresAt: Date.now() + 3600000
  });

  // Local tiene 0 BTC
  Storage.saveAccounts([
    { id: "acc-ledger", name: "La Billetera Ledger", currency: "BTC", initialBalance: 0, currentBalance: 0 }
  ]);

  const originalFetch = DbAdapter.fetchRemoteWorkspace;
  DbAdapter.fetchRemoteWorkspace = async () => ({
    accounts: [
      { id: "acc-ledger", name: "La Billetera Ledger", currency: "BTC", initialBalance: 0.45, currentBalance: 0.45, updatedAt: "2026-11-24T19:50:00Z" }
    ],
    transactions: [
      { id: "tx-btc-recv", accountId: "acc-ledger", type: "income", amount: 0.05, date: "2026-11-24" }
    ],
    budgets: [],
    goals: [],
    planAccounts: [],
    currencies: [{ code: "BTC", name: "Bitcoin", symbol: "₿", rateToCLP: 90000000, isBase: false }]
  });

  const res = await DbAdapter.forcePullFromRemote();

  assert.equal(res.synced, true);
  assert.equal(res.hasChangesFromRemote, true);
  const acc = res.mergedState.accounts.find(a => a.id === "acc-ledger");
  assert.equal(acc.initialBalance, 0.45);
  // Con el ingreso de 0.05 BTC: balance actual = 0.45 + 0.05 = 0.50 BTC
  assert.equal(acc.currentBalance, 0.50, "El balance de la cuenta debe recalcularse atómicamente con los movimientos de la nube");

  // Restaurar
  DbAdapter.fetchRemoteWorkspace = originalFetch;
  Storage.saveAuthSession(null);
});

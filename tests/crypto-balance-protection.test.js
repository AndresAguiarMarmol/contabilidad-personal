const test = require("node:test");
const assert = require("node:assert/strict");

const Calculations = require("../assets/js/financeCalculations.js");

test("Spec 036 - RF-1: fusionarEstadoContable no sobreescribe saldo local recién modificado (0.45 BTC) con saldo remoto 0", () => {
  const local = {
    accounts: [
      {
        id: "acc-ledger-btc",
        name: "Billetera Ledger",
        type: "wallet",
        currency: "BTC",
        initialBalance: 0.45,
        currentBalance: 0.45,
        updatedAt: "2026-11-24T19:35:00.000Z"
      }
    ],
    transactions: []
  };

  // En Firestore existe el documento del workspace con timestamp reciente, pero la cuenta remota tiene saldo 0 y no tiene updatedAt individual
  const remote = {
    accounts: [
      {
        id: "acc-ledger-btc",
        name: "Billetera Ledger",
        type: "wallet",
        currency: "BTC",
        initialBalance: 0,
        currentBalance: 0
        // Sin updatedAt individual
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T19:35:05.000Z" // Timestamp del documento workspace en Firestore
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const accMerged = fusion.mergedState.accounts.find(a => a.id === "acc-ledger-btc");

  assert.equal(accMerged.initialBalance, 0.45, "El saldo local modificado (0.45 BTC) NO debe ser pisado por la versión remota desactualizada de saldo 0");
  assert.equal(accMerged.currentBalance, 0.45, "El balance actual debe mantenerse en 0.45 BTC");
});

test("Spec 036 - RF-1: ante empate de timestamp o ausencia de timestamps individuales, prevalece la versión local con el saldo modificado", () => {
  const local = {
    accounts: [
      {
        id: "acc-btc-2",
        name: "Billetera Móvil BTC",
        type: "wallet",
        currency: "BTC",
        initialBalance: 0.125,
        currentBalance: 0.125
      }
    ],
    transactions: []
  };

  const remote = {
    accounts: [
      {
        id: "acc-btc-2",
        name: "Billetera Móvil BTC",
        type: "wallet",
        currency: "BTC",
        initialBalance: 0,
        currentBalance: 0
      }
    ],
    transactions: []
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const accMerged = fusion.mergedState.accounts.find(a => a.id === "acc-btc-2");

  assert.equal(accMerged.initialBalance, 0.125, "En empate de timestamps, la versión local (0.125) debe prevalecer sobre la remota (0)");
  assert.equal(accMerged.currentBalance, 0.125);
});

test("Spec 036 - RF-1 & RF-2: recalcularBalancesCuentas conserva precisión de punto flotante en criptomonedas", () => {
  const cuentas = [
    {
      id: "acc-ledger",
      name: "Billetera Ledger",
      type: "wallet",
      currency: "BTC",
      initialBalance: 0.45,
      currentBalance: 0
    }
  ];

  const transacciones = [
    {
      id: "tx-btc-1",
      accountId: "acc-ledger",
      type: "expense",
      amount: 0.05,
      date: "2026-11-24"
    }
  ];

  const resultado = Calculations.recalcularBalancesCuentas(cuentas, transacciones);
  assert.equal(resultado[0].initialBalance, 0.45);
  assert.ok(Math.abs(resultado[0].currentBalance - 0.40) < 0.000001, "0.45 - 0.05 debe ser 0.40 BTC");
});

test("Spec 036 - RF-3: app.js contempla precisión decimal extendida para BTC / criptomonedas en formatMoney", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const appJs = fs.readFileSync(path.join(__dirname, "../assets/js/app.js"), "utf8");

  assert.match(appJs, /esCrypto/i, "formatMoney debe identificar monedas cripto");
  assert.match(appJs, /BTC/i, "formatMoney debe contemplar BTC específicamente");
  assert.match(appJs, /maxDigits\s*=\s*8/i, "formatMoney debe permitir hasta 8 decimales en criptomonedas");
});

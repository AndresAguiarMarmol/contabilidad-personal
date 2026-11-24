const test = require("node:test");
const assert = require("node:assert/strict");

const Calculations = require("../assets/js/financeCalculations.js");

test("Spec 035 - RF-1: crearCuentaObjeto incluye marca de tiempo updatedAt", () => {
  const cuenta = Calculations.crearCuentaObjeto({
    name: "Banco Santander",
    type: "bank",
    initialBalance: 150000
  });

  assert.ok(cuenta.updatedAt, "La cuenta debe tener la propiedad updatedAt");
  assert.ok(!isNaN(new Date(cuenta.updatedAt).getTime()), "updatedAt debe ser una fecha ISO válida");
});

test("Spec 035 - RF-2: fusionarEstadoContable adopta cuenta remota cuando remote.updatedAt es más reciente que local.updatedAt", () => {
  const local = {
    accounts: [
      {
        id: "acc-1",
        name: "Banco Chile",
        type: "bank",
        initialBalance: 100000,
        currentBalance: 100000,
        updatedAt: "2026-11-20T10:00:00.000Z"
      }
    ],
    transactions: []
  };

  const remote = {
    accounts: [
      {
        id: "acc-1",
        name: "Banco Chile (Actualizado)",
        type: "bank",
        initialBalance: 850000,
        currentBalance: 850000,
        updatedAt: "2026-11-24T12:00:00.000Z"
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T12:00:05.000Z"
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const accMerged = fusion.mergedState.accounts.find(a => a.id === "acc-1");

  assert.equal(accMerged.initialBalance, 850000, "El saldo inicial debe actualizarse al valor remoto más reciente");
  assert.equal(accMerged.name, "Banco Chile (Actualizado)", "El nombre debe actualizarse al valor remoto más reciente");
  assert.equal(accMerged.currentBalance, 850000, "El balance actual debe recalcularse deterministamente");
  assert.equal(fusion.hasChangesFromRemote, true, "hasChangesFromRemote debe ser true al actualizarse una cuenta existente");
});

test("Spec 035 - RF-2: fusionarEstadoContable preserva cuenta local cuando local.updatedAt es más reciente que remote.updatedAt", () => {
  const local = {
    accounts: [
      {
        id: "acc-1",
        name: "Banco BCI Local",
        type: "bank",
        initialBalance: 500000,
        currentBalance: 500000,
        updatedAt: "2026-11-24T18:00:00.000Z"
      }
    ],
    transactions: []
  };

  const remote = {
    accounts: [
      {
        id: "acc-1",
        name: "Banco BCI Remoto Viejo",
        type: "bank",
        initialBalance: 200000,
        currentBalance: 200000,
        updatedAt: "2026-11-24T10:00:00.000Z"
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T10:00:05.000Z"
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const accMerged = fusion.mergedState.accounts.find(a => a.id === "acc-1");

  assert.equal(accMerged.initialBalance, 500000, "El saldo local más reciente debe prevalecer");
  assert.equal(accMerged.name, "Banco BCI Local", "El nombre local más reciente debe prevalecer");
  assert.equal(accMerged.currentBalance, 500000);
});

test("Spec 035 - RF-2: fusionarEstadoContable adopta cuenta remota cuando la remota tiene updatedAt y la local carece de él", () => {
  const local = {
    accounts: [
      {
        id: "acc-legacy",
        name: "Billetera Efectivo",
        type: "cash",
        initialBalance: 15000,
        currentBalance: 15000
        // Sin updatedAt
      }
    ],
    transactions: []
  };

  const remote = {
    accounts: [
      {
        id: "acc-legacy",
        name: "Billetera Efectivo",
        type: "cash",
        initialBalance: 80000,
        currentBalance: 80000,
        updatedAt: "2026-11-24T15:30:00.000Z"
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T15:30:05.000Z"
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const accMerged = fusion.mergedState.accounts.find(a => a.id === "acc-legacy");

  assert.equal(accMerged.initialBalance, 80000, "Debe actualizarse al saldo remoto que posee marca temporal");
  assert.equal(accMerged.currentBalance, 80000);
  assert.equal(fusion.hasChangesFromRemote, true);
});

test("Spec 035 - RF-2 & RF-3: fusionarEstadoContable adopta saldo remoto si los saldos difieren y el workspace remoto es más reciente", () => {
  const local = {
    accounts: [
      {
        id: "acc-2",
        name: "Cuenta Ahorro",
        type: "savings",
        initialBalance: 50000,
        currentBalance: 50000
      }
    ],
    transactions: []
  };

  const remote = {
    accounts: [
      {
        id: "acc-2",
        name: "Cuenta Ahorro",
        type: "savings",
        initialBalance: 350000,
        currentBalance: 350000,
        updatedAt: "2026-11-24T16:00:00.000Z"
      }
    ],
    transactions: [],
    updatedAt: "2026-11-24T16:00:05.000Z"
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const accMerged = fusion.mergedState.accounts.find(a => a.id === "acc-2");

  assert.equal(accMerged.initialBalance, 350000, "El saldo remoto modificado en la nube debe sobreescribir la copia desactualizada");
  assert.equal(accMerged.currentBalance, 350000);
  assert.equal(fusion.hasChangesFromRemote, true, "Debe reportar cambios remotos para refrescar la interfaz");
});

test("Spec 035 - RF-3: fusionarEstadoContable recalcula balance con saldo inicial resuelto y transacciones combinadas", () => {
  const local = {
    accounts: [
      {
        id: "acc-3",
        name: "Cuenta Corriente",
        type: "bank",
        initialBalance: 100000,
        currentBalance: 100000,
        updatedAt: "2026-11-20T10:00:00.000Z"
      }
    ],
    transactions: [
      {
        id: "tx-local-1",
        accountId: "acc-3",
        type: "expense",
        amount: 20000,
        date: "2026-11-21"
      }
    ]
  };

  // En otro dispositivo se actualizó el saldo inicial a 500.000 y se registró un gasto de 50.000
  const remote = {
    accounts: [
      {
        id: "acc-3",
        name: "Cuenta Corriente",
        type: "bank",
        initialBalance: 500000,
        currentBalance: 450000,
        updatedAt: "2026-11-24T14:00:00.000Z"
      }
    ],
    transactions: [
      {
        id: "tx-remote-1",
        accountId: "acc-3",
        type: "expense",
        amount: 50000,
        date: "2026-11-22"
      }
    ],
    updatedAt: "2026-11-24T14:00:05.000Z"
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const accMerged = fusion.mergedState.accounts.find(a => a.id === "acc-3");

  // Balance esperado: initialBalance (500.000) - 20.000 (tx-local-1) - 50.000 (tx-remote-1) = 430.000
  assert.equal(accMerged.initialBalance, 500000);
  assert.equal(accMerged.currentBalance, 430000, "El balance actual debe ser 500000 - 20000 - 50000 = 430000");
  assert.equal(fusion.hasChangesFromRemote, true);
  assert.equal(fusion.newTransactionsFromRemote, 1);
});

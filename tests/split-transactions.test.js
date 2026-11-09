const test = require("node:test");
const assert = require("node:assert");
const {
  validarMovimientoSplit,
  aplicarMovimientoSplitEnCuentas
} = require("../assets/js/financeCalculations.js");

const mockAccounts = [
  { id: "ACC-005", name: "Tarjeta de Crédito Visa", type: "credit_card", currentBalance: -150000 },
  { id: "ACC-HOGAR", name: "Activos del Hogar", type: "savings", currentBalance: 200000 },
  { id: "ACC-TECH", name: "Electrónica y Computación", type: "savings", currentBalance: 500000 },
  { id: "ACC-001", name: "Cuenta Corriente Banco", type: "bank", currentBalance: 1200000 }
];

test("RF-3: validarMovimientoSplit rechaza si faltan datos o monto total <= 0", () => {
  const res1 = validarMovimientoSplit(null, mockAccounts);
  assert.strictEqual(res1.valida, false);

  const res2 = validarMovimientoSplit({ amount: 0, accountId: "ACC-005" }, mockAccounts);
  assert.strictEqual(res2.valida, false);
  assert.match(res2.error, /monto/i);
});

test("RF-3: validarMovimientoSplit rechaza si tiene menos de 2 líneas split", () => {
  const txConUnaLinea = {
    amount: 1000000,
    accountId: "ACC-005",
    description: "Compra grande",
    splitLines: [
      { id: "1", description: "Todo junto", amount: 1000000, category: "Varios" }
    ]
  };
  const res = validarMovimientoSplit(txConUnaLinea, mockAccounts);
  assert.strictEqual(res.valida, false);
  assert.match(res.error, /al menos 2/i);
});

test("RF-3: validarMovimientoSplit rechaza si alguna línea tiene monto <= 0", () => {
  const txConLineaInvalida = {
    amount: 1000000,
    accountId: "ACC-005",
    description: "Compra mixta",
    splitLines: [
      { id: "1", description: "Parte 1", amount: 1000000, category: "Hogar" },
      { id: "2", description: "Parte 2", amount: 0, category: "Tech" }
    ]
  };
  const res = validarMovimientoSplit(txConLineaInvalida, mockAccounts);
  assert.strictEqual(res.valida, false);
  assert.match(res.error, /partida.*monto.*cero/i);
});

test("RF-3: validarMovimientoSplit rechaza si la cuenta destino es igual a la pagadora", () => {
  const txMismaCuenta = {
    amount: 1000000,
    accountId: "ACC-005",
    description: "Compra dividida",
    splitLines: [
      { id: "1", description: "Parte 1", amount: 500000, targetAccountId: "ACC-005" },
      { id: "2", description: "Parte 2", amount: 500000, targetAccountId: "ACC-HOGAR" }
    ]
  };
  const res = validarMovimientoSplit(txMismaCuenta, mockAccounts);
  assert.strictEqual(res.valida, false);
  assert.match(res.error, /destino no puede ser igual/i);
});

test("RF-3: validarMovimientoSplit rechaza descuadre contable (suma lineas !== monto total)", () => {
  const txDescuadrada = {
    amount: 1000000,
    accountId: "ACC-005",
    description: "Compra electrodomésticos",
    splitLines: [
      { id: "1", description: "Aspiradora", amount: 80000, category: "Hogar" },
      { id: "2", description: "Televisor", amount: 900000, category: "Tech" } // Suma: 980000, Faltan 20000
    ]
  };
  const res = validarMovimientoSplit(txDescuadrada, mockAccounts);
  assert.strictEqual(res.valida, false);
  assert.strictEqual(res.sumLines, 980000);
  assert.strictEqual(res.difference, 20000);
  assert.match(res.error, /cuadra/i);
});

test("RF-1, RF-2: validarMovimientoSplit aprueba split exactamente cuadrado", () => {
  const txValida = {
    amount: 1000000,
    accountId: "ACC-005",
    description: "Compra Electrodomésticos y TV",
    splitLines: [
      { id: "1", description: "Aspiradora", amount: 80000, targetAccountId: "ACC-HOGAR" },
      { id: "2", description: "Televisor", amount: 920000, targetAccountId: "ACC-TECH" }
    ]
  };
  const res = validarMovimientoSplit(txValida, mockAccounts);
  assert.strictEqual(res.valida, true);
  assert.strictEqual(res.sumLines, 1000000);
  assert.strictEqual(res.difference, 0);
});

test("RF-4: aplicarMovimientoSplitEnCuentas actualiza de forma atómica e inmutable los saldos", () => {
  const tx = {
    amount: 1000000,
    accountId: "ACC-005", // Tarjeta (-150000)
    splitLines: [
      { id: "1", amount: 80000, targetAccountId: "ACC-HOGAR" }, // Activos Hogar (200000 -> 280000)
      { id: "2", amount: 920000, targetAccountId: "ACC-TECH" }  // Activos Tech (500000 -> 1420000)
    ]
  };

  const resultado = aplicarMovimientoSplitEnCuentas(mockAccounts, tx);

  // Inmutabilidad
  assert.notStrictEqual(resultado, mockAccounts);

  // Origen debitado por el total (aumenta deuda en tarjeta de crédito: -150000 - 1000000 = -1150000)
  const cc = resultado.find(a => a.id === "ACC-005");
  assert.strictEqual(cc.currentBalance, -1150000);

  // Destino 1 acreditado
  const hogar = resultado.find(a => a.id === "ACC-HOGAR");
  assert.strictEqual(hogar.currentBalance, 280000);

  // Destino 2 acreditado
  const tech = resultado.find(a => a.id === "ACC-TECH");
  assert.strictEqual(tech.currentBalance, 1420000);

  // Cuenta no involucrada permanece inalterada
  const banco = resultado.find(a => a.id === "ACC-001");
  assert.strictEqual(banco.currentBalance, 1200000);
});

test("RF-4: aplicarMovimientoSplitEnCuentas gestiona líneas de gasto puro sin cuenta destino", () => {
  const txGastoMixto = {
    amount: 50000,
    accountId: "ACC-001", // Banco (1200000 -> 1150000)
    splitLines: [
      { id: "1", amount: 30000, category: "Supermercado" }, // Gasto puro, sin targetAccountId
      { id: "2", amount: 20000, targetAccountId: "ACC-HOGAR" } // Afecta cuenta de activos (200000 -> 220000)
    ]
  };

  const resultado = aplicarMovimientoSplitEnCuentas(mockAccounts, txGastoMixto);

  const banco = resultado.find(a => a.id === "ACC-001");
  assert.strictEqual(banco.currentBalance, 1150000);

  const hogar = resultado.find(a => a.id === "ACC-HOGAR");
  assert.strictEqual(hogar.currentBalance, 220000);
});

test("Reportes: calcularBalanceMes desglosa gastos y transferencias en movimientos split", () => {
  const { calcularBalanceMes } = require("../assets/js/financeCalculations.js");

  const transacciones = [
    {
      type: "expense",
      amount: 100000,
      accountId: "ACC-001",
      isSplit: true,
      splitLines: [
        { id: "1", amount: 60000, category: "Alimentación & Supermercado" },
        { id: "2", amount: 40000, targetAccountId: "ACC-HOGAR" } // transferencia a activo, no gasto de consumo
      ]
    }
  ];

  const balance = calcularBalanceMes(transacciones);
  assert.strictEqual(balance.expense, 60000);
  assert.strictEqual(balance.categoryExpenses["Alimentación & Supermercado"], 60000);
});


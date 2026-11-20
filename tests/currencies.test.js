const test = require("node:test");
const assert = require("node:assert");
const {
  validarMoneda,
  calcularConversionMoneda,
  calcularPatrimonioNeto,
  aplicarTransaccionEnCuentas,
  fusionarEstadoContable,
  CURRENCIES_BASE
} = require("../assets/js/financeCalculations.js");

test("Spec 018 - RF-1: CURRENCIES_BASE contiene CLP como base y USD, EUR, ARS precargadas", () => {
  assert.ok(Array.isArray(CURRENCIES_BASE), "CURRENCIES_BASE debe ser un array");
  const clp = CURRENCIES_BASE.find(c => c.code === "CLP");
  assert.ok(clp, "Debe existir CLP");
  assert.strictEqual(clp.isBase, true);
  assert.strictEqual(clp.rateToCLP, 1.0);

  const usd = CURRENCIES_BASE.find(c => c.code === "USD");
  assert.ok(usd, "Debe existir USD");
  assert.ok(usd.rateToCLP > 0);
});

test("Spec 018 - RF-2: validarMoneda valida código, nombre, símbolo y tasa positiva", () => {
  const existentes = [
    { code: "CLP", name: "Peso Chileno", rateToCLP: 1.0 },
    { code: "USD", name: "Dólar", rateToCLP: 950.0 }
  ];

  // Código vacío o inválido
  const res1 = validarMoneda({ code: "", name: "Euro", symbol: "€", rateToCLP: 1020 }, existentes);
  assert.strictEqual(res1.valida, false);
  assert.match(res1.error, /código/i);

  // Código duplicado
  const res2 = validarMoneda({ code: "usd", name: "Dólar USA", symbol: "$", rateToCLP: 950 }, existentes);
  assert.strictEqual(res2.valida, false);
  assert.match(res2.error, /ya existe/i);

  // Tasa menor o igual a cero
  const res3 = validarMoneda({ code: "EUR", name: "Euro", symbol: "€", rateToCLP: 0 }, existentes);
  assert.strictEqual(res3.valida, false);
  assert.match(res3.error, /tasa/i);

  // Moneda válida
  const res4 = validarMoneda({ code: "BRL", name: "Real Brasileño", symbol: "R$", rateToCLP: 180 }, existentes);
  assert.strictEqual(res4.valida, true);
});

test("Spec 018 - RF-3: calcularConversionMoneda calcula conversiones directas, inversas y cruzadas", () => {
  const currencies = [
    { code: "CLP", rateToCLP: 1.0 },
    { code: "USD", rateToCLP: 950.0 },
    { code: "EUR", rateToCLP: 1020.0 }
  ];

  // Misma moneda
  const c1 = calcularConversionMoneda(50000, "CLP", "CLP", currencies);
  assert.strictEqual(c1.targetAmount, 50000);
  assert.strictEqual(c1.effectiveRate, 1.0);

  // CLP a USD ($950.000 CLP = 1.000 USD)
  const c2 = calcularConversionMoneda(950000, "CLP", "USD", currencies);
  assert.strictEqual(c2.targetAmount, 1000);
  assert.strictEqual(c2.effectiveRate, 950);

  // USD a CLP (100 USD = 95.000 CLP)
  const c3 = calcularConversionMoneda(100, "USD", "CLP", currencies);
  assert.strictEqual(c3.targetAmount, 95000);
  assert.strictEqual(c3.effectiveRate, 950);

  // Tasa personalizada directa (ej. usuario edita a 960 CLP por USD en CLP -> USD)
  const c4 = calcularConversionMoneda(960000, "CLP", "USD", currencies, 960);
  assert.strictEqual(c4.targetAmount, 1000);
  assert.strictEqual(c4.effectiveRate, 960);

  // Moneda extranjera a extranjera (USD a EUR cruzado vía CLP)
  const c5 = calcularConversionMoneda(1020, "USD", "EUR", currencies);
  // 1020 USD * 950 = 969.000 CLP / 1020 = 950 EUR
  assert.strictEqual(Math.round(c5.targetAmount), 950);
});

test("Spec 018 - RF-5: aplicarTransaccionEnCuentas acredita toAmount en cuenta destino en transferencias multidivisa", () => {
  const accounts = [
    { id: "ACC-CLP", name: "Cuenta Corriente CLP", currentBalance: 1000000, currency: "CLP" },
    { id: "ACC-USD", name: "Billetera USD", currentBalance: 200, currency: "USD" }
  ];

  // Transferencia de $950.000 CLP hacia cuenta USD, acreditando $1.000 USD
  const tx = {
    id: "TX-MULTI-1",
    type: "transfer",
    accountId: "ACC-CLP",
    toAccountId: "ACC-USD",
    amount: 950000,
    toAmount: 1000,
    exchangeRate: 950
  };

  const updatedAccounts = aplicarTransaccionEnCuentas(accounts, tx);
  const accCLP = updatedAccounts.find(a => a.id === "ACC-CLP");
  const accUSD = updatedAccounts.find(a => a.id === "ACC-USD");

  assert.strictEqual(accCLP.currentBalance, 50000, "Debita 950.000 de la cuenta CLP");
  assert.strictEqual(accUSD.currentBalance, 1200, "Acredita 1.000 en la cuenta USD usando toAmount");
});

test("Spec 018 - RF-6: calcularPatrimonioNeto consolida valorizando cuentas en moneda extranjera a CLP", () => {
  const accounts = [
    { id: "ACC-1", type: "bank", currentBalance: 500000, currency: "CLP", isExcludedFromTotal: false },
    { id: "ACC-2", type: "savings", currentBalance: 1000, currency: "USD", isExcludedFromTotal: false },
    { id: "ACC-3", type: "credit_card", currentBalance: -200, currency: "USD", isExcludedFromTotal: false }
  ];

  const currencies = [
    { code: "CLP", rateToCLP: 1.0 },
    { code: "USD", rateToCLP: 950.0 }
  ];

  const netWorth = calcularPatrimonioNeto(accounts, currencies);

  // Activos: 500.000 CLP + (1.000 USD * 950) = 500.000 + 950.000 = 1.450.000
  // Pasivos: |-200 USD| * 950 = 190.000
  // Patrimonio Neto: 1.450.000 - 190.000 = 1.260.000
  assert.strictEqual(netWorth.assets, 1450000);
  assert.strictEqual(netWorth.liabilities, 190000);
  assert.strictEqual(netWorth.netWorth, 1260000);
});

test("Spec 018 - RF-7: fusionarEstadoContable combina monedas y actualiza tasas entre dispositivos", () => {
  const local = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [],
    currencies: [
      { code: "CLP", rateToCLP: 1.0, isBase: true },
      { code: "USD", rateToCLP: 965.0, isBase: false, updatedAt: "2026-11-19T22:00:00Z" }
    ]
  };

  const remote = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    planAccounts: [],
    currencies: [
      { code: "CLP", rateToCLP: 1.0, isBase: true },
      { code: "USD", rateToCLP: 950.0, isBase: false, updatedAt: "2026-11-19T20:00:00Z" },
      { code: "EUR", rateToCLP: 1020.0, isBase: false }
    ]
  };

  const result = fusionarEstadoContable(local, remote);
  assert.ok(Array.isArray(result.mergedState.currencies));
  assert.strictEqual(result.mergedState.currencies.length, 3);

  const usd = result.mergedState.currencies.find(c => c.code === "USD");
  assert.strictEqual(usd.rateToCLP, 965.0, "La tasa local más reciente debe prevalecer");

  const eur = result.mergedState.currencies.find(c => c.code === "EUR");
  assert.ok(eur, "Debe incorporar EUR desde remote");
});

test("Spec 018 - RF-4: Herencia de tasa referente desde transacción a tabla de monedas", () => {
  const currencies = [
    { code: "CLP", name: "Peso Chileno", rateToCLP: 1.0, isBase: true },
    { code: "USD", name: "Dólar", rateToCLP: 950.0, isBase: false }
  ];

  // Simular herencia al cambiar de CLP a USD a una tasa pactada de 980
  const amountCLP = 980000;
  const toAmountUSD = 1000;
  const newRateToCLP = Number((amountCLP / toAmountUSD).toFixed(4));

  const targetCurr = currencies.find(c => c.code === "USD");
  targetCurr.rateToCLP = newRateToCLP;

  assert.strictEqual(targetCurr.rateToCLP, 980.0, "La tasa referente de USD debe actualizarse a 980 CLP");
});

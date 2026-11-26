const { describe, it } = require("node:test");
const assert = require("node:assert");
const Calculations = require("../assets/js/financeCalculations.js");

describe("Spec 042: Sincronización LWW de Divisas, Coherencia de Patrimonio Neto y Pull Multi-Dispositivo", () => {
  it("fusionarEstadoContable: Moneda remota con tasa real (ej. BTC=65.000.000) vence a tasa demo local (1e-8 o 0)", () => {
    const localState = {
      accounts: [],
      transactions: [],
      currencies: [
        { code: "CLP", name: "Peso Chileno", symbol: "$", rateToCLP: 1, isBase: true },
        { code: "BTC", name: "BitCoin", symbol: "BTC", rateToCLP: 1e-8, isBase: false }
      ]
    };

    const remoteState = {
      accounts: [],
      transactions: [],
      currencies: [
        { code: "CLP", name: "Peso Chileno", symbol: "$", rateToCLP: 1, isBase: true },
        { code: "BTC", name: "BitCoin", symbol: "BTC", rateToCLP: 65000000, isBase: false, updatedAt: "2026-11-22T21:44:16.713Z" }
      ]
    };

    const result = Calculations.fusionarEstadoContable(localState, remoteState);
    assert.strictEqual(result.hasChangesFromRemote, true, "Debe reportar cambios desde el remoto");

    const mergedBtc = result.mergedState.currencies.find(c => c.code === "BTC");
    assert.ok(mergedBtc, "BTC debe existir en las monedas fusionadas");
    assert.strictEqual(mergedBtc.rateToCLP, 65000000, "Debe adoptar la tasa de 65.000.000 CLP de la nube");
  });

  it("fusionarEstadoContable: Last-Write-Wins (LWW) respeta la moneda más reciente según updatedAt", () => {
    const localState = {
      accounts: [],
      transactions: [],
      currencies: [
        { code: "USD", name: "Dólar", symbol: "$", rateToCLP: 980, isBase: false, updatedAt: "2026-11-26T10:00:00.000Z" }
      ]
    };

    const remoteState = {
      accounts: [],
      transactions: [],
      currencies: [
        { code: "USD", name: "Dólar", symbol: "$", rateToCLP: 950, isBase: false, updatedAt: "2026-11-20T00:00:00.000Z" }
      ]
    };

    // Si local es más reciente, local gana
    const resLocalWins = Calculations.fusionarEstadoContable(localState, remoteState);
    const usdLocal = resLocalWins.mergedState.currencies.find(c => c.code === "USD");
    assert.strictEqual(usdLocal.rateToCLP, 980, "Tasa local más reciente (980) debe prevalecer");

    // Si remoto es más reciente, remoto gana
    localState.currencies[0].updatedAt = "2026-11-19T00:00:00.000Z";
    const resRemoteWins = Calculations.fusionarEstadoContable(localState, remoteState);
    assert.strictEqual(resRemoteWins.hasChangesFromRemote, true);
    const usdRemote = resRemoteWins.mergedState.currencies.find(c => c.code === "USD");
    assert.strictEqual(usdRemote.rateToCLP, 950, "Tasa remota más reciente (950) debe prevalecer");
  });

  it("calcularPatrimonioNeto: La diferencia de 46.150.000 CLP corresponde exactamente a 0.71 BTC a 65.000.000 CLP/BTC", () => {
    const accounts = [
      { id: "ACC-1", name: "Ledger BTC", currency: "BTC", currentBalance: 0.45, initialBalance: 0.45 },
      { id: "ACC-2", name: "Binance BTC", currency: "BTC", currentBalance: 0.26, initialBalance: 0.26 },
      { id: "ACC-3", name: "Amerant Bank", currency: "USD", currentBalance: 7584.21, initialBalance: 7584.21 },
      { id: "ACC-4", name: "Casa Villa Granada", currency: "USD", currentBalance: 150000, initialBalance: 150000 },
      { id: "ACC-5", name: "Local Villa Granada", currency: "USD", currentBalance: 100000, initialBalance: 100000 },
      { id: "ACC-6", name: "CXP Deposito Vista al Campo", currency: "USD", currentBalance: -1160, initialBalance: -1160 },
      { id: "ACC-7", name: "Banco Estado / Cta Rut", currency: "CLP", currentBalance: 21064, initialBalance: 221064 },
      { id: "ACC-8", name: "Banco Estado / Cta Cte", currency: "CLP", currentBalance: 200599, initialBalance: 599 },
      { id: "ACC-9", name: "Cuenta de Ahorros", currency: "CLP", currentBalance: 16206, initialBalance: 16206 },
      { id: "ACC-10", name: "Mercado Pago", currency: "CLP", currentBalance: 15906, initialBalance: 15906 },
      { id: "ACC-11", name: "Muebles e Inmuebles", currency: "CLP", currentBalance: 869970, initialBalance: 869970 },
      { id: "ACC-12", name: "Capital NovaPrint", currency: "CLP", currentBalance: 414463, initialBalance: 414463 },
      { id: "ACC-13", name: "Banco Itau Cuenta USD", currency: "CLP", currentBalance: 6025, initialBalance: 6025 },
      { id: "ACC-14", name: "Tarjeta Credito Itau", currency: "CLP", currentBalance: -65760, initialBalance: 0 },
      { id: "ACC-15", name: "Banco Mercantil", currency: "VEB", currentBalance: 1953, initialBalance: 1953 },
      { id: "ACC-16", name: "Banco de Venezuela", currency: "VEB", currentBalance: 443, initialBalance: 443 },
      { id: "ACC-17", name: "SSO Banco de Venezuela", currency: "VEB", currentBalance: 260, initialBalance: 260 }
    ];

    const currenciesWithBtc = [
      { code: "CLP", rateToCLP: 1, isBase: true },
      { code: "USD", rateToCLP: 950, isBase: false },
      { code: "VEB", rateToCLP: 1, isBase: false },
      { code: "BTC", rateToCLP: 65000000, isBase: false }
    ];

    const currenciesWithoutBtc = [
      { code: "CLP", rateToCLP: 1, isBase: true },
      { code: "USD", rateToCLP: 950, isBase: false },
      { code: "VEB", rateToCLP: 1, isBase: false },
      { code: "BTC", rateToCLP: 0, isBase: false }
    ];

    const resWithBtc = Calculations.calcularPatrimonioNeto(accounts, currenciesWithBtc);
    const resWithoutBtc = Calculations.calcularPatrimonioNeto(accounts, currenciesWithoutBtc);

    const netWorthWith = Math.round(resWithBtc.netWorth);
    const netWorthWithout = Math.round(resWithoutBtc.netWithout || resWithoutBtc.netWorth);
    const diff = netWorthWith - netWorthWithout;

    assert.strictEqual(netWorthWith, 291234129, "El patrimonio con BTC debe ser 291.234.129 CLP");
    assert.strictEqual(netWorthWithout, 245084129, "El patrimonio sin BTC debe ser 245.084.129 CLP");
    assert.strictEqual(diff, 46150000, "La diferencia debe ser exactamente 46.150.000 CLP (0.71 BTC * 65.000.000)");
  });

  it("sanearWorkspaceParaNube: Limita el payload bajo 700.000 bytes para respetar la cuota de 1MB de Firestore", () => {
    const hugePdf = "data:application/pdf;base64," + "A".repeat(500000);
    const rawWorkspace = {
      accounts: [{ id: "ACC-1" }],
      transactions: [
        { id: "TX-1", invoicePdf: hugePdf, invoiceName: "boleta1.pdf", amount: 1000 },
        { id: "TX-2", invoicePdf: hugePdf, invoiceName: "boleta2.pdf", amount: 2000 }
      ]
    };

    assert.ok(JSON.stringify(rawWorkspace).length > 1000000, "Payload crudo debe superar 1MB");
    const sanitized = Calculations.sanearWorkspaceParaNube(rawWorkspace, 700000);
    assert.ok(JSON.stringify(sanitized).length <= 700000, "Payload saneado debe estar bajo 700.000 bytes");
    assert.strictEqual(sanitized.transactions[1].invoicePdf, null, "Debe purgar el PDF de la transacción más antigua (índice 1) para liberar espacio");
    assert.strictEqual(sanitized.transactions[1].invoiceName, "boleta2.pdf", "Debe retener el nombre de factura");
  });

  it("fusionarEstadoContable: Incorpora movimientos nuevos del móvil y recalcula saldos de cuentas", () => {
    const localState = {
      accounts: [
        { id: "ACC-ITAU", name: "Tarjeta Itau", currency: "CLP", initialBalance: 0, currentBalance: 0 }
      ],
      transactions: []
    };

    const remoteState = {
      accounts: [
        { id: "ACC-ITAU", name: "Tarjeta Itau", currency: "CLP", initialBalance: 0, currentBalance: 0 }
      ],
      transactions: [
        { id: "TX-1", accountId: "ACC-ITAU", type: "expense", amount: 18160, supplier: "Casa Ideas", description: "Varios" },
        { id: "TX-2", accountId: "ACC-ITAU", type: "expense", amount: 5000, supplier: "METRO DE SANTIAGO", description: "BIP Yaneth" },
        { id: "TX-3", accountId: "ACC-ITAU", type: "expense", amount: 5000, supplier: "METRO DE SANTIAGO", description: "Tarjeta BIP AEAM" }
      ]
    };

    const result = Calculations.fusionarEstadoContable(localState, remoteState);
    assert.strictEqual(result.hasChangesFromRemote, true);
    assert.strictEqual(result.newTransactionsFromRemote, 3);
    assert.strictEqual(result.mergedState.transactions.length, 3);

    // Recalcular saldo de la tarjeta de crédito
    const recalculated = Calculations.recalcularBalancesCuentas(result.mergedState.accounts, result.mergedState.transactions);
    const itau = recalculated.find(a => a.id === "ACC-ITAU");
    assert.strictEqual(itau.currentBalance, -28160, "Saldo de la tarjeta debe ser -(18160 + 5000 + 5000) = -28160");
  });
});

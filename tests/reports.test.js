const test = require("node:test");
const assert = require("node:assert");
const {
  generarBalanceGeneral,
  generarEstadoResultados,
  generarReporteCSV,
  obtenerCatalogoPlanCuentas
} = require("../assets/js/financeCalculations.js");

test("Spec 020 - RF-1: generarBalanceGeneral estructura Activos, Pasivos y Patrimonio con cuadratura estricta", () => {
  const accounts = [
    { id: "ACC-1", name: "Banco Santander", type: "bank", currentBalance: 1500000, currency: "CLP", isExcludedFromTotal: false },
    { id: "ACC-2", name: "Billetera Efectivo", type: "cash", currentBalance: 200000, currency: "CLP", isExcludedFromTotal: false },
    { id: "ACC-3", name: "Tarjeta Visa", type: "credit_card", currentBalance: -400000, currency: "CLP", isExcludedFromTotal: false }
  ];

  const planAccounts = [
    { id: "P-1-3-01", code: "1.3.01", name: "Departamento Principal", classNumber: 1, classType: "asset", balance: 80000000 },
    { id: "P-2-2-01", code: "2.2.01", name: "Crédito Hipotecario Banco", classNumber: 2, classType: "liability", balance: 50000000 },
    { id: "P-3-1-01", code: "3.1.01", name: "Capital Inicial", classNumber: 3, classType: "equity", balance: 31300000 }
  ];

  const catalog = obtenerCatalogoPlanCuentas(planAccounts, accounts, []);
  const currencies = [{ code: "CLP", rateToCLP: 1.0, isBase: true }];

  const balance = generarBalanceGeneral(accounts, catalog, [], { currencies });

  assert.ok(balance, "El balance general debe generarse");
  assert.ok(balance.activos, "Debe contener sección activos");
  assert.ok(balance.pasivos, "Debe contener sección pasivos");
  assert.ok(balance.patrimonio, "Debe contener sección patrimonio");

  // Activo Circulante: 1.500.000 + 200.000 = 1.700.000
  // Activo Fijo: 80.000.000
  // Total Activos: 81.700.000
  assert.strictEqual(balance.activos.circulante.total, 1700000);
  assert.strictEqual(balance.activos.fijo.total, 80000000);
  assert.strictEqual(balance.activos.total, 81700000);

  // Pasivo Circulante: 400.000
  // Pasivo Largo Plazo: 50.000.000
  // Total Pasivos: 50.400.000
  assert.strictEqual(balance.pasivos.circulante.total, 400000);
  assert.strictEqual(balance.pasivos.largoPlazo.total, 50000000);
  assert.strictEqual(balance.pasivos.total, 50400000);

  // Patrimonio: 81.700.000 - 50.400.000 = 31.300.000
  assert.strictEqual(balance.patrimonio.total, 31300000);

  // Cuadratura: Total Activos === Total Pasivos + Total Patrimonio
  assert.strictEqual(balance.cuadratura.estaCuadrado, true, "El balance general debe estar cuadrado");
  assert.strictEqual(balance.cuadratura.diferencia, 0);
});

test("Spec 020 - RF-2: generarBalanceGeneral valoriza cuentas en moneda extranjera a CLP", () => {
  const accounts = [
    { id: "ACC-CLP", name: "Cuenta Corriente", type: "bank", currentBalance: 1000000, currency: "CLP" },
    { id: "ACC-USD", name: "Billetera USD", type: "savings", currentBalance: 1000, currency: "USD" }
  ];

  const catalog = obtenerCatalogoPlanCuentas([], accounts, []);
  const currencies = [
    { code: "CLP", rateToCLP: 1.0, isBase: true },
    { code: "USD", rateToCLP: 950.0, isBase: false }
  ];

  const balance = generarBalanceGeneral(accounts, catalog, [], { currencies });

  // 1.000.000 CLP + (1.000 USD * 950) = 1.950.000 CLP
  assert.strictEqual(balance.activos.circulante.total, 1950000);
  assert.strictEqual(balance.activos.total, 1950000);
  assert.strictEqual(balance.notasCambiarias.length > 0, true, "Debe emitir notas sobre tasas aplicadas");
});

test("Spec 020 - RF-3: generarEstadoResultados calcula ingresos, gastos ordinarios/financieros y resultado neto", () => {
  const transactions = [
    { id: "TX-1", date: "2026-11-05", type: "income", amount: 2000000, category: "Sueldo y Salario", categoryCode: "4.1.01" },
    { id: "TX-2", date: "2026-11-10", type: "income", amount: 300000, category: "Honorarios", categoryCode: "4.1.02" },
    { id: "TX-3", date: "2026-11-06", type: "expense", amount: 600000, category: "Vivienda & Servicios", categoryCode: "5.1.01" },
    { id: "TX-4", date: "2026-11-08", type: "expense", amount: 400000, category: "Alimentación & Supermercado", categoryCode: "5.2.01" },
    { id: "TX-5", date: "2026-11-15", type: "expense", amount: 50000, category: "Gastos Financieros", categoryCode: "5.7.01" },
    // Transacción fuera de rango
    { id: "TX-6", date: "2026-10-15", type: "expense", amount: 999999, category: "Otros", categoryCode: "5.7.01" }
  ];

  const catalog = obtenerCatalogoPlanCuentas([], [], transactions);

  const er = generarEstadoResultados(transactions, catalog, {
    startDate: "2026-11-01",
    endDate: "2026-11-30"
  });

  assert.ok(er, "El estado de resultados debe generarse");
  assert.strictEqual(er.ingresos.total, 2300000, "Total ingresos de noviembre");
  assert.strictEqual(er.gastos.operacionalesTotal, 1000000, "Gastos operacionales (600k + 400k)");
  assert.strictEqual(er.gastos.financierosTotal, 50000, "Gastos financieros (50k)");
  assert.strictEqual(er.gastos.total, 1050000, "Total gastos");
  assert.strictEqual(er.resultadoNeto, 1250000, "Superávit neto = 2.300.000 - 1.050.000");
  assert.strictEqual(er.esSuperavit, true);
});

test("Spec 020 - RF-4: generarEstadoResultados incluye partidas split en los totales", () => {
  const transactions = [
    {
      id: "TX-SPLIT",
      date: "2026-11-12",
      type: "expense",
      amount: 500000,
      isSplit: true,
      splitLines: [
        { id: "S1", amount: 300000, category: "Alimentación & Supermercado", categoryCode: "5.2.01" },
        { id: "S2", amount: 200000, category: "Gastos Financieros", categoryCode: "5.7.01" }
      ]
    }
  ];

  const catalog = obtenerCatalogoPlanCuentas([], [], transactions);
  const er = generarEstadoResultados(transactions, catalog, {
    startDate: "2026-11-01",
    endDate: "2026-11-30"
  });

  assert.strictEqual(er.gastos.operacionalesTotal, 300000);
  assert.strictEqual(er.gastos.financierosTotal, 200000);
  assert.strictEqual(er.gastos.total, 500000);
  assert.strictEqual(er.resultadoNeto, -500000, "Déficit = -500.000");
  assert.strictEqual(er.esSuperavit, false);
});

test("Spec 020 - RF-5: generarReporteCSV genera archivo RFC 4180 con BOM para Balance y Estado de Resultados", () => {
  const mockBalanceData = {
    titulo: "Balance General Clasificado",
    periodo: "Noviembre 2026",
    fechaEmision: "2026-11-20",
    filas: [
      { seccion: "ACTIVO CIRCULANTE", rubro: "Cuentas Bancarias", monto: 1500000 },
      { seccion: "PASIVO CIRCULANTE", rubro: "Tarjetas de Crédito", monto: 400000 },
      { seccion: "TOTALES", rubro: "Total Patrimonio Neto", monto: 1100000 }
    ]
  };

  const csv = generarReporteCSV("balance", mockBalanceData);
  assert.ok(csv.startsWith("\uFEFF"), "Debe comenzar con UTF-8 BOM");
  assert.ok(csv.includes("Balance General Clasificado"));
  assert.ok(csv.includes("Cuentas Bancarias"));
  assert.ok(csv.includes("1500000"));
});

test("Spec 020 - RF-6: Conciliación contable entre Balance General y Estado de Resultados", () => {
  const transactions = [
    { id: "T1", date: "2026-11-01", type: "income", amount: 1000000, category: "Sueldo", categoryCode: "4.1.01" },
    { id: "T2", date: "2026-11-05", type: "expense", amount: 400000, category: "Alimentación", categoryCode: "5.2.01" }
  ];
  const accounts = [
    { id: "A1", name: "Banco", type: "bank", currentBalance: 600000, currency: "CLP" }
  ];
  const catalog = obtenerCatalogoPlanCuentas([], accounts, transactions);

  const er = generarEstadoResultados(transactions, catalog, { startDate: "2026-11-01", endDate: "2026-11-30" });
  assert.strictEqual(er.resultadoNeto, 600000);

  const bg = generarBalanceGeneral(accounts, catalog, transactions, { startDate: "2026-11-01", endDate: "2026-11-30" });
  assert.strictEqual(bg.activos.total, 600000);
  assert.strictEqual(bg.pasivos.total, 0);
  assert.strictEqual(bg.patrimonio.total, 600000);
  assert.strictEqual(bg.cuadratura.estaCuadrado, true);
  assert.strictEqual(bg.patrimonio.resultadoEjercicio, er.resultadoNeto);
});

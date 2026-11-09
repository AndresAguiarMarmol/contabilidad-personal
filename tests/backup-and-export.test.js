const test = require("node:test");
const assert = require("node:assert");
const {
  validarBackupJSON,
  generarTransaccionesCSV,
  filtrarTransacciones
} = require("../assets/js/financeCalculations.js");

const mockAccounts = [
  { id: "ACC-001", name: "Banco Corriente", currentBalance: 500000 },
  { id: "ACC-005", name: "Tarjeta Visa", currentBalance: -150000 }
];

const mockTxs = [
  {
    id: "TX-1",
    date: "2026-11-02T10:00:00Z",
    type: "expense",
    accountId: "ACC-001",
    category: "Alimentación & Supermercado",
    amount: 35000,
    description: "Supermercado Líder",
    paymentMethod: "debit"
  },
  {
    id: "TX-2",
    date: "2026-11-05T15:00:00Z",
    type: "income",
    accountId: "ACC-001",
    category: "Sueldo & Salario",
    amount: 1200000,
    description: "Sueldo mensual",
    paymentMethod: "transfer"
  },
  {
    id: "TX-3",
    date: "2026-11-08T18:00:00Z",
    type: "expense",
    accountId: "ACC-005",
    category: "Varios (Split)",
    amount: 1000000,
    description: "Compra Electrodomésticos y TV",
    paymentMethod: "credit",
    isSplit: true,
    splitLines: [
      { id: "1", description: "Aspiradora", amount: 80000, category: "Hogar" },
      { id: "2", description: "Televisor", amount: 920000, category: "Tech" }
    ]
  },
  {
    id: "TX-4",
    date: "2026-10-15T12:00:00Z", // Mes anterior
    type: "expense",
    accountId: "ACC-001",
    category: "Transporte & Combustible",
    amount: 25000,
    description: "Combustible Copec",
    paymentMethod: "debit"
  }
];

test("RF-2: validarBackupJSON rechaza backups nulos o sin arreglos de cuentas/transacciones", () => {
  const res1 = validarBackupJSON(null);
  assert.strictEqual(res1.valida, false);

  const res2 = validarBackupJSON({ version: "2.0" });
  assert.strictEqual(res2.valida, false);
  assert.match(res2.error, /cuentas.*transacciones/i);
});

test("RF-2: validarBackupJSON aprueba backup válido y retorna conteo de elementos", () => {
  const backup = {
    app: "Contabilidad Personal PWA",
    version: "2.0",
    accounts: mockAccounts,
    transactions: mockTxs,
    budgets: [{ id: "BUD-1" }],
    goals: [{ id: "GOAL-1" }, { id: "GOAL-2" }]
  };

  const res = validarBackupJSON(backup);
  assert.strictEqual(res.valida, true);
  assert.strictEqual(res.counts.accounts, 2);
  assert.strictEqual(res.counts.transactions, 4);
  assert.strictEqual(res.counts.budgets, 1);
  assert.strictEqual(res.counts.goals, 2);
});

test("RF-4: filtrarTransacciones filtra por búsqueda, tipo, cuenta y fechas", () => {
  // Filtro por tipo
  const soloIngresos = filtrarTransacciones(mockTxs, { type: "income" });
  assert.strictEqual(soloIngresos.length, 1);
  assert.strictEqual(soloIngresos[0].id, "TX-2");

  // Filtro por cuenta
  const soloTarjeta = filtrarTransacciones(mockTxs, { accountId: "ACC-005" });
  assert.strictEqual(soloTarjeta.length, 1);
  assert.strictEqual(soloTarjeta[0].id, "TX-3");

  // Filtro por búsqueda de texto
  const busquedaLider = filtrarTransacciones(mockTxs, { search: "Líder" });
  assert.strictEqual(busquedaLider.length, 1);
  assert.strictEqual(busquedaLider[0].id, "TX-1");

  // Filtro por mes actual (2026-11)
  const mesActual = filtrarTransacciones(mockTxs, { dateRange: "current_month", referenceDate: "2026-11-09" });
  assert.strictEqual(mesActual.length, 3);
  assert.ok(!mesActual.some(tx => tx.id === "TX-4"));
});

test("RF-5: generarTransaccionesCSV genera archivo RFC 4180 con BOM y detalle split", () => {
  const csv = generarTransaccionesCSV(mockTxs, mockAccounts);

  // Debe comenzar con BOM UTF-8
  assert.ok(csv.startsWith("\uFEFF"));

  // Debe contener encabezados estándar
  assert.match(csv, /Fecha,Tipo,Concepto,Categoría,Cuenta,Medio de Pago,Monto,Es Split,Detalle Partidas/);

  // Debe incluir filas de datos
  assert.match(csv, /"Supermercado Líder"/);
  assert.match(csv, /"Banco Corriente"/);

  // La transacción split debe mostrar SI en Es Split y sus líneas en Detalle
  assert.match(csv, /"SI"/);
  assert.match(csv, /Aspiradora/);
  assert.match(csv, /Televisor/);
});

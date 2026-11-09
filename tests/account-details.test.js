const test = require("node:test");
const assert = require("node:assert");
const {
  obtenerMovimientosDeCuenta,
  calcularResumenCuenta
} = require("../assets/js/financeCalculations.js");

const mockTransactions = [
  {
    id: "tx-1",
    date: "2026-11-01",
    type: "income",
    accountId: "acc-bank-1",
    amount: 1500000,
    description: "Sueldo",
    category: "Sueldo & Salario"
  },
  {
    id: "tx-2",
    date: "2026-11-03",
    type: "expense",
    accountId: "acc-bank-1",
    amount: 80000,
    description: "Supermercado",
    category: "Alimentación & Supermercado"
  },
  {
    id: "tx-3",
    date: "2026-11-04",
    type: "transfer",
    accountId: "acc-bank-1",
    toAccountId: "acc-cash-1",
    amount: 50000,
    description: "Giro cajero",
    category: "Transferencia"
  },
  {
    id: "tx-4",
    date: "2026-11-05",
    type: "expense",
    accountId: "acc-card-1",
    amount: 250000,
    description: "Compra Split Tienda",
    category: "Varios (Split)",
    isSplit: true,
    splitLines: [
      { id: "spl-1", description: "Ropa", amount: 100000, category: "Ropa" },
      { id: "spl-2", description: "Abono Ahorro", amount: 150000, targetAccountId: "acc-savings-1" }
    ]
  }
];

test("RF-6: obtenerMovimientosDeCuenta filtra movimientos propios y de destino", () => {
  // Cuenta Banco 1 tiene tx-1 (ingreso), tx-2 (gasto) y tx-3 (transferencia origen)
  const movsBank1 = obtenerMovimientosDeCuenta(mockTransactions, "acc-bank-1");
  assert.strictEqual(movsBank1.length, 3);
  // Orden cronológico descendente: tx-3 (nov 4), tx-2 (nov 3), tx-1 (nov 1)
  assert.strictEqual(movsBank1[0].id, "tx-3");
  assert.strictEqual(movsBank1[1].id, "tx-2");
  assert.strictEqual(movsBank1[2].id, "tx-1");

  // Cuenta Efectivo 1 tiene tx-3 como destino
  const movsCash1 = obtenerMovimientosDeCuenta(mockTransactions, "acc-cash-1");
  assert.strictEqual(movsCash1.length, 1);
  assert.strictEqual(movsCash1[0].id, "tx-3");

  // Cuenta Ahorro 1 está en la partida split de tx-4
  const movsSavings1 = obtenerMovimientosDeCuenta(mockTransactions, "acc-savings-1");
  assert.strictEqual(movsSavings1.length, 1);
  assert.strictEqual(movsSavings1[0].id, "tx-4");

  // Cuenta sin movimientos
  const vacio = obtenerMovimientosDeCuenta(mockTransactions, "acc-inexistente");
  assert.strictEqual(vacio.length, 0);
});

test("RF-2 y RF-6: calcularResumenCuenta calcula abonos, cargos y balance neto correctamente", () => {
  // Banco 1:
  // Abonos: 1.500.000 (sueldo)
  // Cargos: 80.000 (gasto) + 50.000 (transferencia enviada) = 130.000
  // Conteo: 3
  const resumenBank1 = calcularResumenCuenta(mockTransactions, "acc-bank-1");
  assert.strictEqual(resumenBank1.totalAbonos, 1500000);
  assert.strictEqual(resumenBank1.totalCargos, 130000);
  assert.strictEqual(resumenBank1.neto, 1370000);
  assert.strictEqual(resumenBank1.cantidadMovimientos, 3);

  // Efectivo 1:
  // Abonos: 50.000 (transferencia recibida)
  // Cargos: 0
  const resumenCash1 = calcularResumenCuenta(mockTransactions, "acc-cash-1");
  assert.strictEqual(resumenCash1.totalAbonos, 50000);
  assert.strictEqual(resumenCash1.totalCargos, 0);
  assert.strictEqual(resumenCash1.neto, 50000);
  assert.strictEqual(resumenCash1.cantidadMovimientos, 1);

  // Tarjeta 1 (cuenta pagadora del split):
  // Cargos: 250.000
  const resumenCard1 = calcularResumenCuenta(mockTransactions, "acc-card-1");
  assert.strictEqual(resumenCard1.totalAbonos, 0);
  assert.strictEqual(resumenCard1.totalCargos, 250000);
  assert.strictEqual(resumenCard1.neto, -250000);
  assert.strictEqual(resumenCard1.cantidadMovimientos, 1);
});

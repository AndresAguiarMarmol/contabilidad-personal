const test = require("node:test");
const assert = require("node:assert");
const {
  clasificarPlanDeCuentas,
  validarEdicionCuenta,
  puedeEliminarCuenta
} = require("../assets/js/financeCalculations.js");

const mockAccounts = [
  { id: "acc-1", name: "Caja Chica", type: "cash", currentBalance: 50000, isExcludedFromTotal: false },
  { id: "acc-2", name: "Banco Principal", type: "bank", currentBalance: 450000, isExcludedFromTotal: false },
  { id: "acc-3", name: "Billetera Digital", type: "wallet", currentBalance: 25000, isExcludedFromTotal: false },
  { id: "acc-4", name: "Ahorro Fondo Mutuo", type: "savings", currentBalance: 800000, isExcludedFromTotal: false },
  { id: "acc-5", name: "Tarjeta Visa", type: "credit_card", currentBalance: -120000, isExcludedFromTotal: false }
];

const mockTxs = [
  { id: "tx-1", accountId: "acc-1", amount: 10000 },
  { id: "tx-2", accountId: "acc-2", toAccountId: "acc-1", amount: 5000 },
  { id: "tx-3", accountId: "acc-5", amount: 20000 }
];

test("RF-2 y RF-3: clasificarPlanDeCuentas agrupa cuentas en Activos y Pasivos con subtotales y códigos", () => {
  const plan = clasificarPlanDeCuentas(mockAccounts);

  assert.ok(plan.activos, "Debe contener grupo de activos");
  assert.ok(plan.pasivos, "Debe contener grupo de pasivos");

  assert.strictEqual(plan.activos.cuentas.length, 4);
  assert.strictEqual(plan.pasivos.cuentas.length, 1);

  // Total activos = 50.000 + 450.000 + 25.000 + 800.000 = 1.325.000
  assert.strictEqual(plan.totalActivos, 1325000);
  // Total pasivos = 120.000
  assert.strictEqual(plan.totalPasivos, 120000);
  // Patrimonio neto = 1.325.000 - 120.000 = 1.205.000
  assert.strictEqual(plan.patrimonioNeto, 1205000);

  // Códigos contables generados
  const cuentaCaja = plan.activos.cuentas.find(c => c.id === "acc-1");
  assert.match(cuentaCaja.codigoContable, /^1\./);

  const cuentaTarjeta = plan.pasivos.cuentas.find(c => c.id === "acc-5");
  assert.match(cuentaTarjeta.codigoContable, /^2\./);
});

test("RF-5: validarEdicionCuenta valida datos permitiendo el mismo nombre para la cuenta actual", () => {
  // Rechazar nombre vacío
  const resVacio = validarEdicionCuenta({ name: "", type: "bank" }, mockAccounts, "acc-2");
  assert.strictEqual(resVacio.valida, false);
  assert.match(resVacio.error, /nombre/i);

  // Permitir mantener el mismo nombre de la propia cuenta
  const resMismo = validarEdicionCuenta({ name: "Banco Principal", type: "bank" }, mockAccounts, "acc-2");
  assert.strictEqual(resMismo.valida, true);

  // Rechazar duplicar el nombre de otra cuenta
  const resDuplicado = validarEdicionCuenta({ name: "Caja Chica", type: "bank" }, mockAccounts, "acc-2");
  assert.strictEqual(resDuplicado.valida, false);
  assert.match(resDuplicado.error, /ya existe/i);

  // Rechazar tipo no soportado
  const resTipo = validarEdicionCuenta({ name: "Banco Modificado", type: "invalido" }, mockAccounts, "acc-2");
  assert.strictEqual(resTipo.valida, false);
  assert.match(resTipo.error, /tipo/i);

  // Aprobar nombre nuevo y válido
  const resValido = validarEdicionCuenta({ name: "Banco Secundario", type: "bank" }, mockAccounts, "acc-2");
  assert.strictEqual(resValido.valida, true);
});

test("RF-6: puedeEliminarCuenta evalúa movimientos asociados de forma precisa", () => {
  // acc-1 tiene 2 movimientos (tx-1 y tx-2)
  const eval1 = puedeEliminarCuenta("acc-1", mockTxs);
  assert.strictEqual(eval1.tieneMovimientos, true);
  assert.strictEqual(eval1.cantidadMovimientos, 2);

  // acc-4 no tiene movimientos
  const eval4 = puedeEliminarCuenta("acc-4", mockTxs);
  assert.strictEqual(eval4.tieneMovimientos, false);
  assert.strictEqual(eval4.cantidadMovimientos, 0);
});

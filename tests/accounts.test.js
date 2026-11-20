const test = require("node:test");
const assert = require("node:assert");
const {
  validarNuevaCuenta,
  crearCuentaObjeto,
  purgarMovimientosDeCuenta
} = require("../assets/js/financeCalculations.js");

test("RF-2: validarNuevaCuenta rechaza nombre vacío o compuesto por espacios", () => {
  const cuentasExistentes = [{ id: "1", name: "Banco Estado" }];
  const res1 = validarNuevaCuenta({ name: "", type: "bank", initialBalance: 1000 }, cuentasExistentes);
  assert.strictEqual(res1.valida, false);
  assert.match(res1.error, /nombre/i);

  const res2 = validarNuevaCuenta({ name: "   ", type: "bank", initialBalance: 1000 }, cuentasExistentes);
  assert.strictEqual(res2.valida, false);
});

test("RF-2: validarNuevaCuenta rechaza nombre duplicado insensible a mayúsculas", () => {
  const cuentasExistentes = [
    { id: "1", name: "Banco Santander" },
    { id: "2", name: "Billetera Efectivo" }
  ];

  const res1 = validarNuevaCuenta({ name: "banco santander", type: "bank" }, cuentasExistentes);
  assert.strictEqual(res1.valida, false);
  assert.match(res1.error, /ya existe/i);

  const res2 = validarNuevaCuenta({ name: "  Billetera Efectivo  ", type: "cash" }, cuentasExistentes);
  assert.strictEqual(res2.valida, false);
});

test("RF-2: validarNuevaCuenta rechaza tipo de cuenta no soportado", () => {
  const cuentas = [];
  const res = validarNuevaCuenta({ name: "Caja Fuerte", type: "cripto_desconocido" }, cuentas);
  assert.strictEqual(res.valida, false);
  assert.match(res.error, /tipo/i);
});

test("RF-2: validarNuevaCuenta aprueba datos de cuenta correctos", () => {
  const cuentas = [{ id: "1", name: "Banco Estado" }];
  const res = validarNuevaCuenta({ name: "Banco Scotiabank", type: "bank", initialBalance: 50000 }, cuentas);
  assert.strictEqual(res.valida, true);
});

test("RF-3 y RF-4: crearCuentaObjeto construye el objeto con icono, color y saldo contable adecuado", () => {
  // Cuenta bancaria estándar
  const acc1 = crearCuentaObjeto({
    name: "Banco BCI",
    type: "bank",
    initialBalance: 250000,
    currency: "CLP"
  });

  assert.strictEqual(acc1.name, "Banco BCI");
  assert.strictEqual(acc1.type, "bank");
  assert.strictEqual(acc1.initialBalance, 250000);
  assert.strictEqual(acc1.currentBalance, 250000);
  assert.strictEqual(acc1.icon, "building-2");
  assert.strictEqual(acc1.color, "#2563eb");
  assert.strictEqual(acc1.isExcludedFromTotal, false);
  assert.match(acc1.id, /^ACC-/);

  // Tarjeta de crédito con deuda inicial positiva (debe convertirse en saldo negativo)
  const acc2 = crearCuentaObjeto({
    name: "Tarjeta Mastercard",
    type: "credit_card",
    initialBalance: 80000,
    currency: "CLP"
  });

  assert.strictEqual(acc2.type, "credit_card");
  assert.strictEqual(acc2.initialBalance, -80000);
  assert.strictEqual(acc2.currentBalance, -80000);
  assert.strictEqual(acc2.icon, "credit-card");
  assert.strictEqual(acc2.color, "#e11d48");
});

test("Spec 017 - RF-4: purgarMovimientosDeCuenta elimina transacciones directas, transferencias y partidas split asociadas", () => {
  const accountId = "ACC-002"; // Cuenta a eliminar

  const transacciones = [
    { id: "TX-1", accountId: "ACC-002", type: "expense", amount: 15000, description: "Gasto directo" },
    { id: "TX-2", accountId: "ACC-001", toAccountId: "ACC-002", type: "transfer", amount: 50000, description: "Transferencia a ACC-002" },
    { id: "TX-3", accountId: "ACC-002", toAccountId: "ACC-003", type: "transfer", amount: 20000, description: "Transferencia desde ACC-002" },
    {
      id: "TX-4",
      accountId: "ACC-001",
      type: "expense",
      amount: 100000,
      isSplit: true,
      splitLines: [
        { id: "L-1", targetAccountId: "ACC-002", amount: 40000 },
        { id: "L-2", targetAccountId: "ACC-003", amount: 60000 }
      ]
    },
    { id: "TX-5", accountId: "ACC-001", type: "income", amount: 500000, description: "Sueldo en ACC-001" },
    {
      id: "TX-6",
      accountId: "ACC-005",
      type: "expense",
      amount: 30000,
      isSplit: true,
      splitLines: [
        { id: "L-3", targetAccountId: "ACC-003", amount: 30000 }
      ]
    }
  ];

  const resultado = purgarMovimientosDeCuenta(accountId, transacciones);

  // Deben eliminarse TX-1, TX-2, TX-3 y TX-4 (donde ACC-002 aparece en split)
  assert.strictEqual(resultado.length, 2);
  const idsRestantes = resultado.map(t => t.id);
  assert.deepStrictEqual(idsRestantes, ["TX-5", "TX-6"]);
});


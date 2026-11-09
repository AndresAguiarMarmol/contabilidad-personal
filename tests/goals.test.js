const test = require("node:test");
const assert = require("node:assert");
const {
  validarMetaAhorro,
  calcularProgresoMeta,
  aplicarAporteMeta
} = require("../assets/js/financeCalculations.js");

test("RF-2: validarMetaAhorro rechaza datos vacíos o sin título", () => {
  const res1 = validarMetaAhorro(null);
  assert.strictEqual(res1.valida, false);

  const res2 = validarMetaAhorro({ title: "   ", targetAmount: 500000 });
  assert.strictEqual(res2.valida, false);
  assert.match(res2.error, /título/i);
});

test("RF-2: validarMetaAhorro rechaza monto objetivo menor o igual a cero", () => {
  const res1 = validarMetaAhorro({ title: "Vacaciones", targetAmount: 0 });
  assert.strictEqual(res1.valida, false);
  assert.match(res1.error, /monto objetivo/i);

  const res2 = validarMetaAhorro({ title: "Vacaciones", targetAmount: -100000 });
  assert.strictEqual(res2.valida, false);
});

test("RF-2: validarMetaAhorro aprueba datos válidos", () => {
  const res = validarMetaAhorro({
    title: "Fondo de Emergencia",
    targetAmount: 2000000,
    currentAmount: 500000,
    deadlineDate: "2027-06-30"
  });
  assert.strictEqual(res.valida, true);
});

test("RF-3: calcularProgresoMeta calcula porcentaje y monto restante", () => {
  const res = calcularProgresoMeta(400000, 1000000);
  assert.strictEqual(res.percentage, 40);
  assert.strictEqual(res.remainingAmount, 600000);
  assert.strictEqual(res.isCompleted, false);
});

test("RF-3: calcularProgresoMeta detecta meta cumplida cuando se alcanza o supera el objetivo", () => {
  const res1 = calcularProgresoMeta(1000000, 1000000);
  assert.strictEqual(res1.percentage, 100);
  assert.strictEqual(res1.remainingAmount, 0);
  assert.strictEqual(res1.isCompleted, true);

  const res2 = calcularProgresoMeta(1200000, 1000000);
  assert.strictEqual(res2.percentage, 120);
  assert.strictEqual(res2.remainingAmount, 0);
  assert.strictEqual(res2.isCompleted, true);
});

test("RF-4: aplicarAporteMeta suma el aporte de forma inmutable y valida montos", () => {
  const meta = {
    id: "GOAL-001",
    title: "Vacaciones",
    targetAmount: 1000000,
    currentAmount: 300000
  };

  const actualizada = aplicarAporteMeta(meta, 250000);
  assert.notStrictEqual(actualizada, meta);
  assert.strictEqual(actualizada.currentAmount, 550000);
  assert.strictEqual(meta.currentAmount, 300000); // Inmutabilidad

  // Aporte no positivo
  assert.throws(() => aplicarAporteMeta(meta, 0), /mayor a cero/i);
  assert.throws(() => aplicarAporteMeta(meta, -50000), /mayor a cero/i);
});


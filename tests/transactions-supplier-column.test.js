// tests/transactions-supplier-column.test.js — Pruebas unitarias para Spec 038: Columna Proveedor en Libro de Movimientos
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const indexPath = path.join(__dirname, "..", "index.html");
const indexContent = fs.readFileSync(indexPath, "utf-8");

const appPath = path.join(__dirname, "..", "assets", "js", "app.js");
const appContent = fs.readFileSync(appPath, "utf-8");

const Calculations = require("../assets/js/financeCalculations.js");

test("Spec 038 - RF-1: index.html incluye columna Proveedor / Beneficiario en la cabecera del Libro de Movimientos", () => {
  // Buscar la sección de transactions table y verificar el encabezado
  assert.match(
    indexContent,
    /<th[^>]*>Proveedor(?:\s*\/\s*Beneficiario)?<\/th>/i,
    "La cabecera de la tabla de movimientos en index.html debe incluir la columna Proveedor / Beneficiario"
  );
});

test("Spec 038 - RF-2: app.js renderiza la celda de Proveedor / Beneficiario en renderTransactions", () => {
  // Debe contener la lógica para renderizar la celda del proveedor de forma explícita
  assert.match(
    appContent,
    /<td[^>]*>[\s\S]*?tx\.supplier[\s\S]*?<\/td>/i,
    "renderTransactions debe incluir una celda td dedicada para tx.supplier"
  );

  // Colspan de tabla vacía debe ser 8
  assert.match(
    appContent,
    /colspan="8"/i,
    "El mensaje de lista vacía en renderTransactions debe tener colspan='8'"
  );
});

test("Spec 038 - RF-3: app.js incluye columna Proveedor en la tabla de Detalle de Cuenta (renderAccountDetailView)", () => {
  assert.match(
    appContent,
    /<th[^>]*>Proveedor(?:\s*\/\s*Beneficiario)?<\/th>/i,
    "renderAccountDetailView debe incluir la columna Proveedor / Beneficiario en la cabecera de su tabla"
  );
});

test("Spec 038 - RF-4: Calculations.filtrarTransacciones busca por nombre de Proveedor", () => {
  const txs = [
    { id: "tx-1", description: "Compra de víveres", supplier: "Supermercado Líder", category: "Alimentación", amount: 45000, type: "expense" },
    { id: "tx-2", description: "Carga de combustible", supplier: "Copec", category: "Transporte", amount: 30000, type: "expense" },
    { id: "tx-3", description: "Pago de servicios", supplier: "Enel Distribución", category: "Vivienda", amount: 28000, type: "expense" }
  ];

  // Búsqueda por coincidencia parcial de proveedor
  const resLider = Calculations.filtrarTransacciones(txs, { search: "Líder" });
  assert.equal(resLider.length, 1);
  assert.equal(resLider[0].id, "tx-1");

  const resCopec = Calculations.filtrarTransacciones(txs, { search: "copec" });
  assert.equal(resCopec.length, 1);
  assert.equal(resCopec[0].id, "tx-2");

  const resEnel = Calculations.filtrarTransacciones(txs, { search: "enel" });
  assert.equal(resEnel.length, 1);
  assert.equal(resEnel[0].id, "tx-3");
});

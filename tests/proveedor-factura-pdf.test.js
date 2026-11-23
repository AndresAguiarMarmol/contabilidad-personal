// tests/proveedor-factura-pdf.test.js — Pruebas unitarias para Spec 033: Proveedor y Factura-Boleta PDF
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schemaPath = path.join(__dirname, "..", "schema.sql");
const schemaContent = fs.readFileSync(schemaPath, "utf-8");

const calcPath = path.join(__dirname, "..", "assets", "js", "financeCalculations.js");
const calcModule = require(calcPath);
const Calculations = calcModule.Calculations || calcModule;

const appPath = path.join(__dirname, "..", "assets", "js", "app.js");
const appContent = fs.readFileSync(appPath, "utf-8");

test("Spec 033 - RF-1 & RF-2: schema.sql incluye columnas supplier e invoice_pdf en transactions", () => {
  assert.match(
    schemaContent,
    /CREATE TABLE IF NOT EXISTS transactions[\s\S]*?supplier\s+TEXT/i,
    "schema.sql debe incluir la columna supplier en la tabla transactions"
  );
  assert.match(
    schemaContent,
    /CREATE TABLE IF NOT EXISTS transactions[\s\S]*?invoice_pdf\s+TEXT/i,
    "schema.sql debe incluir la columna invoice_pdf en la tabla transactions"
  );
});

test("Spec 033 - RF-1: Calculations.normalizarProveedor procesa cadenas y limpia espacios", () => {
  assert.equal(typeof Calculations.normalizarProveedor, "function", "normalizarProveedor debe ser una función");
  assert.equal(Calculations.normalizarProveedor("  Supermercado Líder  "), "Supermercado Líder");
  assert.equal(Calculations.normalizarProveedor(""), null);
  assert.equal(Calculations.normalizarProveedor("   "), null);
  assert.equal(Calculations.normalizarProveedor(null), null);
  assert.equal(Calculations.normalizarProveedor(undefined), null);
});

test("Spec 033 - RF-2 & RF-3: Calculations.generarNombreComprobante genera nombres limpios para el PDF", () => {
  assert.equal(typeof Calculations.generarNombreComprobante, "function", "generarNombreComprobante debe ser una función");
  const nombre = Calculations.generarNombreComprobante("Luz y Agua Enel", "2026-11-23");
  assert.match(nombre, /^comprobante_luz_y_agua_enel_2026-11-23\.pdf$/i);

  const nombreVacio = Calculations.generarNombreComprobante("", "2026-11-23");
  assert.match(nombreVacio, /^comprobante_2026-11-23\.pdf$/i);
});

test("Spec 033 - RF-1 & RF-2: validarTransaccion valida defensivamente supplier e invoicePdf", () => {
  const baseTx = {
    amount: 15000,
    description: "Almuerzo de trabajo",
    accountId: "ACC-001",
    type: "expense"
  };

  // Válido con supplier y sin invoice
  const res1 = Calculations.validarTransaccion({
    ...baseTx,
    supplier: "Restaurante Central"
  });
  assert.equal(res1.valida, true);

  // Válido con invoicePdf formato data URL
  const res2 = Calculations.validarTransaccion({
    ...baseTx,
    supplier: "Restaurante Central",
    invoicePdf: "data:application/pdf;base64,JVBERi0xLjQK...",
    invoiceName: "factura_123.pdf"
  });
  assert.equal(res2.valida, true);

  // Rechaza supplier no string
  const res3 = Calculations.validarTransaccion({
    ...baseTx,
    supplier: 12345
  });
  assert.equal(res3.valida, false);
  assert.match(res3.error, /proveedor/i);
});

test("Spec 033 - RF-1, RF-2, RF-3: app.js contiene controles de Proveedor, Cámara y Factura PDF en openTransactionModal", () => {
  assert.match(
    appContent,
    /id="tx-input-supplier"/i,
    "El formulario de transacción debe contener el campo #tx-input-supplier"
  );
  assert.match(
    appContent,
    /id="btn-camera-invoice"/i,
    "El formulario de transacción debe contener el botón para tomar foto #btn-camera-invoice"
  );
  assert.match(
    appContent,
    /id="btn-upload-invoice"/i,
    "El formulario de transacción debe contener el botón para subir archivo #btn-upload-invoice"
  );
  assert.match(
    appContent,
    /id="tx-invoice-preview-container"/i,
    "El formulario debe contener el contenedor de vista previa #tx-invoice-preview-container"
  );
});

test("Spec 033 - RF-2: renderTransactionsTable incluye visualización del proveedor y botón para ver PDF", () => {
  assert.match(
    appContent,
    /tx\.supplier/i,
    "renderTransactionsTable debe contemplar la renderización de tx.supplier"
  );
  assert.match(
    appContent,
    /tx\.invoicePdf/i,
    "renderTransactionsTable debe contemplar la visualización del comprobante tx.invoicePdf"
  );
  assert.match(
    appContent,
    /btn-view-invoice/i,
    "renderTransactionsTable debe incluir la clase .btn-view-invoice para visualizar el PDF adjunto"
  );
});

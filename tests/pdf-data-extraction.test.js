// tests/pdf-data-extraction.test.js — Pruebas unitarias para Spec 034: Extracción de Datos desde PDF
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const calcPath = path.join(__dirname, "..", "assets", "js", "financeCalculations.js");
const calcModule = require(calcPath);
const Calculations = calcModule.Calculations || calcModule;

const htmlPath = path.join(__dirname, "..", "index.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");

const appPath = path.join(__dirname, "..", "assets", "js", "app.js");
const appContent = fs.readFileSync(appPath, "utf-8");

test("Spec 034 - RF-1: Calculations.parsearFechaComprobante extrae y normaliza fechas", () => {
  assert.equal(typeof Calculations.parsearFechaComprobante, "function", "parsearFechaComprobante debe ser una función");

  // Formato DD/MM/YYYY
  assert.equal(Calculations.parsearFechaComprobante("Fecha: 15/04/2026 Hora: 14:30"), "2026-04-15");

  // Formato DD-MM-YYYY
  assert.equal(Calculations.parsearFechaComprobante("Fecha de Emisión: 03-10-2026"), "2026-10-03");

  // Formato YYYY-MM-DD
  assert.equal(Calculations.parsearFechaComprobante("DOCUMENTO EMITIDO EL 2026-08-25"), "2026-08-25");

  // Formato textual en español
  assert.equal(Calculations.parsearFechaComprobante("Santiago, 23 de Noviembre de 2026"), "2026-11-23");

  // Texto sin fecha
  assert.equal(Calculations.parsearFechaComprobante("Solo texto sin ninguna fecha valida"), null);
});

test("Spec 034 - RF-1: Calculations.parsearMontoComprobante extrae el importe total con precisión", () => {
  assert.equal(typeof Calculations.parsearMontoComprobante, "function", "parsearMontoComprobante debe ser una función");

  // Total con signo peso y punto de miles
  assert.equal(Calculations.parsearMontoComprobante("TOTAL A PAGAR: $ 45.990\nGRACIAS POR SU COMPRA"), 45990);

  // Total con subtotal e IVA
  const boleta = `
    SUBTOTAL NETO: $ 25.000
    IVA (19%): $ 4.750
    TOTAL: $ 29.750
  `;
  assert.equal(Calculations.parsearMontoComprobante(boleta), 29750);

  // Formato sin signo de peso
  assert.equal(Calculations.parsearMontoComprobante("MONTO TOTAL: 125000 CLP"), 125000);

  // Texto sin monto
  assert.equal(Calculations.parsearMontoComprobante("Solo palabras sin cifras"), null);
});

test("Spec 034 - RF-1: Calculations.inferirProveedorComprobante detecta comercios y razones sociales", () => {
  assert.equal(typeof Calculations.inferirProveedorComprobante, "function", "inferirProveedorComprobante debe ser una función");

  assert.equal(Calculations.inferirProveedorComprobante("ENEL DISTRIBUCION CHILE S.A.\nRUT: 76.123.456-7"), "Enel");
  assert.equal(Calculations.inferirProveedorComprobante("WALMART CHILE S.A.\nSUPERMERCADO LIDER"), "Líder");
  assert.equal(Calculations.inferirProveedorComprobante("FALABELLA RETAIL S.A.\nBOLETA ELECTRONICA"), "Falabella");
  assert.equal(Calculations.inferirProveedorComprobante("AGUAS ANDINAS S.A.\nCUENTA UNICA"), "Aguas Andinas");
  assert.equal(Calculations.inferirProveedorComprobante("COPEC S.A.\nESTACION DE SERVICIO"), "Copec");
});

test("Spec 034 - RF-1: Calculations.inferirMedioPagoComprobante identifica la forma de pago", () => {
  assert.equal(typeof Calculations.inferirMedioPagoComprobante, "function", "inferirMedioPagoComprobante debe ser una función");

  assert.equal(Calculations.inferirMedioPagoComprobante("FORMA DE PAGO: TARJETA DE DEBITO REDCOMPRA"), "debit");
  assert.equal(Calculations.inferirMedioPagoComprobante("PAGADO CON TARJETA DE CREDITO VISA"), "credit");
  assert.equal(Calculations.inferirMedioPagoComprobante("MEDIO: TRANSFERENCIA BANCARIA ELECTRÓNICA"), "transfer");
  assert.equal(Calculations.inferirMedioPagoComprobante("PAGO EN EFECTIVO"), "cash");
  assert.equal(Calculations.inferirMedioPagoComprobante("Texto sin medio de pago especificado"), null);
});

test("Spec 034 - RF-1: Calculations.inferirCategoriaComprobante mapea hacia el catálogo contable", () => {
  assert.equal(typeof Calculations.inferirCategoriaComprobante, "function", "inferirCategoriaComprobante debe ser una función");

  const catalogoEjemplo = [
    { code: "5.1.01", name: "Servicios Básicos (Luz, Agua, Gas)", classNumber: 5 },
    { code: "5.2.01", name: "Alimentación y Supermercado", classNumber: 5 },
    { code: "5.3.01", name: "Transporte y Combustible", classNumber: 5 },
    { code: "5.4.01", name: "Salud y Farmacia", classNumber: 5 }
  ];

  const catEnel = Calculations.inferirCategoriaComprobante("Factura de electricidad", "Enel", catalogoEjemplo);
  assert.equal(catEnel.code, "5.1.01");

  const catLider = Calculations.inferirCategoriaComprobante("Compra de abarrotes y víveres", "Líder", catalogoEjemplo);
  assert.equal(catLider.code, "5.2.01");

  const catCopec = Calculations.inferirCategoriaComprobante("Carga de bencina 95", "Copec", catalogoEjemplo);
  assert.equal(catCopec.code, "5.3.01");
});

test("Spec 034 - RF-1: Calculations.extraerDatosDesdeTextoComprobante consolida todos los campos", () => {
  assert.equal(typeof Calculations.extraerDatosDesdeTextoComprobante, "function", "extraerDatosDesdeTextoComprobante debe ser una función");

  const catalogo = [
    { code: "5.1.01", name: "Servicios Básicos (Luz, Agua, Gas)", classNumber: 5 }
  ];

  const textoFactura = `
    ENEL DISTRIBUCION CHILE S.A.
    R.U.T.: 76.123.456-7
    FECHA DE EMISION: 23/11/2026
    FORMA DE PAGO: TARJETA DE DEBITO
    DETALLE: CONSUMO ELECTRICO
    TOTAL A PAGAR: $ 38.500
  `;

  const datos = Calculations.extraerDatosDesdeTextoComprobante(textoFactura, catalogo);
  assert.equal(datos.fecha, "2026-11-23");
  assert.equal(datos.monto, 38500);
  assert.equal(datos.proveedor, "Enel");
  assert.equal(datos.tipoPago, "debit");
  assert.equal(datos.categoriaCodigo, "5.1.01");
});

test("Spec 034 - RF-2, RF-3, RF-4: index.html incluye pdf.js y app.js contiene banner de autocompletado", () => {
  assert.match(htmlContent, /pdf(?:\.min)?\.js/i, "index.html debe cargar pdf.js para lectura de documentos PDF");

  assert.match(
    appContent,
    /tx-auto-extracted-banner/i,
    "app.js debe contemplar el banner informativo #tx-auto-extracted-banner"
  );
  assert.match(
    appContent,
    /extraerTextoDesdePdf/i,
    "app.js debe definir la función extraerTextoDesdePdf"
  );
});

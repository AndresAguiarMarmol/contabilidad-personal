import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar calculations
import CalculationsModule from "../assets/js/financeCalculations.js";
const Calculations = CalculationsModule.default || CalculationsModule;

const appJsPath = path.join(__dirname, "../assets/js/app.js");
const appJs = fs.readFileSync(appJsPath, "utf-8");

describe("Spec 048: Opción de Duplicar Movimiento en Modal de Edición", () => {
  const mockOriginalTx = {
    id: "TX-100",
    date: "2026-05-10T14:30:00.000Z",
    type: "expense",
    amount: 45000,
    description: "Compra Mensual Supermercado Lider",
    supplier: "Supermercado Lider",
    invoicePdf: "data:application/pdf;base64,JVBERi0xLjQK...",
    invoiceName: "boleta_mayo.pdf",
    accountId: "ACC-BANK-1",
    category: "Alimentación y Supermercado",
    categoryCode: "5.1.01",
    paymentMethod: "debit",
    isSplit: false
  };

  const mockOriginalSplitTx = {
    id: "TX-SPLIT-200",
    date: "2026-04-12T10:00:00.000Z",
    type: "expense",
    amount: 100000,
    description: "Gasto Mixto Hogar y Tecnología",
    supplier: "Falabella",
    invoicePdf: "data:application/pdf;base64,JVBERi...",
    invoiceName: "factura_abril.pdf",
    accountId: "ACC-BANK-1",
    category: "Varios (Split)",
    isSplit: true,
    splitLines: [
      { id: "SPL-1", description: "Hogar", amount: 60000, category: "Muebles", categoryCode: "5.1.02" },
      { id: "SPL-2", description: "Tecnología", amount: 40000, category: "Electrónica", categoryCode: "5.1.03" }
    ]
  };

  it("RF-1: clonarMovimiento clona una transacción desvinculando ID original y asignando fecha de hoy por defecto", () => {
    assert.equal(typeof Calculations.clonarMovimiento, "function", "clonarMovimiento debe ser una función exportada");

    const clonada = Calculations.clonarMovimiento(mockOriginalTx);

    assert.notEqual(clonada.id, mockOriginalTx.id, "El ID clonado no debe ser igual al original");
    assert.ok(clonada.id && clonada.id.startsWith("TX-"), "Debe generar un ID nuevo con prefijo TX-");
    assert.equal(clonada.amount, 45000, "Monto debe preservarse intacto");
    assert.equal(clonada.description, "Compra Mensual Supermercado Lider", "Descripción debe ser idéntica");
    assert.equal(clonada.supplier, "Supermercado Lider", "Proveedor debe ser idéntico");
    assert.equal(clonada.category, "Alimentación y Supermercado", "Categoría debe ser idéntica");
    assert.equal(clonada.categoryCode, "5.1.01", "Código de categoría debe ser idéntico");
    assert.equal(clonada.accountId, "ACC-BANK-1", "Cuenta origen debe ser idéntica");
    assert.equal(clonada.paymentMethod, "debit", "Medio de pago debe ser idéntico");

    // Fecha de hoy por defecto (formato YYYY-MM-DD o ISO)
    const todayYmd = new Date().toISOString().slice(0, 10);
    assert.ok(clonada.date.startsWith(todayYmd), "La fecha debe corresponder a la fecha de hoy por defecto");
  });

  it("RF-1: clonarMovimiento limpia el comprobante adjunto por defecto (Decisión 2.b)", () => {
    const clonada = Calculations.clonarMovimiento(mockOriginalTx);

    assert.equal(clonada.invoicePdf, null, "invoicePdf debe ser null en el duplicado");
    assert.equal(clonada.invoiceName, null, "invoiceName debe ser null en el duplicado");
  });

  it("RF-1: clonarMovimiento clona correctamente movimientos divididos (Split) con nuevas líneas de partida", () => {
    const clonada = Calculations.clonarMovimiento(mockOriginalSplitTx);

    assert.equal(clonada.isSplit, true, "isSplit debe ser true");
    assert.equal(clonada.splitLines.length, 2, "Debe tener 2 partidas");
    assert.notEqual(clonada.splitLines[0].id, mockOriginalSplitTx.splitLines[0].id, "Las partidas deben tener IDs nuevos");
    assert.equal(clonada.splitLines[0].amount, 60000);
    assert.equal(clonada.splitLines[1].amount, 40000);
    assert.equal(clonada.splitLines[0].category, "Muebles");
  });

  it("RF-2: app.js incluye el botón #btn-duplicate-tx en el modal de edición de movimiento", () => {
    assert.ok(
      appJs.includes('id="btn-duplicate-tx"'),
      "app.js debe definir o renderizar el botón #btn-duplicate-tx cuando txToEdit existe"
    );
    assert.ok(
      appJs.includes("Duplicar"),
      "El botón debe contener la etiqueta 'Duplicar'"
    );
  });

  it("RF-3: app.js enlaza el clic de #btn-duplicate-tx para transicionar el formulario a nuevo registro sin alterar original", () => {
    assert.ok(
      appJs.includes("btn-duplicate-tx") &&
      (appJs.includes("Registrar Nuevo Movimiento (Copia)") || appJs.includes("Nuevo Movimiento (Copia)")),
      "Al pulsar Duplicar, el título debe indicar que es una copia / nuevo registro"
    );
    assert.ok(
      appJs.includes("Guardar Movimiento"),
      "Al duplicar, el botón de acción debe cambiar a 'Guardar Movimiento'"
    );
  });
});

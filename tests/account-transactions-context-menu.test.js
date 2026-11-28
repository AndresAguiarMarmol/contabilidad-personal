import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.join(__dirname, "../index.html");
const appJsPath = path.join(__dirname, "../assets/js/app.js");

const html = fs.readFileSync(indexPath, "utf-8");
const appJs = fs.readFileSync(appJsPath, "utf-8");

describe("Spec 049: Menú Contextual con CRUD y Duplicación de Movimientos en Cuentas y Billeteras", () => {
  it("RF-1: index.html define el componente #tx-context-menu con las opciones CRUD y Duplicar", () => {
    assert.ok(
      html.includes('id="tx-context-menu"'),
      "index.html debe contener el elemento #tx-context-menu"
    );
    assert.ok(
      html.includes('id="ctx-tx-edit"'),
      "Debe existir la opción de editar #ctx-tx-edit"
    );
    assert.ok(
      html.includes('id="ctx-tx-duplicate"'),
      "Debe existir la opción de duplicar #ctx-tx-duplicate"
    );
    assert.ok(
      html.includes('id="ctx-tx-view-pdf"'),
      "Debe existir la opción de ver PDF #ctx-tx-view-pdf"
    );
    assert.ok(
      html.includes('id="ctx-tx-delete"'),
      "Debe existir la opción de eliminar #ctx-tx-delete"
    );
    assert.ok(
      html.includes('id="ctx-tx-new"'),
      "Debe existir la opción de nuevo movimiento #ctx-tx-new"
    );
  });

  it("RF-2: app.js implementa funciones para abrir y cerrar el menú contextual ajustando límites de viewport", () => {
    assert.ok(
      appJs.includes("abrirMenuContextualMovimiento"),
      "app.js debe definir la función abrirMenuContextualMovimiento"
    );
    assert.ok(
      appJs.includes("cerrarMenuContextualMovimiento"),
      "app.js debe definir la función cerrarMenuContextualMovimiento"
    );
  });

  it("RF-3: renderAccountDetailView registra listeners de contextmenu y botón de opciones en las filas", () => {
    const fnMatch = appJs.match(/function renderAccountDetailView\(\)[\s\S]*?(?=\n\s*(?:function|const|let)\s+[a-zA-Z0-9_]+\s*\(|\n\s*\/\/\s*={10,}|$)/);
    assert.ok(fnMatch, "Debe existir la función renderAccountDetailView");
    const fnCode = fnMatch[0];

    assert.ok(
      fnCode.includes("contextmenu"),
      "renderAccountDetailView debe escuchar el evento 'contextmenu' para clic derecho en filas"
    );
    assert.ok(
      fnCode.includes("abrirMenuContextualMovimiento"),
      "renderAccountDetailView debe invocar abrirMenuContextualMovimiento"
    );
  });

  it("RF-3: renderTransactions registra listeners de contextmenu en el Libro de Movimientos (Alcance 2.a)", () => {
    const fnMatch = appJs.match(/function renderTransactions\(\)[\s\S]*?(?=\n\s*(?:function|const|let)\s+[a-zA-Z0-9_]+\s*\(|\n\s*\/\/\s*={10,}|$)/);
    assert.ok(fnMatch, "Debe existir la función renderTransactions");
    const fnCode = fnMatch[0];

    assert.ok(
      fnCode.includes("contextmenu"),
      "renderTransactions debe escuchar el evento 'contextmenu' para clic derecho"
    );
  });

  it("RF-4: app.js enlaza las acciones del menú contextual (editar, duplicar, ver PDF, eliminar, nuevo) y cierre con Escape/click", () => {
    assert.ok(
      appJs.includes("ctx-tx-edit") && appJs.includes("ctx-tx-duplicate") && appJs.includes("ctx-tx-delete"),
      "app.js debe enlazar los eventos de clic para las opciones del menú contextual"
    );
    assert.ok(
      appJs.includes("Escape") && appJs.includes("cerrarMenuContextualMovimiento"),
      "app.js debe cerrar el menú al presionar Escape"
    );
  });
});

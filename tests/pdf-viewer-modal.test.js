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

describe("Spec 047: Visor Integrado de Comprobantes PDF (In-App PDF Viewer Modal) con Retorno Garantizado en iOS / iPhone", () => {
  it("RF-1: index.html incluye el elemento <dialog id='modal-pdf-viewer'> con los controles requeridos", () => {
    assert.ok(
      html.includes('id="modal-pdf-viewer"'),
      "index.html debe contener el elemento <dialog id='modal-pdf-viewer'>"
    );
    assert.ok(
      html.includes('id="btn-close-pdf-modal"'),
      "Debe existir el botón de retorno #btn-close-pdf-modal"
    );
    assert.ok(
      html.includes('id="pdf-modal-filename"'),
      "Debe existir el contenedor del nombre del archivo #pdf-modal-filename"
    );
    assert.ok(
      html.includes('id="pdf-viewer-frame"'),
      "Debe existir el elemento del visor #pdf-viewer-frame"
    );
    assert.ok(
      html.includes('id="btn-download-pdf-modal"'),
      "Debe existir el botón de descarga #btn-download-pdf-modal"
    );
  });

  it("RF-2: El botón de cierre incluye etiqueta visible de retorno y tamaño táctil amigable", () => {
    const modalMatch = html.match(/<dialog id="modal-pdf-viewer"[\s\S]*?<\/dialog>/);
    assert.ok(modalMatch, "El modal #modal-pdf-viewer debe poder extraerse del HTML");
    const modalContent = modalMatch[0];

    assert.ok(
      modalContent.includes("Volver") || modalContent.includes("Cerrar"),
      "El botón de retorno debe incluir texto explícito 'Volver' o 'Cerrar' para máxima usabilidad en iPhone"
    );
  });

  it("RF-3: app.js implementa abrirComprobantePdf abriendo el modal integrado sin navegar fuera de la app", () => {
    // abrirComprobantePdf debe invocar showModal o utilizar modal-pdf-viewer
    assert.ok(
      appJs.includes('modal-pdf-viewer') && appJs.includes('showModal()'),
      "abrirComprobantePdf debe abrir el modal #modal-pdf-viewer con showModal()"
    );
  });

  it("RF-4: app.js vincula el evento de cierre de #btn-close-pdf-modal para cerrar el modal y liberar memoria", () => {
    assert.ok(
      appJs.includes('btn-close-pdf-modal'),
      "app.js debe registrar el listener de click para #btn-close-pdf-modal"
    );
  });

  it("RF-5: renderAccountDetailView vincula los botones .btn-view-invoice para visualizar PDFs", () => {
    // Extraer función renderAccountDetailView
    const fnMatch = appJs.match(/function renderAccountDetailView\(\)[\s\S]*?(?=\n\s*(?:function|const|let)\s+[a-zA-Z0-9_]+\s*\(|\n\s*\/\/\s*={10,}|$)/);
    assert.ok(fnMatch, "Debe existir la función renderAccountDetailView en app.js");
    const fnCode = fnMatch[0];

    assert.ok(
      fnCode.includes("btn-view-invoice") && fnCode.includes("abrirComprobantePdf"),
      "renderAccountDetailView debe vincular los botones .btn-view-invoice a abrirComprobantePdf"
    );
  });
});

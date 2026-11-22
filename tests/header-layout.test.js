// tests/header-layout.test.js — Pruebas unitarias para Spec 030: Header con Marca y Menú a la Derecha
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "..", "index.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");

test("Spec 030 - RF-1: El header contiene 'ContaPersonal' y 'Finanzas Personales' en el lado izquierdo", () => {
  // Localizar la etiqueta <header>
  const headerMatch = htmlContent.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
  assert.ok(headerMatch, "El documento debe contener un elemento <header>");

  const headerHtml = headerMatch[1];
  assert.match(headerHtml, /Conta[\s\S]*?Personal/i, "Debe contener la marca ContaPersonal");
  assert.match(headerHtml, /Finanzas Personales/i, "Debe contener el subtítulo Finanzas Personales");
});

test("Spec 030 - RF-2: El botón #btn-open-sidebar está ubicado a la derecha y contiene 'Menú'", () => {
  const headerMatch = htmlContent.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
  assert.ok(headerMatch);
  const headerHtml = headerMatch[1];

  // El botón #btn-open-sidebar debe estar presente en el header
  assert.match(headerHtml, /id="btn-open-sidebar"[^>]*>[\s\S]*?Menú/i, "#btn-open-sidebar debe contener el texto Menú");

  // El botón debe estar después de #auth-user-widget o de #btn-quick-sync (lado derecho)
  const syncPos = headerHtml.indexOf('id="btn-quick-sync"');
  const btnPos = headerHtml.indexOf('id="btn-open-sidebar"');
  assert.ok(btnPos > syncPos, "#btn-open-sidebar debe posicionarse en el extremo derecho (después de sincronizar)");
});

test("Spec 030 - RF-4: Los identificadores #page-title y #page-subtitle se preservan en el DOM", () => {
  assert.match(htmlContent, /id="page-title"/i);
  assert.match(htmlContent, /id="page-subtitle"/i);
});

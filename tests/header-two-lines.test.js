// tests/header-two-lines.test.js — Pruebas unitarias para Spec 032: Header en 2 Líneas
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "..", "index.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");

test("Spec 032 - RF-1: <header> tiene layout flex-col para estructurarse en 2 líneas", () => {
  const headerMatch = htmlContent.match(/<header[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/header>/i);
  assert.ok(headerMatch, "Debe existir un elemento <header>");

  const classNames = headerMatch[1];
  assert.match(classNames, /flex-col/i, "El elemento <header> debe incluir flex-col para albergar dos filas");
});

test("Spec 032 - RF-2: Línea 1 contiene la marca institucional y el widget de usuario", () => {
  const headerMatch = htmlContent.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
  assert.ok(headerMatch);
  const headerHtml = headerMatch[1];

  // Identificar los dos contenedores de fila principales
  const rows = headerHtml.split(/<!--\s*Línea\s*2/i);
  assert.equal(rows.length, 2, "El header debe contener dos secciones de línea bien delimitadas");

  const row1Html = rows[0];
  assert.match(row1Html, /Conta[\s\S]*?Personal/i, "Fila 1 debe incluir la marca ContaPersonal");
  assert.match(row1Html, /Finanzas Personales/i, "Fila 1 debe incluir el subtítulo Finanzas Personales");
  assert.match(row1Html, /id="auth-user-widget"/i, "Fila 1 debe alojar #auth-user-widget a la derecha");
});

test("Spec 032 - RF-3: Línea 2 contiene el título de vista y los botones de acción con el menú", () => {
  const headerMatch = htmlContent.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
  assert.ok(headerMatch);
  const headerHtml = headerMatch[1];

  const rows = headerHtml.split(/<!--\s*Línea\s*2/i);
  assert.equal(rows.length, 2);

  const row2Html = rows[1];
  assert.match(row2Html, /id="page-title"/i, "Fila 2 debe contener #page-title");
  assert.match(row2Html, /id="page-subtitle"/i, "Fila 2 debe contener #page-subtitle");
  assert.match(row2Html, /id="btn-quick-sync"/i, "Fila 2 debe contener #btn-quick-sync");
  assert.match(row2Html, /id="btn-quick-new-tx"/i, "Fila 2 debe contener #btn-quick-new-tx");
  assert.match(row2Html, /id="btn-open-sidebar"/i, "Fila 2 debe contener #btn-open-sidebar");
});

test("Spec 032 - RF-4: #page-title no está oculto en pantallas móviles (no tiene hidden xl:flex)", () => {
  const headerMatch = htmlContent.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
  assert.ok(headerMatch);
  const headerHtml = headerMatch[1];

  // Verificar que el contenedor de #page-title no esté oculto en móviles
  assert.doesNotMatch(
    headerHtml,
    /class="[^"]*hidden\s+xl:flex[^"]*"[^>]*>[\s\S]*?id="page-title"/i,
    "#page-title no debe estar oculto con hidden xl:flex para permitir ver el título de vista en móvil"
  );
});

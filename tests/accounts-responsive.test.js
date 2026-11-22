// tests/accounts-responsive.test.js — Pruebas unitarias para Spec 029: Ergonomía Móvil de Cuentas Financieras
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "..", "index.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");

const appJsPath = path.join(__dirname, "..", "assets", "js", "app.js");
const appJsContent = fs.readFileSync(appJsPath, "utf-8");

test("Spec 029 - RF-1: #accounts-grid usa grid-cols-2 en móvil para desplegar 2 por fila", () => {
  assert.match(
    htmlContent,
    /id="accounts-grid"[^>]*class="[^"]*grid-cols-2\s+sm:grid-cols-2/i,
    "El contenedor #accounts-grid debe incluir grid-cols-2 para vista móvil en iPhone"
  );
});

test("Spec 029 - RF-2: Las tarjetas de cuenta generadas en app.js tienen padding responsivo p-3 sm:p-5", () => {
  assert.match(
    appJsContent,
    /class="account-card[^"]*p-3 sm:p-5/i,
    "La tarjeta de cuenta debe usar padding compacto p-3 en móvil y sm:p-5 en pantallas mayores"
  );
});

test("Spec 029 - RF-2 & RF-3: Los iconos de cuentas en app.js se ajustan proporcionalmente para móvil", () => {
  assert.match(
    appJsContent,
    /w-7 h-7 sm:w-10 sm:h-10/i,
    "El contenedor del icono de la cuenta debe usar dimensiones w-7 h-7 en móvil y sm:w-10 sm:h-10 en pantallas mayores"
  );
});

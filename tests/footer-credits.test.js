// tests/footer-credits.test.js — Pruebas unitarias para Spec 027: Footer de Créditos, Versión y Contacto
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "..", "index.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");

test("Spec 027 - RF-1: index.html contiene créditos de Análisis y Diseño para Andres Aguiar", () => {
  assert.match(htmlContent, /Análisis y Diseño:?<\/strong>\s*Andres Aguiar/i);
});

test("Spec 027 - RF-2: index.html contiene identificación de Versión V1.0 — Santiago de Chile", () => {
  assert.match(htmlContent, /Versión:?<\/strong>\s*V1\.0\s*—\s*Santiago de Chile/i);
});

test("Spec 027 - RF-3 & RF-4: index.html contiene enlace funcional y seguro a WhatsApp", () => {
  assert.match(htmlContent, /href="https:\/\/wa\.me\/56933395447"/);
  assert.match(htmlContent, /\+56933395447/);
  assert.match(htmlContent, /target="_blank"/);
  assert.match(htmlContent, /rel="noopener noreferrer"/);
});

test("Spec 027 - RF-5: El footer está presente en el área principal de la app (#app-footer)", () => {
  assert.match(htmlContent, /<footer[^>]*id="app-footer"/i);
});

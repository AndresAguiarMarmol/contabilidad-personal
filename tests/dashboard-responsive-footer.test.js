// tests/dashboard-responsive-footer.test.js — Pruebas unitarias para Spec 028: Ergonomía Móvil Dashboard y Footer
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "..", "index.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");

test("Spec 028 - RF-1: Las tarjetas de métricas del Dashboard usan grid-cols-2 en móvil", () => {
  assert.match(
    htmlContent,
    /id="view-dashboard"[^>]*>[\s\S]*?<div class="grid grid-cols-2\s+sm:grid-cols-2\s+lg:grid-cols-4/i,
    "El contenedor de métricas debe tener grid-cols-2 para desplegar 2 elementos por fila en móvil"
  );
});

test("Spec 028 - RF-2: Las tarjetas de métricas tienen padding responsivo p-3 sm:p-5", () => {
  assert.match(
    htmlContent,
    /p-3 sm:p-5 rounded-xl border/i,
    "Las tarjetas deben tener padding reducido en móvil (p-3) y estándar en pantallas mayores (sm:p-5)"
  );
});

test("Spec 028 - RF-3: La lista de progreso de presupuestos en Dashboard usa grid-cols-2 en móvil", () => {
  assert.match(
    htmlContent,
    /id="dash-budget-progress-list"\s+class="grid grid-cols-2\s+sm:grid-cols-2\s+lg:grid-cols-4/i,
    "La lista de presupuestos en dashboard debe admitir 2 columnas en móvil"
  );
});

test("Spec 028 - RF-4: <main> tiene flex flex-col y #app-footer tiene mt-auto para fijarse en la parte baja", () => {
  assert.match(
    htmlContent,
    /<main[^>]*class="[^"]*flex\s+flex-col/i,
    "El contenedor <main> debe ser un flex-col para permitir expansión vertical"
  );
  assert.match(
    htmlContent,
    /<footer[^>]*id="app-footer"[^>]*class="[^"]*mt-auto/i,
    "#app-footer debe tener mt-auto para empujarse hacia el fondo de la pantalla en PC"
  );
});

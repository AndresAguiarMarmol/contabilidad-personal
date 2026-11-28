// tests/fixed-footer-mobile-scale.test.js — Pruebas unitarias para Spec 054: Footer fijo y escala móvil iPhone
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "..", "index.html");
const cssPath = path.join(__dirname, "..", "assets", "css", "styles.css");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");
const cssContent = fs.readFileSync(cssPath, "utf-8");

test("Spec 054 - RF-1: #app-footer está posicionado fuera de <main> (hermano posterior) para permanecer fijo", () => {
  // Debe existir </main> y después de </main> debe ubicarse <footer id="app-footer"
  const mainCloseIndex = htmlContent.indexOf("</main>");
  const footerIndex = htmlContent.indexOf('<footer id="app-footer"');
  
  assert.ok(mainCloseIndex !== -1, "Debe existir el cierre de </main>");
  assert.ok(footerIndex !== -1, "Debe existir <footer id=\"app-footer\"");
  assert.ok(
    footerIndex > mainCloseIndex,
    "#app-footer debe ubicarse DESPUÉS de </main> para no moverse con el scroll del contenido"
  );
});

test("Spec 054 - RF-2: #app-footer tiene flex-shrink-0, footer-safe y padding compacto", () => {
  const footerMatch = htmlContent.match(/<footer[^>]*id="app-footer"[^>]*class="([^"]*)"[^>]*>/i);
  assert.ok(footerMatch, "Debe encontrarse el tag #app-footer");
  const classes = footerMatch[1];
  assert.match(classes, /flex-shrink-0/i, "Debe tener flex-shrink-0");
  assert.match(classes, /footer-safe/i, "Debe tener footer-safe para respetar safe-area de iPhone");
  assert.match(classes, /border-t/i, "Debe tener borde superior sutil");
});

test("Spec 054 - RF-3: styles.css define escala móvil de 14px / text-size-adjust para viewports <= 640px", () => {
  // Debe existir una media query para <= 640px que reduzca font-size en html
  assert.match(
    cssContent,
    /@media[^{]*max-width:\s*640px[^{]*\{[\s\S]*?html\s*\{[\s\S]*?font-size:\s*14px/i,
    "styles.css debe definir font-size: 14px en html para pantallas móviles <= 640px"
  );
  assert.match(
    cssContent,
    /-webkit-text-size-adjust:\s*100%/i,
    "styles.css debe definir -webkit-text-size-adjust: 100% para prevenir auto-escalado no controlado"
  );
});

test("Spec 054 - RF-4: styles.css previene zoom forzado en inputs en móviles", () => {
  assert.match(
    cssContent,
    /@media[^{]*max-width:\s*640px[^{]*\{[\s\S]*?(?:input|select|textarea)[\s\S]*?font-size:\s*16px/i,
    "styles.css debe fijar font-size: 16px en inputs para pantallas móviles para evitar el zoom forzado de iOS Safari"
  );
});

test("Spec 054 - RF-5: #auth-gate-screen tiene isotipo y tarjeta responsivos adaptados a móvil", () => {
  assert.match(
    htmlContent,
    /id="auth-gate-screen"[\s\S]*?w-12\s+h-12\s+sm:w-14\s+sm:h-14/i,
    "El isotipo de auth-gate-screen debe usar w-12 h-12 en móvil para no ser gigantesco"
  );
});

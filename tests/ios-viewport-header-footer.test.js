// tests/ios-viewport-header-footer.test.js — Pruebas unitarias para Spec 031: Viewport iOS Header y Footer
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "..", "index.html");
const cssPath = path.join(__dirname, "..", "assets", "css", "styles.css");

const htmlContent = fs.readFileSync(htmlPath, "utf-8");
const cssContent = fs.readFileSync(cssPath, "utf-8");

test("Spec 031 - RF-1: index.html incluye viewport-fit=cover en la etiqueta meta viewport", () => {
  assert.match(
    htmlContent,
    /<meta\s+name="viewport"\s+content="[^"]*viewport-fit=cover[^"]*"/i,
    "La metaetiqueta viewport debe contener viewport-fit=cover para soporte de safe area en iOS"
  );
});

test("Spec 031 - RF-2: styles.css incluye soporte para 100dvh y fill-available para iOS", () => {
  assert.match(
    cssContent,
    /100dvh/i,
    "styles.css debe definir regla con 100dvh para viewport dinámico en iOS Safari"
  );
  assert.match(
    cssContent,
    /-webkit-fill-available/i,
    "styles.css debe contemplar -webkit-fill-available como fallback robusto para iOS"
  );
});

test("Spec 031 - RF-3 & RF-4: <header> usa la clase .header-safe y mantiene flex-shrink-0 y compactación móvil", () => {
  const headerMatch = htmlContent.match(/<header[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/header>/i);
  assert.ok(headerMatch, "index.html debe contener un elemento <header>");

  const classNames = headerMatch[1];
  const innerHtml = headerMatch[2];

  assert.match(classNames, /header-safe/i, "El header debe incluir la clase .header-safe");
  assert.match(classNames, /flex-shrink-0/i, "El header debe tener flex-shrink-0 para evitar colapso");

  // styles.css debe declarar .header-safe con env(safe-area-inset-top)
  assert.match(
    cssContent,
    /\.header-safe[\s\S]*?env\(safe-area-inset-top/i,
    "styles.css debe declarar .header-safe con env(safe-area-inset-top)"
  );

  // #btn-quick-new-tx debe estar optimizado en mobile (texto oculto en mobile, visible en sm)
  assert.match(
    innerHtml,
    /id="btn-quick-new-tx"[\s\S]*?<span class="hidden sm:inline">Nuevo Movimiento<\/span>/i,
    "El botón #btn-quick-new-tx debe mostrar solo icono en móvil para prevenir desbordes de header"
  );
});

test("Spec 031 - RF-5: #app-footer incorpora .footer-safe y <main> incorpora contención de scroll", () => {
  const footerMatch = htmlContent.match(/<footer[^>]*id="app-footer"[^>]*class="([^"]*)"[^>]*>/i);
  assert.ok(footerMatch, "Debe existir #app-footer");
  assert.match(footerMatch[1], /footer-safe/i, "#app-footer debe incorporar la clase .footer-safe");

  // styles.css debe declarar .footer-safe con env(safe-area-inset-bottom)
  assert.match(
    cssContent,
    /\.footer-safe[\s\S]*?env\(safe-area-inset-bottom/i,
    "styles.css debe declarar .footer-safe con env(safe-area-inset-bottom)"
  );

  // <main> debe tener soporte para contención de scroll o main-scroll-safe
  const mainMatch = htmlContent.match(/<main[^>]*class="([^"]*)"[^>]*>/i);
  assert.ok(mainMatch, "Debe existir el elemento <main>");
  assert.match(mainMatch[1], /main-scroll-safe/i, "<main> debe incorporar la clase .main-scroll-safe");

  assert.match(
    cssContent,
    /\.main-scroll-safe[\s\S]*?-webkit-overflow-scrolling:\s*touch/i,
    "styles.css debe definir .main-scroll-safe con -webkit-overflow-scrolling: touch"
  );
});

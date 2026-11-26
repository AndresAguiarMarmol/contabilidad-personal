const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

describe("Spec 043: Mover Acceso de 'Plan de Cuentas' del Menú Principal a 'Configuración'", () => {
  const htmlPath = path.join(__dirname, "..", "index.html");
  const html = fs.readFileSync(htmlPath, "utf8");

  const appJsPath = path.join(__dirname, "..", "assets", "js", "app.js");
  const appJs = fs.readFileSync(appJsPath, "utf8");

  it("U-1: El menú de navegación lateral (#sidebar nav) no contiene el acceso directo a Plan de Cuentas", () => {
    // Extraer el bloque <nav> dentro de #sidebar
    const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
    assert.ok(navMatch, "El elemento <nav> debe existir en index.html");
    const navContent = navMatch[1];

    assert.strictEqual(
      navContent.includes('data-nav-view="chart-of-accounts"'),
      false,
      "El <nav> principal del sidebar no debe contener data-nav-view='chart-of-accounts'"
    );

    // Verificar que los ítems operativos principales siguen presentes
    assert.ok(navContent.includes('data-nav-view="dashboard"'), "Debe incluir Dashboard");
    assert.ok(navContent.includes('data-nav-view="accounts"'), "Debe incluir Cuentas");
    assert.ok(navContent.includes('data-nav-view="transactions"'), "Debe incluir Movimientos");
    assert.ok(navContent.includes('data-nav-view="budgets"'), "Debe incluir Presupuestos");
    assert.ok(navContent.includes('data-nav-view="reports"'), "Debe incluir Reportes");
    assert.ok(navContent.includes('data-nav-view="settings"'), "Debe incluir Configuración");
  });

  it("E-1: La vista de Configuración (#view-settings) incluye la tarjeta y botón de Plan de Cuentas", () => {
    assert.ok(html.includes('id="settings-plan-accounts-section"'), "Debe existir la sección settings-plan-accounts-section");
    assert.ok(html.includes('id="btn-settings-open-chart"'), "Debe existir el botón btn-settings-open-chart");

    // Verificar que el botón en configuración apunta a chart-of-accounts
    assert.ok(
      html.includes('data-nav-view="chart-of-accounts" id="btn-settings-open-chart"'),
      "El botón en configuración debe tener data-nav-view='chart-of-accounts'"
    );
  });

  it("E-2: switchView activa la navegación de 'settings' cuando se visualiza 'chart-of-accounts'", () => {
    assert.ok(
      appJs.includes('viewName === "chart-of-accounts" ? "settings"'),
      "switchView debe asignar 'settings' como activeNavView al estar en chart-of-accounts"
    );
  });

  it("E-3: renderChartOfAccounts incluye el botón de retorno 'Volver a Configuración'", () => {
    assert.ok(
      appJs.includes('data-nav-view="settings"'),
      "La barra de herramientas del Plan de Cuentas debe incluir el acceso de retorno a settings"
    );
    assert.ok(
      appJs.includes("Volver a Configuración"),
      "Debe contener la etiqueta 'Volver a Configuración'"
    );
  });
});

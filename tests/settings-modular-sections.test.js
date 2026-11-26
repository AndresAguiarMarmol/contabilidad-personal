const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

describe("Spec 044: Modularización de Configuración (Monedas, Proveedores y Retiro de Supabase)", () => {
  const htmlPath = path.join(__dirname, "..", "index.html");
  const html = fs.readFileSync(htmlPath, "utf8");

  const appJsPath = path.join(__dirname, "..", "assets", "js", "app.js");
  const appJs = fs.readFileSync(appJsPath, "utf8");

  it("U-1: La vista de Configuración NO contiene la opción 'Conexión a Base de Datos Real (Supabase PostgreSQL)'", () => {
    assert.strictEqual(
      html.includes("Conexión a Base de Datos Real (Supabase PostgreSQL)"),
      false,
      "No debe contener el título de conexión a Supabase"
    );
    assert.strictEqual(
      html.includes('id="supabase-url"'),
      false,
      "No debe contener el campo supabase-url"
    );
    assert.strictEqual(
      html.includes('id="supabase-key"'),
      false,
      "No debe contener el campo supabase-key"
    );
  });

  it("E-1: 'Monedas Soportadas y Tasas de Cambio' cuenta con botón que dirige a view-currencies", () => {
    assert.ok(
      html.includes('id="settings-currencies-section"'),
      "Debe existir la tarjeta settings-currencies-section en Configuración"
    );
    assert.ok(
      html.includes('id="btn-settings-open-currencies"'),
      "Debe existir el botón btn-settings-open-currencies"
    );
    assert.ok(
      html.includes('data-nav-view="currencies"'),
      "Debe incluir data-nav-view='currencies'"
    );

    // Debe existir la vista dedicada
    assert.ok(
      html.includes('id="view-currencies"'),
      "Debe existir la vista <section id='view-currencies'>"
    );
    assert.ok(
      html.includes('id="settings-currencies-table-body"'),
      "La tabla de monedas debe estar en la vista de monedas"
    );
  });

  it("E-2: 'Directorio de Proveedores/Beneficiarios' cuenta con botón que dirige a view-suppliers", () => {
    assert.ok(
      html.includes('id="settings-suppliers-section"'),
      "Debe existir la tarjeta settings-suppliers-section en Configuración"
    );
    assert.ok(
      html.includes('id="btn-settings-open-suppliers"'),
      "Debe existir el botón btn-settings-open-suppliers"
    );
    assert.ok(
      html.includes('data-nav-view="suppliers"'),
      "Debe incluir data-nav-view='suppliers'"
    );

    // Debe existir la vista dedicada
    assert.ok(
      html.includes('id="view-suppliers"'),
      "Debe existir la vista <section id='view-suppliers'>"
    );
    assert.ok(
      html.includes('id="settings-suppliers-table-body"'),
      "La tabla de proveedores debe estar en la vista de proveedores"
    );
  });

  it("E-3: Ambas vistas independientes disponen de botón 'Volver a Configuración'", () => {
    // Buscar la sección de monedas
    const currenciesSection = html.match(/<section id="view-currencies"[\s\S]*?<\/section>/i);
    assert.ok(currenciesSection, "La sección view-currencies debe existir");
    assert.ok(
      currenciesSection[0].includes('data-nav-view="settings"'),
      "view-currencies debe tener botón hacia settings"
    );
    assert.ok(
      currenciesSection[0].includes("Volver a Configuración"),
      "view-currencies debe decir 'Volver a Configuración'"
    );

    // Buscar la sección de proveedores
    const suppliersSection = html.match(/<section id="view-suppliers"[\s\S]*?<\/section>/i);
    assert.ok(suppliersSection, "La sección view-suppliers debe existir");
    assert.ok(
      suppliersSection[0].includes('data-nav-view="settings"'),
      "view-suppliers debe tener botón hacia settings"
    );
    assert.ok(
      suppliersSection[0].includes("Volver a Configuración"),
      "view-suppliers debe decir 'Volver a Configuración'"
    );
  });

  it("E-4: app.js gestiona 'currencies' y 'suppliers' manteniendo 'settings' activo en navegación", () => {
    assert.ok(
      appJs.includes('currencies: {') || appJs.includes('"currencies": {'),
      "VIEW_METADATA debe registrar 'currencies'"
    );
    assert.ok(
      appJs.includes('suppliers: {') || appJs.includes('"suppliers": {'),
      "VIEW_METADATA debe registrar 'suppliers'"
    );
    assert.ok(
      appJs.includes('["currencies", "suppliers"].includes(viewName) ? "settings"') ||
      appJs.includes('["currencies", "suppliers", "cloud-db"].includes(viewName) ? "settings"') ||
      appJs.includes('["chart-of-accounts", "currencies", "suppliers"].includes(viewName) ? "settings"'),
      "switchView debe mapear las sub-vistas a 'settings' en la barra lateral"
    );
    assert.ok(
      appJs.includes('case "currencies":') && appJs.includes('renderCurrenciesTable();'),
      "renderActiveView debe renderizar renderCurrenciesTable al conmutar a currencies"
    );
    assert.ok(
      appJs.includes('case "suppliers":') && appJs.includes('renderSuppliersTable();'),
      "renderActiveView debe renderizar renderSuppliersTable al conmutar a suppliers"
    );
  });
});

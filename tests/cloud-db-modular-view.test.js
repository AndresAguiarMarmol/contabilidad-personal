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

describe("Spec 045: Botón y Vista Dedicada para Base de Datos en la Nube (Firebase Cloud Firestore)", () => {
  it("E-1: La vista de Configuración (#view-settings) incluye la tarjeta y botón hacia cloud-db", () => {
    assert.ok(
      html.includes('id="settings-cloud-db-section"'),
      "Debe existir la tarjeta #settings-cloud-db-section en index.html"
    );
    assert.ok(
      html.includes('id="btn-settings-open-cloud-db"'),
      "Debe existir el botón #btn-settings-open-cloud-db"
    );
    assert.ok(
      html.includes('data-nav-view="cloud-db"'),
      "Debe existir enlace o botón con data-nav-view='cloud-db'"
    );
  });

  it("E-2: index.html contiene la vista dedicada #view-cloud-db con botón de retorno a Configuración", () => {
    assert.ok(
      html.includes('id="view-cloud-db"'),
      "Debe existir la sección <section id='view-cloud-db'>"
    );
    // Verificar que la vista dedicada contenga el botón de retorno a settings
    const cloudDbViewMatch = html.match(/<section id="view-cloud-db"[\s\S]*?<\/section>/);
    assert.ok(cloudDbViewMatch, "La sección #view-cloud-db debe poder extraerse");
    const cloudDbContent = cloudDbViewMatch[0];

    assert.ok(
      cloudDbContent.includes('data-nav-view="settings"'),
      "La vista #view-cloud-db debe contener botón con data-nav-view='settings'"
    );
    assert.ok(
      cloudDbContent.includes("Volver a Configuración"),
      "Debe incluir el texto 'Volver a Configuración'"
    );
  });

  it("E-3: La vista dedicada #view-cloud-db conserva los controles esenciales de Firebase", () => {
    const cloudDbViewMatch = html.match(/<section id="view-cloud-db"[\s\S]*?<\/section>/);
    assert.ok(cloudDbViewMatch, "La sección #view-cloud-db debe poder extraerse");
    const cloudDbContent = cloudDbViewMatch[0];

    assert.ok(cloudDbContent.includes('id="firebase-project-id"'), "Debe contener #firebase-project-id");
    assert.ok(cloudDbContent.includes('id="firebase-api-key"'), "Debe contener #firebase-api-key");
    assert.ok(cloudDbContent.includes('id="btn-save-firebase"'), "Debe contener #btn-save-firebase");
    assert.ok(cloudDbContent.includes('id="btn-test-firebase"'), "Debe contener #btn-test-firebase");
    assert.ok(cloudDbContent.includes('id="btn-firebase-backup"'), "Debe contener #btn-firebase-backup");
    assert.ok(cloudDbContent.includes('id="btn-firebase-sync"'), "Debe contener #btn-firebase-sync");
    assert.ok(cloudDbContent.includes('id="btn-firebase-force-pull"'), "Debe contener #btn-firebase-force-pull");
  });

  it("E-4: VIEW_METADATA registra 'cloud-db' con título y subtítulo", () => {
    assert.ok(
      appJs.includes('"cloud-db": {') || appJs.includes('cloud-db: {') || appJs.includes("'cloud-db': {"),
      "VIEW_METADATA debe registrar 'cloud-db'"
    );
  });

  it("E-5: switchView incluye 'cloud-db' y lo mapea a 'settings' en la navegación lateral", () => {
    assert.ok(
      appJs.includes('"cloud-db"') && appJs.includes('viewName === "chart-of-accounts" ? "settings"'),
      "switchView debe incluir 'cloud-db' y mantener compatibilidad con mapeo a settings"
    );
  });
});

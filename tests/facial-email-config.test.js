// tests/facial-email-config.test.js — Pruebas unitarias para Spec 040: Reconocimiento Facial, Verificación Email y Configuración
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Mock de localStorage para Node.js
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.window = globalThis.window || {};
if (!globalThis.window.localStorage) {
  globalThis.window.localStorage = new MockLocalStorage();
}

const Calculations = require("../assets/js/financeCalculations.js");
const Storage = require("../assets/js/storage.js");
const DbAdapter = require("../assets/js/dbAdapter.js");

const indexPath = path.join(__dirname, "..", "index.html");
const indexContent = fs.readFileSync(indexPath, "utf-8");

const appPath = path.join(__dirname, "..", "assets", "js", "app.js");
const appContent = fs.readFileSync(appPath, "utf-8");

test("Spec 040 - RF-1: Storage gestiona credenciales de Reconocimiento Facial / Biometría", () => {
  assert.equal(typeof Storage.getBiometricCredential, "function", "Storage.getBiometricCredential debe ser función");
  assert.equal(typeof Storage.saveBiometricCredential, "function", "Storage.saveBiometricCredential debe ser función");
  assert.equal(typeof Storage.clearBiometricCredential, "function", "Storage.clearBiometricCredential debe ser función");

  const cred = {
    enabled: true,
    userEmail: "andres@ejemplo.com",
    userUid: "usr-12345",
    registeredAt: "2026-11-25T12:00:00Z"
  };

  Storage.saveBiometricCredential(cred);
  const guardado = Storage.getBiometricCredential();
  assert.ok(guardado, "Debe retornar la credencial guardada");
  assert.equal(guardado.userEmail, "andres@ejemplo.com");
  assert.equal(guardado.enabled, true);

  Storage.clearBiometricCredential();
  assert.equal(Storage.getBiometricCredential(), null);
});

test("Spec 040 - RF-1: index.html y app.js disponen de interfaz y lógica para Reconocimiento Facial / Face ID", () => {
  assert.match(
    indexContent,
    /id="btn-gate-biometric-login"/i,
    "index.html debe contener el botón #btn-gate-biometric-login en la pantalla de acceso"
  );
  assert.match(
    indexContent,
    /Reconocimiento Facial|Face ID/i,
    "index.html debe hacer referencia al Reconocimiento Facial / Face ID"
  );
  assert.match(
    appContent,
    /btn-gate-biometric-login|autenticarReconocimientoFacial|iniciarSesionBiometrica/i,
    "app.js debe contener la lógica de autenticación por Reconocimiento Facial"
  );
});

test("Spec 040 - RF-2: Calculations construye payload de verificación de correo y valida acceso con emailVerified", () => {
  assert.equal(typeof Calculations.construirPayloadEmailVerification, "function", "construirPayloadEmailVerification debe ser función");

  const payload = Calculations.construirPayloadEmailVerification("token-xyz-123");
  assert.equal(payload.requestType, "VERIFY_EMAIL");
  assert.equal(payload.idToken, "token-xyz-123");

  const sessionNoVerificada = {
    uid: "uid-abc",
    email: "nuevo@ejemplo.com",
    idToken: "token-1",
    emailVerified: false
  };

  const sessionVerificada = {
    uid: "uid-abc",
    email: "nuevo@ejemplo.com",
    idToken: "token-1",
    emailVerified: true
  };

  // Cuando se exige verificación de correo
  const accesoNoVerificado = Calculations.puedeAccederApp(sessionNoVerificada, Date.now(), { requireEmailVerification: true });
  assert.equal(accesoNoVerificado, false, "Usuario con emailVerified: false no debe poder acceder si se exige verificación");

  const accesoVerificado = Calculations.puedeAccederApp(sessionVerificada, Date.now(), { requireEmailVerification: true });
  assert.equal(accesoVerificado, true, "Usuario con emailVerified: true debe poder acceder");
});

test("Spec 040 - RF-2: DbAdapter implementa métodos de envío y consulta de verificación de correo", () => {
  assert.equal(typeof DbAdapter.sendEmailVerification, "function", "DbAdapter.sendEmailVerification debe existir");
  assert.equal(typeof DbAdapter.lookupUserData, "function", "DbAdapter.lookupUserData debe existir");

  assert.match(
    indexContent,
    /id="gate-email-verification-panel"|gate-email-verification/i,
    "index.html debe contener el panel de confirmación de correo en la pantalla de acceso"
  );
});

test("Spec 040 - RF-3: El título 'Base de Datos & Ajustes' se renombra a 'Configuración' en navegación y metadatos", () => {
  // En index.html no debe haber <span>Base de Datos & Ajustes</span>
  assert.doesNotMatch(
    indexContent,
    /<span>\s*Base de Datos & Ajustes\s*<\/span>/i,
    "index.html no debe contener 'Base de Datos & Ajustes'"
  );
  assert.match(
    indexContent,
    /data-nav-view="settings"[\s\S]*?<span>\s*Configuración\s*<\/span>/i,
    "El botón de navegación para settings debe llamarse 'Configuración'"
  );

  // En app.js VIEW_METADATA.settings.title debe ser 'Configuración'
  assert.match(
    appContent,
    /settings:\s*\{\s*title:\s*["']Configuración["']/i,
    "VIEW_METADATA.settings.title en app.js debe ser 'Configuración'"
  );
});

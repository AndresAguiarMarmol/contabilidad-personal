// tests/suppliers-catalog.test.js — Pruebas unitarias para Spec 039: Archivo de Proveedores y Autocompletado
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Mock simple de localStorage para Node.js
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

const indexPath = path.join(__dirname, "..", "index.html");
const indexContent = fs.readFileSync(indexPath, "utf-8");

const appPath = path.join(__dirname, "..", "assets", "js", "app.js");
const appContent = fs.readFileSync(appPath, "utf-8");

test("Spec 039 - RF-1: Calculations.crearProveedorObjeto genera un objeto Supplier válido con timestamps", () => {
  assert.equal(typeof Calculations.crearProveedorObjeto, "function", "crearProveedorObjeto debe ser una función");

  const sup = Calculations.crearProveedorObjeto({
    name: "  Supermercado Líder  ",
    category: "Alimentación & Supermercado",
    categoryCode: "5.1.01",
    paymentMethod: "credit"
  });

  assert.ok(sup.id.startsWith("SUP-"), "El ID del proveedor debe comenzar con SUP-");
  assert.equal(sup.name, "Supermercado Líder", "El nombre debe normalizarse sin espacios extra");
  assert.equal(sup.category, "Alimentación & Supermercado");
  assert.equal(sup.categoryCode, "5.1.01");
  assert.equal(sup.paymentMethod, "credit");
  assert.ok(sup.createdAt, "Debe tener createdAt");
  assert.ok(sup.updatedAt, "Debe tener updatedAt");
});

test("Spec 039 - RF-1: Calculations.extraerProveedoresDesdeTransacciones recopila proveedores únicos con su categoría habitual", () => {
  assert.equal(typeof Calculations.extraerProveedoresDesdeTransacciones, "function", "extraerProveedoresDesdeTransacciones debe ser una función");

  const txs = [
    { id: "tx-1", supplier: "Enel", category: "Vivienda & Servicios", categoryCode: "5.1.02", paymentMethod: "transfer" },
    { id: "tx-2", supplier: "Enel", category: "Vivienda & Servicios", categoryCode: "5.1.02", paymentMethod: "transfer" },
    { id: "tx-3", supplier: "Copec", category: "Transporte & Combustible", categoryCode: "5.1.03", paymentMethod: "debit" },
    { id: "tx-4", description: "Gasto sin proveedor", category: "Otros Gastos" }
  ];

  const existentes = [
    { id: "SUP-001", name: "Supermercado Líder", category: "Alimentación & Supermercado" }
  ];

  const resultado = Calculations.extraerProveedoresDesdeTransacciones(txs, existentes);

  assert.equal(resultado.length, 3, "Debe contener el existente y los 2 nuevos proveedores únicos");
  const nombres = resultado.map(p => p.name);
  assert.ok(nombres.includes("Supermercado Líder"));
  assert.ok(nombres.includes("Enel"));
  assert.ok(nombres.includes("Copec"));

  const enel = resultado.find(p => p.name === "Enel");
  assert.equal(enel.category, "Vivienda & Servicios");
  assert.equal(enel.paymentMethod, "transfer");
});

test("Spec 039 - RF-2: Storage gestiona el almacenamiento de proveedores (getSuppliers / saveSuppliers)", () => {
  assert.equal(typeof Storage.getSuppliers, "function", "Storage.getSuppliers debe ser una función");
  assert.equal(typeof Storage.saveSuppliers, "function", "Storage.saveSuppliers debe ser una función");

  const lista = [
    { id: "SUP-1", name: "Aguas Andinas", category: "Vivienda & Servicios" }
  ];

  Storage.saveSuppliers(lista);
  const leido = Storage.getSuppliers();

  assert.equal(leido.length, 1);
  assert.equal(leido[0].name, "Aguas Andinas");
});

test("Spec 039 - RF-3: fusionarEstadoContable combina proveedores sin duplicados y respeta lápidas deletedSuppliers", () => {
  const local = {
    suppliers: [
      { id: "SUP-A", name: "Farmacias Ahumada", category: "Salud & Bienestar", updatedAt: "2026-11-24T10:00:00Z" },
      { id: "SUP-DEL", name: "Proveedor Eliminado", updatedAt: "2026-11-24T10:00:00Z" }
    ],
    deletedSuppliers: ["SUP-DEL"]
  };

  const remote = {
    suppliers: [
      { id: "SUP-A", name: "Farmacias Ahumada (Actualizado)", category: "Salud & Bienestar", updatedAt: "2026-11-24T12:00:00Z" },
      { id: "SUP-B", name: "Jumbo", category: "Alimentación", updatedAt: "2026-11-24T11:00:00Z" },
      { id: "SUP-DEL", name: "Proveedor Eliminado", updatedAt: "2026-11-24T09:00:00Z" }
    ],
    deletedSuppliers: []
  };

  const fusion = Calculations.fusionarEstadoContable(local, remote);
  const suppliers = fusion.mergedState.suppliers;

  assert.equal(suppliers.length, 2, "Debe contener SUP-A y SUP-B excluyendo el eliminado SUP-DEL");
  const supA = suppliers.find(s => s.id === "SUP-A");
  assert.equal(supA.name, "Farmacias Ahumada (Actualizado)", "Debe adoptar la versión más reciente LWW");
  assert.ok(suppliers.some(s => s.id === "SUP-B"), "Debe incorporar el proveedor remoto SUP-B");
  assert.ok(!suppliers.some(s => s.id === "SUP-DEL"), "El proveedor con lápida no debe resucitar");
  assert.ok(fusion.mergedState.deletedSuppliers.includes("SUP-DEL"));
});

test("Spec 039 - RF-4: app.js conecta el formulario de movimientos con un datalist de proveedores para autocompletar", () => {
  assert.match(
    appContent,
    /id="suppliers-datalist"/i,
    "app.js debe generar o incluir el datalist con id='suppliers-datalist' para autocompletar el proveedor"
  );
  assert.match(
    appContent,
    /list="suppliers-datalist"/i,
    "El input #tx-input-supplier debe estar vinculado con list='suppliers-datalist'"
  );
});

test("Spec 039 - RF-5: index.html o app.js contiene la sección de gestión de Archivo de Proveedores en Configuración", () => {
  assert.match(
    appContent,
    /suppliers-table|renderSuppliers|Directorio de Proveedores/i,
    "app.js debe incluir la vista o tabla de administración de proveedores"
  );
});

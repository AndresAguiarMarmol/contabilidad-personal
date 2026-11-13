const test = require("node:test");
const assert = require("node:assert/strict");
const Calculations = require("../assets/js/financeCalculations.js");

test("RF-1 y RF-2: obtenerCategoriasDesdePlan retorna cuentas de Clase 5 para gastos", () => {
  assert.equal(typeof Calculations.obtenerCategoriasDesdePlan, "function");

  const catalogo = Calculations.obtenerCatalogoPlanCuentas([], [], []);
  const categoriasGasto = Calculations.obtenerCategoriasDesdePlan(catalogo, "expense");

  assert.ok(Array.isArray(categoriasGasto));
  assert.ok(categoriasGasto.length >= 8, `Debe retornar al menos 8 cuentas de gasto, tiene ${categoriasGasto.length}`);

  // Todas deben pertenecer a la Clase 5
  assert.ok(categoriasGasto.every(c => c.classNumber === 5), "Todas deben ser Clase 5");

  // Deben tener código y nombre
  const codigos = categoriasGasto.map(c => c.code);
  assert.ok(codigos.includes("5.2.01"), "Debe incluir Supermercado (5.2.01)");
  assert.ok(codigos.includes("5.1.01"), "Debe incluir Vivienda (5.1.01)");

  // Debe incluir etiqueta compuesta 'Código · Nombre'
  const superItem = categoriasGasto.find(c => c.code === "5.2.01");
  assert.ok(superItem.label.includes("5.2.01"));
  assert.ok(superItem.label.includes("Supermercado"));
});

test("RF-2: obtenerCategoriasDesdePlan retorna cuentas de Clase 4 para ingresos", () => {
  const catalogo = Calculations.obtenerCatalogoPlanCuentas([], [], []);
  const categoriasIngreso = Calculations.obtenerCategoriasDesdePlan(catalogo, "income");

  assert.ok(Array.isArray(categoriasIngreso));
  assert.ok(categoriasIngreso.length >= 4, `Debe retornar al menos 4 cuentas de ingreso, tiene ${categoriasIngreso.length}`);
  assert.ok(categoriasIngreso.every(c => c.classNumber === 4), "Todas deben ser Clase 4");

  const codigos = categoriasIngreso.map(c => c.code);
  assert.ok(codigos.includes("4.1.01"), "Debe incluir Sueldo (4.1.01)");
  assert.ok(codigos.includes("4.1.02"), "Debe incluir Honorarios (4.1.02)");
});

test("RF-3: obtenerCategoriasDesdePlan para split incluye Gastos y Activos Fijos (1.3)", () => {
  const catalogo = Calculations.obtenerCatalogoPlanCuentas([], [], []);
  const opcionesSplit = Calculations.obtenerCategoriasDesdePlan(catalogo, "split");

  assert.ok(Array.isArray(opcionesSplit));
  // Debe incluir cuentas de gasto (Clase 5)
  assert.ok(opcionesSplit.some(c => c.classNumber === 5 && c.code === "5.2.01"));

  // Debe incluir cuentas de bienes personales y activos fijos (Clase 1.3)
  assert.ok(opcionesSplit.some(c => c.code === "1.3.03"), "Debe incluir Tecnología y Computación (1.3.03)");
  assert.ok(opcionesSplit.some(c => c.code === "1.3.04"), "Debe incluir Mobiliario y Hogar (1.3.04)");
});

test("RF-4: resolverCategoriaPlan resuelve por código o por nombre", () => {
  assert.equal(typeof Calculations.resolverCategoriaPlan, "function");

  const catalogo = Calculations.obtenerCatalogoPlanCuentas([], [], []);

  // Búsqueda por código
  const resCode = Calculations.resolverCategoriaPlan("5.2.01", catalogo);
  assert.ok(resCode);
  assert.equal(resCode.code, "5.2.01");
  assert.ok(resCode.name.includes("Supermercado"));

  // Búsqueda por nombre
  const resNombre = Calculations.resolverCategoriaPlan("Sueldo y Salario", catalogo);
  assert.ok(resNombre);
  assert.equal(resNombre.code, "4.1.01");

  // Búsqueda flexible con '&' vs 'y'
  const resFlex = Calculations.resolverCategoriaPlan("Sueldo & Salario", catalogo);
  assert.ok(resFlex);
  assert.equal(resFlex.code, "4.1.01");
});

test("RF-1 y RF-5: obtenerCategoriasDesdePlan incluye cuentas personalizadas creadas en el Plan", () => {
  const customAccounts = [
    {
      id: "CUSTOM-EXP-1",
      code: "5.6.05",
      name: "Hobbies & Coleccionables",
      classNumber: 5,
      classType: "expense",
      groupName: "5.6 Ocio y Estilo de Vida",
      nature: "debit"
    }
  ];

  const catalogo = Calculations.obtenerCatalogoPlanCuentas(customAccounts, [], []);
  const categoriasGasto = Calculations.obtenerCategoriasDesdePlan(catalogo, "expense");

  const customFound = categoriasGasto.find(c => c.code === "5.6.05");
  assert.ok(customFound, "Debe incluir la cuenta personalizada creada en el Plan");
  assert.equal(customFound.name, "Hobbies & Coleccionables");
});

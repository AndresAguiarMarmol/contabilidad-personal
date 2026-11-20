const test = require("node:test");
const assert = require("node:assert");
const {
  obtenerCatalogoPlanCuentas,
  obtenerCategoriasDesdePlan,
  fusionarEstadoContable,
  CATALOGO_PLAN_CUENTAS_PERSONAL_BASE
} = require("../assets/js/financeCalculations.js");

test("Spec 019 - RF-1: obtenerCatalogoPlanCuentas sobrescribe nombre y grupo de una cuenta base originaria cuando fue modificada", () => {
  // Cuenta originaria base: P-5-1-01 / 5.1.01 "Vivienda & Servicios (Alquiler, Luz, Agua, Gas)"
  const cuentasPersonalizadas = [
    {
      id: "P-5-1-01",
      code: "5.1.01",
      name: "Arriendo Casa Central y Gastos Comunes",
      classNumber: 5,
      classType: "expense",
      groupName: "5.1 Hogar y Arriendos",
      nature: "debit"
    }
  ];

  const catalogo = obtenerCatalogoPlanCuentas(cuentasPersonalizadas, [], []);
  const cuentaModificada = catalogo.find(c => c.id === "P-5-1-01" || c.code === "5.1.01");

  assert.ok(cuentaModificada, "La cuenta 5.1.01 debe estar presente en el catálogo");
  assert.strictEqual(
    cuentaModificada.name,
    "Arriendo Casa Central y Gastos Comunes",
    "El nombre de la cuenta base debe reflejar la modificación del usuario y no regenerarse al original"
  );
  assert.strictEqual(
    cuentaModificada.groupName,
    "5.1 Hogar y Arriendos",
    "El grupo contable debe reflejar la modificación del usuario"
  );
});

test("Spec 019 - RF-2: obtenerCatalogoPlanCuentas permite cambiar el código de una cuenta base sin duplicar la cuenta originaria", () => {
  // El usuario modifica el código de P-5-1-01 de 5.1.01 a 5.1.01.A
  const cuentasPersonalizadas = [
    {
      id: "P-5-1-01",
      baseCode: "5.1.01",
      code: "5.1.01.A",
      name: "Vivienda Primaria",
      classNumber: 5,
      classType: "expense",
      groupName: "5.1 Vivienda y Hogar",
      nature: "debit"
    }
  ];

  const catalogo = obtenerCatalogoPlanCuentas(cuentasPersonalizadas, [], []);

  // No debe existir una cuenta con el código viejo 5.1.01
  const cuentaVieja = catalogo.find(c => c.code === "5.1.01");
  assert.strictEqual(cuentaVieja, undefined, "La cuenta con el código viejo no debe existir como duplicada");

  // Debe existir la cuenta con el código nuevo y el ID base
  const cuentaNueva = catalogo.find(c => c.id === "P-5-1-01");
  assert.ok(cuentaNueva, "Debe existir la cuenta con el ID original P-5-1-01");
  assert.strictEqual(cuentaNueva.code, "5.1.01.A", "El código debe ser el actualizado por el usuario");
  assert.strictEqual(cuentaNueva.name, "Vivienda Primaria");
});

test("Spec 019 - RF-3: obtenerCategoriasDesdePlan refleja de inmediato el nombre modificado de una cuenta originaria", () => {
  const cuentasPersonalizadas = [
    {
      id: "P-5-2-01",
      code: "5.2.01",
      name: "Supermercado Mayorista y Almacén",
      classNumber: 5,
      classType: "expense",
      groupName: "5.2 Alimentación",
      nature: "debit"
    }
  ];

  const catalogo = obtenerCatalogoPlanCuentas(cuentasPersonalizadas, [], []);
  const categoriasGasto = obtenerCategoriasDesdePlan(catalogo, "expense");

  const catAlimentacion = categoriasGasto.find(c => c.code === "5.2.01");
  assert.ok(catAlimentacion, "Debe encontrar la categoría 5.2.01");
  assert.strictEqual(
    catAlimentacion.name,
    "Supermercado Mayorista y Almacén",
    "El nombre de la categoría para movimientos debe ser el editado por el usuario"
  );
});

test("Spec 019 - RF-4: obtenerCatalogoPlanCuentas respeta el codigoContable asignado a cuentas financieras", () => {
  const cuentasFinancieras = [
    {
      id: "ACC-001",
      name: "Banco Santander Modificado",
      type: "bank",
      currentBalance: 500000,
      codigoContable: "1.1.02.99"
    }
  ];

  const catalogo = obtenerCatalogoPlanCuentas([], cuentasFinancieras, []);
  const cuentaSantander = catalogo.find(c => c.financialAccountId === "ACC-001");

  assert.ok(cuentaSantander, "Debe existir la cuenta financiera vinculada en el catálogo");
  assert.strictEqual(cuentaSantander.code, "1.1.02.99", "Debe respetar el código contable personalizado asignado");
  assert.strictEqual(cuentaSantander.name, "Banco Santander Modificado");
});

test("Spec 019 - RF-5: fusionarEstadoContable conserva las modificaciones de cuentas base entre dispositivos", () => {
  const local = {
    planAccounts: [
      {
        id: "P-4-1-01",
        code: "4.1.01",
        name: "Sueldo Principal Empresa XYZ",
        classNumber: 4,
        classType: "income"
      }
    ]
  };

  const remote = {
    planAccounts: []
  };

  const result = fusionarEstadoContable(local, remote);
  const planMerged = result.mergedState.planAccounts;
  const sueldo = planMerged.find(p => p.id === "P-4-1-01" || p.code === "4.1.01");

  assert.ok(sueldo, "Debe existir la cuenta modificada en el estado fusionado");
  assert.strictEqual(sueldo.name, "Sueldo Principal Empresa XYZ");
});

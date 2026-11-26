import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar módulo de cálculos financieros
const financeCalculationsPath = path.join(__dirname, "../assets/js/financeCalculations.js");
const financeCalculationsCode = fs.readFileSync(financeCalculationsPath, "utf-8");

const moduleFactory = new Function(
  "module",
  "exports",
  `${financeCalculationsCode}; return module.exports;`
);
const Calculations = moduleFactory({ exports: {} }, {});

describe("Spec 046: Dinamismo Estricto de Cuentas Nominales en Plan de Cuentas y Purgado de Saldos Residuales", () => {
  it("RF-1: obtenerCatalogoPlanCuentas neutraliza periodMovement a 0 en cuentas de Clase 4 y 5 aunque la cuenta personalizada tenga un valor residual", () => {
    const cuentasPersonalizadas = [
      {
        id: "P-5-3-01",
        code: "5.3.01",
        name: "Transporte & Combustible",
        classNumber: 5,
        classType: "expense",
        groupName: "5.3 Transporte y Movilidad",
        nature: "debit",
        balance: 0,
        periodMovement: 35000 // Valor residual congelado
      },
      {
        id: "P-5-1-01",
        code: "5.1.01",
        name: "Luz",
        classNumber: 5,
        classType: "expense",
        groupName: "5.1 Vivienda y Hogar",
        nature: "debit",
        balance: 0,
        periodMovement: 408000 // Valor residual congelado
      }
    ];

    const transaccionesVacias = [];
    const cuentasFinancierasVacias = [];

    const catalogo = Calculations.obtenerCatalogoPlanCuentas(
      cuentasPersonalizadas,
      cuentasFinancierasVacias,
      transaccionesVacias
    );

    const c5301 = catalogo.find(c => c.code === "5.3.01");
    assert.ok(c5301, "La cuenta 5.3.01 debe existir en el catálogo");
    assert.equal(
      c5301.periodMovement,
      0,
      "La cuenta 5.3.01 debe tener periodMovement = 0 cuando no hay transacciones, ignorando el valor residual de 35000"
    );

    const c5101 = catalogo.find(c => c.code === "5.1.01");
    assert.ok(c5101, "La cuenta 5.1.01 debe existir en el catálogo");
    assert.equal(
      c5101.periodMovement,
      0,
      "La cuenta 5.1.01 debe tener periodMovement = 0 cuando no hay transacciones, ignorando el valor residual de 408000"
    );
  });

  it("RF-2: Cuentas nominales acumulan exclusivamente transacciones vivas", () => {
    const cuentasPersonalizadas = [
      {
        id: "P-5-3-01",
        code: "5.3.01",
        name: "Transporte & Combustible",
        classNumber: 5,
        classType: "expense",
        groupName: "5.3 Transporte y Movilidad",
        nature: "debit",
        periodMovement: 35000
      },
      {
        id: "PLAN-1",
        code: "5.3.01.02",
        name: "BIP Yaneth",
        parentCode: "5.3.01",
        isSubaccount: true,
        classNumber: 5,
        classType: "expense",
        groupName: "5.3 Transporte y Movilidad",
        nature: "debit",
        periodMovement: 0
      }
    ];

    const transacciones = [
      {
        id: "TX-1",
        type: "expense",
        amount: 5000,
        category: "BIP Yaneth",
        categoryCode: "5.3.01.02"
      }
    ];

    const catalogo = Calculations.obtenerCatalogoPlanCuentas(
      cuentasPersonalizadas,
      [],
      transacciones
    );

    const subcuenta = catalogo.find(c => c.code === "5.3.01.02");
    assert.ok(subcuenta, "La subcuenta 5.3.01.02 debe existir");
    assert.equal(subcuenta.periodMovement, 5000, "La subcuenta debe reflejar exactamente los 5000 de la transacción");

    const cuentaPadre = catalogo.find(c => c.code === "5.3.01");
    assert.equal(
      cuentaPadre.periodMovement,
      0,
      "La cuenta padre 5.3.01 no debe sumar los 35000 residuales ni duplicar si la transacción fue a la subcuenta"
    );
  });

  it("RF-3: Coincidencia de transacciones prioriza categoryCode antes de coincidencia difusa de texto", () => {
    const cuentasPersonalizadas = [
      {
        id: "PLAN-1",
        code: "5.3.01.03",
        name: "BIP Andres",
        classNumber: 5,
        classType: "expense",
        groupName: "5.3 Transporte y Movilidad",
        nature: "debit"
      }
    ];

    const transacciones = [
      {
        id: "TX-2",
        type: "expense",
        amount: 10930,
        category: "BIP Andres",
        categoryCode: "5.3.01.03"
      }
    ];

    const catalogo = Calculations.obtenerCatalogoPlanCuentas(
      cuentasPersonalizadas,
      [],
      transacciones
    );

    const cuenta = catalogo.find(c => c.code === "5.3.01.03");
    assert.ok(cuenta, "La cuenta 5.3.01.03 debe existir");
    assert.equal(cuenta.periodMovement, 10930, "Debe acumular exactamente el monto usando categoryCode");
  });

  it("RF-4: Calculations.sanearCuentasPlanNominales limpia residuales en Clase 4 y 5 preservando saldos de Clase 1, 2 y 3", () => {
    assert.ok(
      typeof Calculations.sanearCuentasPlanNominales === "function",
      "Calculations.sanearCuentasPlanNominales debe estar definida"
    );

    const cuentas = [
      { id: "A1", code: "1.3.01", classNumber: 1, balance: 1500000, periodMovement: 0 },
      { id: "A2", code: "2.1.01", classNumber: 2, balance: 200000, periodMovement: 0 },
      { id: "A3", code: "3.1.01", classNumber: 3, balance: 1300000, periodMovement: 0 },
      { id: "P-5-3-01", code: "5.3.01", classNumber: 5, balance: 0, periodMovement: 35000 },
      { id: "P-5-1-01", code: "5.1.01", classNumber: 5, balance: 100, periodMovement: 408000 },
      { id: "P-4-1-01", code: "4.1.01", classNumber: 4, balance: 50, periodMovement: 500000 }
    ];

    const saneadas = Calculations.sanearCuentasPlanNominales(cuentas);

    // Clases 1, 2 y 3 no deben modificarse
    assert.equal(saneadas[0].balance, 1500000);
    assert.equal(saneadas[1].balance, 200000);
    assert.equal(saneadas[2].balance, 1300000);

    // Clases 4 y 5 deben tener balance 0 y periodMovement 0
    assert.equal(saneadas[3].periodMovement, 0, "5.3.01 periodMovement debe ser 0");
    assert.equal(saneadas[3].balance, 0, "5.3.01 balance debe ser 0");
    assert.equal(saneadas[4].periodMovement, 0, "5.1.01 periodMovement debe ser 0");
    assert.equal(saneadas[4].balance, 0, "5.1.01 balance debe ser 0");
    assert.equal(saneadas[5].periodMovement, 0, "4.1.01 periodMovement debe ser 0");
    assert.equal(saneadas[5].balance, 0, "4.1.01 balance debe ser 0");
  });

  it("RF-5: app.js no persiste periodMovement estático para cuentas de Clase 4 y 5 en openPlanAccountModal", () => {
    const appJsPath = path.join(__dirname, "../assets/js/app.js");
    const appJs = fs.readFileSync(appJsPath, "utf-8");

    // Verificar que en openPlanAccountModal se maneje el reseteo de periodMovement para cuentas nominales
    assert.ok(
      appJs.includes("[4, 5].includes(classNum)") || appJs.includes("classNum >= 4"),
      "openPlanAccountModal debe tratar de forma diferenciada a las cuentas nominales (Clase 4 y 5)"
    );
  });
});

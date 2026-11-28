import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import CalculationsModule from "../assets/js/financeCalculations.js";
const Calculations = CalculationsModule.default || CalculationsModule;

describe("Spec 050: Blindaje de Asignación Contable contra Stop-Words y Coherencia de Clase", () => {
  const customPlanAccounts = [
    {
      id: "P-5-1-01",
      code: "5.1.01",
      name: "Luz",
      classNumber: 5,
      classType: "expense",
      groupName: "5.1 Vivienda y Hogar",
      nature: "debit",
      balance: 0,
      periodMovement: 0,
      isSystem: false
    },
    {
      id: "PLAN-5-1-01-04",
      code: "5.1.01.04",
      name: "Reparaciones Casa",
      parentCode: "5.1.01",
      isSubaccount: true,
      classNumber: 5,
      classType: "expense",
      groupName: "5.1 Vivienda y Hogar",
      nature: "debit",
      balance: 0,
      periodMovement: 0
    },
    {
      id: "PLAN-5-6-02-03",
      code: "5.6.02.03",
      name: "Productos para la Piel, Cremas, Perfumes y otros",
      parentCode: "5.6.02",
      isSubaccount: true,
      classNumber: 5,
      classType: "expense",
      groupName: "5.6 Ocio y Estilo de Vida",
      nature: "debit",
      balance: 0,
      periodMovement: 0
    },
    {
      id: "PLAN-5-2-01-01",
      code: "5.2.01.01",
      name: "Supermercado",
      parentCode: "5.2.01",
      isSubaccount: true,
      classNumber: 5,
      classType: "expense",
      groupName: "5.2 Alimentación y Consumo",
      nature: "debit",
      balance: 0,
      periodMovement: 0
    }
  ];

  it("RF-1: La coincidencia de categoría no debe activar subcuentas por stop-words genéricas como 'otros'", () => {
    // Transacción de gasto con categoría que contiene 'otros'
    const transactions = [
      {
        id: "TX-TEST-1",
        type: "expense",
        amount: 10930,
        description: "Muni Mercado",
        category: "Otros Ingresos / Reembolsos y Devoluciones",
        categoryCode: "4.3.01"
      }
    ];

    const catalog = Calculations.obtenerCatalogoPlanCuentas(customPlanAccounts, [], transactions);
    const subAccSkin = catalog.find(c => c.code === "5.6.02.03");
    assert.ok(subAccSkin, "Debe existir la cuenta 5.6.02.03");
    assert.equal(
      subAccSkin.periodMovement,
      0,
      "5.6.02.03 no debe recibir movimientos por coincidencia casual de la palabra 'otros'"
    );
  });

  it("RF-2: Un gasto con categoryCode de Clase 4 no debe asignarse a subcuentas específicas por búsqueda difusa", () => {
    const transactions = [
      {
        id: "TX-TEST-2",
        type: "expense",
        amount: 15000,
        description: "Reembolso con error",
        category: "Otros Ingresos",
        categoryCode: "4.3.01"
      }
    ];

    const catalog = Calculations.obtenerCatalogoPlanCuentas(customPlanAccounts, [], transactions);
    const subAccSkin = catalog.find(c => c.code === "5.6.02.03");
    assert.equal(subAccSkin.periodMovement, 0, "No debe asignar a 5.6.02.03");

    // Debe asignarse a gastos varios/imprevistos (5.7.01)
    const genericExpense = catalog.find(c => c.code === "5.7.01");
    assert.ok(genericExpense, "Debe existir 5.7.01");
    assert.equal(genericExpense.periodMovement, 15000, "Debe acumularse en gastos varios 5.7.01");
  });

  it("RF-3: Tras reclasificación correcta, 5.1.01 (Luz) y 5.6.02.03 tienen saldo $0", () => {
    const transactions = [
      {
        id: "TX-1795644643983",
        type: "expense",
        amount: 10930,
        description: "Muni Mercado",
        supplier: "Tottus S.A.",
        category: "Supermercado",
        categoryCode: "5.2.01.01"
      },
      {
        id: "TX-1795824079087",
        type: "expense",
        amount: 5997,
        description: "Adornos Navideños",
        category: "Reparaciones Casa",
        categoryCode: "5.1.01.04"
      }
    ];

    const catalog = Calculations.obtenerCatalogoPlanCuentas(customPlanAccounts, [], transactions);

    const luzAcc = catalog.find(c => c.code === "5.1.01");
    assert.ok(luzAcc);
    assert.equal(luzAcc.periodMovement, 5997, "5.1.01 totaliza a su subcuenta hija 5.1.01.04 (5997) según Spec 052");

    const skinAcc = catalog.find(c => c.code === "5.6.02.03");
    assert.ok(skinAcc);
    assert.equal(skinAcc.periodMovement, 0, "5.6.02.03 debe tener periodMovement = 0");

    const superAcc = catalog.find(c => c.code === "5.2.01.01");
    assert.ok(superAcc);
    assert.equal(superAcc.periodMovement, 10930, "5.2.01.01 (Supermercado) debe acumular 10930");

    const repAcc = catalog.find(c => c.code === "5.1.01.04");
    assert.ok(repAcc);
    assert.equal(repAcc.periodMovement, 5997, "5.1.01.04 (Reparaciones Casa) debe acumular 5997");
  });
});

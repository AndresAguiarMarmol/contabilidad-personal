// tests/sync-transactions-suppliers-dedup.test.js — Pruebas unitarias para Spec 041
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Calculations = require("../assets/js/financeCalculations.js");

const appPath = path.join(__dirname, "..", "assets", "js", "app.js");
const appContent = fs.readFileSync(appPath, "utf-8");

const dbAdapterPath = path.join(__dirname, "..", "assets", "js", "dbAdapter.js");
const dbAdapterContent = fs.readFileSync(dbAdapterPath, "utf-8");

test("Spec 041 - RF-1: Calculations.canonicalizarNombreProveedor normaliza diacríticos, sufijos legales y espacios", () => {
  assert.equal(typeof Calculations.canonicalizarNombreProveedor, "function", "canonicalizarNombreProveedor debe ser una función");

  assert.equal(Calculations.canonicalizarNombreProveedor("Líder"), "lider");
  assert.equal(Calculations.canonicalizarNombreProveedor("LÍDER"), "lider");
  assert.equal(Calculations.canonicalizarNombreProveedor("  Lider   "), "lider");
  assert.equal(Calculations.canonicalizarNombreProveedor("Supermercados Líder S.A."), "supermercados lider");
  assert.equal(Calculations.canonicalizarNombreProveedor("Enel Distribución SpA"), "enel distribucion");
  assert.equal(Calculations.canonicalizarNombreProveedor("Falabella Retail Ltda."), "falabella retail");
  assert.equal(Calculations.canonicalizarNombreProveedor("Farmacias Ahumada Limitada"), "farmacias ahumada");
  assert.equal(Calculations.canonicalizarNombreProveedor("Cencosud S.A"), "cencosud");
  assert.equal(Calculations.canonicalizarNombreProveedor(null), "");
  assert.equal(Calculations.canonicalizarNombreProveedor(undefined), "");
  assert.equal(Calculations.canonicalizarNombreProveedor("   "), "");
});

test("Spec 041 - RF-2: Calculations.deduplicarProveedores elimina duplicados canónicos y unifica datos", () => {
  assert.equal(typeof Calculations.deduplicarProveedores, "function", "deduplicarProveedores debe ser una función");

  const proveedoresConDuplicados = [
    {
      id: "SUP-101",
      name: "Líder",
      category: "Alimentación & Supermercado",
      categoryCode: "5.1.01",
      paymentMethod: "",
      updatedAt: "2026-11-20T10:00:00.000Z"
    },
    {
      id: "SUP-102",
      name: "Lider",
      category: "",
      categoryCode: "",
      paymentMethod: "credit",
      updatedAt: "2026-11-25T15:00:00.000Z"
    },
    {
      id: "SUP-103",
      name: "Supermercados Líder S.A.",
      category: "Supermercado",
      paymentMethod: "debit",
      updatedAt: "2026-11-25T16:00:00.000Z"
    },
    {
      id: "SUP-201",
      name: "Enel Chile",
      category: "Electricidad",
      paymentMethod: "transfer",
      updatedAt: "2026-11-22T08:00:00.000Z"
    }
  ];

  const resultado = Calculations.deduplicarProveedores(proveedoresConDuplicados);

  // Líder y Lider comparten la misma clave canónica "lider". "Supermercados Líder S.A." es "supermercados lider", y "Enel Chile" es "enel chile".
  // Si filtramos por los que sean "lider", solo debe existir 1
  const liders = resultado.filter(p => Calculations.canonicalizarNombreProveedor(p.name) === "lider");
  assert.equal(liders.length, 1, "Debe existir exactamente 1 proveedor canónico para Líder");
  assert.equal(liders[0].category, "Alimentación & Supermercado", "Debe conservar la categoría existente más específica");
  assert.equal(liders[0].paymentMethod, "credit", "Debe enriquecer con el método de pago del duplicado");

  // Si pasamos dos con "Líder" y "Líder S.A."
  const conSufijo = [
    { id: "SUP-1", name: "Falabella", category: "Tienda", paymentMethod: "credit" },
    { id: "SUP-2", name: "Falabella S.A.", category: "", paymentMethod: "credit" }
  ];
  const resFalabella = Calculations.deduplicarProveedores(conSufijo);
  assert.equal(resFalabella.length, 1, "Falabella y Falabella S.A. deben consolidarse en 1");
});

test("Spec 041 - RF-3: Calculations.fusionarEstadoContable deduplica proveedores remotos y locales con IDs distintos", () => {
  const localState = {
    suppliers: [
      {
        id: "SUP-LOCAL-1",
        name: "Líder",
        category: "Alimentación & Supermercado",
        paymentMethod: "",
        updatedAt: "2026-11-24T10:00:00.000Z"
      }
    ]
  };

  const remoteState = {
    suppliers: [
      {
        id: "SUP-REMOTE-99",
        name: "Lider", // Mismo comercio, sin tilde y creado en otro dispositivo con ID distinto
        category: "",
        paymentMethod: "credit",
        updatedAt: "2026-11-25T12:00:00.000Z"
      }
    ]
  };

  const fusion = Calculations.fusionarEstadoContable(localState, remoteState);
  assert.ok(fusion && fusion.mergedState, "Debe retornar mergedState");
  assert.equal(fusion.mergedState.suppliers.length, 1, "No debe duplicar proveedores con nombres canónicos idénticos en la nube");
  assert.equal(fusion.mergedState.suppliers[0].category, "Alimentación & Supermercado");
  assert.equal(fusion.mergedState.suppliers[0].paymentMethod, "credit");
});

test("Spec 041 - RF-4: Calculations.sanearWorkspaceParaNube comprime/recorta PDFs de transacciones si exceden límite seguro de 1MB", () => {
  assert.equal(typeof Calculations.sanearWorkspaceParaNube, "function", "sanearWorkspaceParaNube debe ser una función");

  // Creamos un workspace artificialmente grande con 4 transacciones que llevan PDFs pesados de ~300KB cada uno (> 1MB total)
  const fakeBigPdf = "data:application/pdf;base64," + "A".repeat(350000);

  const workspace = {
    accounts: [{ id: "ACC-1", name: "Cuenta Corriente", currentBalance: 100000 }],
    transactions: [
      { id: "TX-4", date: "2026-11-25", supplier: "Líder", invoicePdf: fakeBigPdf, invoiceName: "factura_4.pdf" },
      { id: "TX-3", date: "2026-11-24", supplier: "Enel", invoicePdf: fakeBigPdf, invoiceName: "boleta_3.pdf" },
      { id: "TX-2", date: "2026-11-23", supplier: "Jumbo", invoicePdf: fakeBigPdf, invoiceName: "boleta_2.pdf" },
      { id: "TX-1", date: "2026-11-22", supplier: "Copec", invoicePdf: fakeBigPdf, invoiceName: "factura_1.pdf" }
    ],
    budgets: [],
    goals: [],
    planAccounts: [],
    suppliers: []
  };

  const safeWorkspace = Calculations.sanearWorkspaceParaNube(workspace, 900000);
  const jsonStr = JSON.stringify(safeWorkspace);

  assert.ok(jsonStr.length <= 900000, `El tamaño saneado (${jsonStr.length} bytes) debe ser menor o igual a 900KB para caber en 1MB de Firestore`);
  assert.equal(safeWorkspace.transactions.length, 4, "Debe preservar intactas las 4 transacciones");
  // La más reciente conserva su PDF intacto o metadata
  assert.equal(safeWorkspace.transactions[0].invoiceName, "factura_4.pdf");
  assert.equal(safeWorkspace.transactions[3].invoiceName, "factura_1.pdf", "Debe conservar la metadata de factura_1.pdf");
});

test("Spec 041 - RF-5: app.js incluye cola hasPendingSync en triggerAutoSync para soportar transacciones consecutivas", () => {
  assert.ok(
    appContent.includes("hasPendingSync") || appContent.includes("pendingSync"),
    "app.js debe implementar una bandera de sincronización pendiente (hasPendingSync) en triggerAutoSync"
  );
  assert.ok(
    appContent.includes("canonicalizarNombreProveedor"),
    "app.js debe utilizar canonicalizarNombreProveedor para evitar duplicados al guardar transacciones y proveedores"
  );
});

test("Spec 041 - RF-6: dbAdapter.js aplica saneamiento de tamaño antes de enviar a Firestore", () => {
  assert.ok(
    dbAdapterContent.includes("sanearWorkspaceParaNube") || dbAdapterContent.includes("sanearWorkspace"),
    "dbAdapter.js debe invocar sanearWorkspaceParaNube antes de guardar en Firestore para respetar el límite de 1MB"
  );
});

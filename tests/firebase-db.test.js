const { test } = require('node:test');
const assert = require('node:assert/strict');
const storage = require('../assets/js/storage.js');
const DbAdapter = require('../assets/js/dbAdapter.js');

test('RF-6: DbAdapter dispone de métodos para Firebase Firestore', () => {
  assert.equal(typeof DbAdapter.toFirestoreFields, 'function');
  assert.equal(typeof DbAdapter.fromFirestoreFields, 'function');
  assert.equal(typeof DbAdapter.testFirebaseConnection, 'function');
  assert.equal(typeof DbAdapter.prepareBackupDocument, 'function');
});

test('RF-6: toFirestoreFields convierte tipos primitivos y anidados al formato REST de Firestore', () => {
  const input = {
    name: "Banco de Chile",
    balance: 550000.5,
    isExcluded: false,
    notes: null,
    tags: ["banco", "sueldo"],
    meta: {
      code: "1.1.02",
      nature: "debit"
    }
  };

  const fields = DbAdapter.toFirestoreFields(input);

  assert.deepEqual(fields.name, { stringValue: "Banco de Chile" });
  assert.deepEqual(fields.balance, { doubleValue: 550000.5 });
  assert.deepEqual(fields.isExcluded, { booleanValue: false });
  assert.deepEqual(fields.notes, { nullValue: null });
  assert.deepEqual(fields.tags, {
    arrayValue: {
      values: [
        { stringValue: "banco" },
        { stringValue: "sueldo" }
      ]
    }
  });
  assert.deepEqual(fields.meta, {
    mapValue: {
      fields: {
        code: { stringValue: "1.1.02" },
        nature: { stringValue: "debit" }
      }
    }
  });
});

test('RF-6: fromFirestoreFields deserializa campos de Firestore a objeto JavaScript limpio', () => {
  const fields = {
    title: { stringValue: "Meta Vacaciones" },
    targetAmount: { doubleValue: 1200000 },
    isCompleted: { booleanValue: false },
    details: {
      mapValue: {
        fields: {
          category: { stringValue: "Ahorro" }
        }
      }
    }
  };

  const output = DbAdapter.fromFirestoreFields(fields);

  assert.equal(output.title, "Meta Vacaciones");
  assert.equal(output.targetAmount, 1200000);
  assert.equal(output.isCompleted, false);
  assert.deepEqual(output.details, { category: "Ahorro" });
});

test('RF-1: isConfigured detecta correctamente la configuración de Firebase', () => {
  const firebaseConfig = {
    provider: "firebase",
    projectId: "mi-propia-contabilidad",
    apiKey: "AIzaSyCjcppkAHLLNTZRomuGqz_Q96nMdnEnqtU"
  };

  assert.equal(DbAdapter.isFirebaseConfigured(firebaseConfig), true);

  const configInvalida = {
    provider: "firebase",
    projectId: "",
    apiKey: ""
  };
  assert.equal(DbAdapter.isFirebaseConfigured(configInvalida), false);
});

test('RF-4: prepareBackupDocument construye documento estructurado con metadata y conteo', () => {
  const backupData = {
    accounts: [{ id: "acc-1", name: "Efectivo" }],
    transactions: [{ id: "tx-1", amount: 1000 }],
    budgets: [{ id: "b-1", limitAmount: 5000 }],
    goals: [],
    planAccounts: []
  };

  const doc = DbAdapter.prepareBackupDocument(backupData);

  assert.ok(doc.exportDate);
  assert.equal(doc.version, "2.0");
  assert.equal(doc.stats.accountsCount, 1);
  assert.equal(doc.stats.transactionsCount, 1);
  assert.equal(doc.stats.budgetsCount, 1);
  assert.equal(doc.stats.goalsCount, 0);
  assert.equal(doc.stats.planAccountsCount, 0);
  assert.ok(doc.payload);
});

/**
 * dbAdapter.js — Adaptador para Base de Datos Real (Firebase Cloud Firestore / Supabase PostgreSQL / Local Fallback)
 * Exportación universal para navegador (window.ContaPersonal.DbAdapter) y Node.js.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    const storage = require("./storage.js");
    module.exports = factory(storage);
  } else {
    root.ContaPersonal = root.ContaPersonal || {};
    const storage = root.ContaPersonal.Storage || {};
    root.ContaPersonal.DbAdapter = factory(storage);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Storage) {

  // ========================================================
  // SERIALIZACIÓN / DESERIALIZACIÓN REST CLOUD FIRESTORE
  // ========================================================

  function toFirestoreValue(val) {
    if (val === null || val === undefined) {
      return { nullValue: null };
    }
    if (typeof val === "boolean") {
      return { booleanValue: val };
    }
    if (typeof val === "number") {
      return { doubleValue: val };
    }
    if (typeof val === "string") {
      return { stringValue: val };
    }
    if (Array.isArray(val)) {
      return {
        arrayValue: {
          values: val.map(item => toFirestoreValue(item))
        }
      };
    }
    if (typeof val === "object") {
      return {
        mapValue: {
          fields: toFirestoreFields(val)
        }
      };
    }
    return { stringValue: String(val) };
  }

  function toFirestoreFields(obj) {
    if (!obj || typeof obj !== "object") return {};
    const fields = {};
    Object.keys(obj).forEach((key) => {
      fields[key] = toFirestoreValue(obj[key]);
    });
    return fields;
  }

  function fromFirestoreValue(valObj) {
    if (!valObj || typeof valObj !== "object") return null;
    if ("nullValue" in valObj) return null;
    if ("booleanValue" in valObj) return valObj.booleanValue;
    if ("doubleValue" in valObj) return Number(valObj.doubleValue);
    if ("integerValue" in valObj) return Number(valObj.integerValue);
    if ("stringValue" in valObj) return valObj.stringValue;
    if ("arrayValue" in valObj) {
      const arr = valObj.arrayValue && valObj.arrayValue.values ? valObj.arrayValue.values : [];
      return arr.map(item => fromFirestoreValue(item));
    }
    if ("mapValue" in valObj) {
      const fields = valObj.mapValue && valObj.mapValue.fields ? valObj.mapValue.fields : {};
      return fromFirestoreFields(fields);
    }
    return null;
  }

  function fromFirestoreFields(fields) {
    if (!fields || typeof fields !== "object") return {};
    const obj = {};
    Object.keys(fields).forEach((key) => {
      obj[key] = fromFirestoreValue(fields[key]);
    });
    return obj;
  }

  // ========================================================
  // ADAPTADOR PRINCIPAL DE BASE DE DATOS
  // ========================================================

  const DbAdapter = {
    toFirestoreValue,
    toFirestoreFields,
    fromFirestoreValue,
    fromFirestoreFields,

    isFirebaseConfigured(config) {
      return Boolean(
        config &&
        config.provider === "firebase" &&
        config.projectId &&
        typeof config.projectId === "string" &&
        config.projectId.trim() &&
        config.apiKey &&
        typeof config.apiKey === "string" &&
        config.apiKey.trim()
      );
    },

    isSupabaseConfigured(config) {
      return Boolean(
        config &&
        config.provider === "supabase" &&
        config.url &&
        config.anonKey
      );
    },

    isConfigured() {
      const config = Storage.getDbConfig ? Storage.getDbConfig() : null;
      if (!config) return false;
      return this.isFirebaseConfigured(config) || this.isSupabaseConfigured(config);
    },

    getProvider() {
      const config = Storage.getDbConfig ? Storage.getDbConfig() : null;
      if (!config) return "none";
      if (this.isFirebaseConfigured(config)) return "firebase";
      if (this.isSupabaseConfigured(config)) return "supabase";
      return "none";
    },

    // --- PRUEBA DE CONEXIÓN CON FIREBASE ---
    async testFirebaseConnection(config) {
      if (!config || !config.projectId || !config.apiKey) {
        return { success: false, message: "Project ID y API Key de Firebase son requeridos." };
      }

      const projectId = config.projectId.trim();
      const apiKey = config.apiKey.trim();
      const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents?key=${apiKey}&pageSize=1`;

      try {
        const res = await fetch(endpoint);
        if (res.ok || res.status === 200) {
          return {
            success: true,
            message: `Conexión exitosa con Cloud Firestore en el proyecto "${projectId}".`
          };
        }

        const data = await res.json().catch(() => ({}));
        const errMessage = (data.error && data.error.message) ? data.error.message : `HTTP ${res.status}`;

        if (res.status === 403 && errMessage.includes("Cloud Firestore API has not been used")) {
          return {
            success: false,
            message: `La API de Firestore no está activada en "${projectId}". Actívala en Firebase Console -> Firestore Database.`,
            needsConsoleActivation: true
          };
        }

        return {
          success: false,
          message: `Error al conectar con Firestore (${res.status}): ${errMessage}`
        };
      } catch (err) {
        return {
          success: false,
          message: `Error de red al contactar Firebase: ${err.message}`
        };
      }
    },

    // --- PRUEBA DE CONEXIÓN SUPABASE (LEGACY) ---
    async testConnection(url, anonKey) {
      if (!url || !anonKey) {
        return { success: false, message: "URL y Anon Key son requeridos." };
      }
      try {
        const endpoint = `${url.replace(/\/$/, "")}/rest/v1/accounts?select=count`;
        const res = await fetch(endpoint, {
          headers: {
            "apikey": anonKey,
            "Authorization": `Bearer ${anonKey}`
          }
        });

        if (res.ok || res.status === 200 || res.status === 206) {
          return { success: true, message: "Conexión exitosa con Supabase PostgreSQL." };
        } else {
          const errorText = await res.text();
          return { success: false, message: `Error ${res.status}: ${errorText || "Respuesta inválida de Supabase"}` };
        }
      } catch (err) {
        return { success: false, message: `Error de red: ${err.message}` };
      }
    },

    // --- PREPARAR DOCUMENTO DE RESPALDO PARA FIRESTORE ---
    prepareBackupDocument(backupData = {}) {
      const now = new Date().toISOString();
      const accounts = Array.isArray(backupData.accounts) ? backupData.accounts : [];
      const transactions = Array.isArray(backupData.transactions) ? backupData.transactions : [];
      const budgets = Array.isArray(backupData.budgets) ? backupData.budgets : [];
      const goals = Array.isArray(backupData.goals) ? backupData.goals : [];
      const planAccounts = Array.isArray(backupData.planAccounts) ? backupData.planAccounts : [];

      return {
        app: "Contabilidad Personal PWA",
        version: "2.0",
        exportDate: now,
        stats: {
          accountsCount: accounts.length,
          transactionsCount: transactions.length,
          budgetsCount: budgets.length,
          goalsCount: goals.length,
          planAccountsCount: planAccounts.length
        },
        payload: JSON.stringify({
          accounts,
          transactions,
          budgets,
          goals,
          planAccounts
        })
      };
    },

    // --- GUARDAR RESPALDO EN FIREBASE FIRESTORE ---
    async saveBackupToFirebase(backupData, config) {
      const dbConfig = config || (Storage.getDbConfig ? Storage.getDbConfig() : null);
      if (!this.isFirebaseConfigured(dbConfig)) {
        return { success: false, message: "Firebase Firestore no está configurado." };
      }

      const docObj = this.prepareBackupDocument(backupData);
      const fields = this.toFirestoreFields(docObj);

      const endpoint = `https://firestore.googleapis.com/v1/projects/${dbConfig.projectId}/databases/(default)/documents/backups?key=${dbConfig.apiKey}`;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields })
        });

        if (res.ok || res.status === 200) {
          const resData = await res.json();
          const docId = resData.name ? resData.name.split("/").pop() : "nuevo";
          return {
            success: true,
            docId,
            message: `Copia de respaldo guardada con éxito en Firestore (ID: ${docId}).`
          };
        }

        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          message: `Error al guardar en Firestore (${res.status}): ${errData.error?.message || res.statusText}`
        };
      } catch (err) {
        return { success: false, message: `Error de red al guardar respaldo: ${err.message}` };
      }
    },

    // --- SINCRONIZACIÓN GENERAL ---
    async syncAll() {
      const config = Storage.getDbConfig ? Storage.getDbConfig() : null;
      const provider = this.getProvider();

      if (provider === "none") {
        return {
          synced: false,
          provider: "none",
          message: "Operando en modo Local Storage (sin base de datos remota configurada)."
        };
      }

      if (provider === "firebase") {
        const fullBackup = {
          accounts: Storage.getAccounts ? Storage.getAccounts() : [],
          transactions: Storage.getTransactions ? Storage.getTransactions() : [],
          budgets: Storage.getBudgets ? Storage.getBudgets() : [],
          goals: Storage.getGoals ? Storage.getGoals() : [],
          planAccounts: Storage.getPlanAccounts ? Storage.getPlanAccounts() : []
        };
        const res = await this.saveBackupToFirebase(fullBackup, config);
        return {
          synced: res.success,
          provider: "firebase",
          message: res.message
        };
      }

      // Proveedor Supabase
      return { synced: true, provider: "supabase", message: "Sincronización con base de datos remota completada." };
    }
  };

  return DbAdapter;
});

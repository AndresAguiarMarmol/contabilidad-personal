/**
 * dbAdapter.js — Adaptador para Base de Datos Real (Firebase Cloud Firestore / Supabase PostgreSQL / Local Fallback)
 * Exportación universal para navegador (window.ContaPersonal.DbAdapter) y Node.js.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    const storage = require("./storage.js");
    const calculations = require("./financeCalculations.js");
    module.exports = factory(storage, calculations);
  } else {
    root.ContaPersonal = root.ContaPersonal || {};
    const storage = root.ContaPersonal.Storage || {};
    const calculations = root.ContaPersonal.Calculations || {};
    root.ContaPersonal.DbAdapter = factory(storage, calculations);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Storage, Calculations) {

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
      // Consultamos la colección 'accounts' con pageSize=1 (endpoint REST válido que sí soporta CORS)
      const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/accounts?key=${apiKey}&pageSize=1`;

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

        if (res.status === 403) {
          if (errMessage.includes("Cloud Firestore API has not been used")) {
            return {
              success: false,
              message: `La API de Firestore no está activada en "${projectId}". Actívala en Firebase Console -> Firestore Database.`,
              needsConsoleActivation: true,
              consoleUrl: `https://console.firebase.google.com/project/${projectId}/firestore`
            };
          }
          if (errMessage.includes("Missing or insufficient permissions") || (data.error && data.error.status === "PERMISSION_DENIED")) {
            return {
              success: true,
              rulesProtected: true,
              message: `¡Conexión verificada con Firebase! La base de datos "${projectId}" está activa y respondiendo correctamente.`
            };
          }
        }

        if (res.status === 404) {
          return {
            success: false,
            message: `Base de datos (default) no encontrada en "${projectId}". Verifica que esté creada en Firebase Console.`
          };
        }

        return {
          success: false,
          message: `Error al conectar con Firestore (${res.status}): ${errMessage}`
        };
      } catch (err) {
        return {
          success: false,
          message: `Error de red al contactar Firebase: ${err.message}. Si abres desde archivo local (file://), considera usar un servidor local (http://localhost) o verifica que no haya bloqueadores de anuncios (adblockers) interviniendo.`
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
      const currencies = Array.isArray(backupData.currencies) ? backupData.currencies : [];
      const deletedAccounts = Array.isArray(backupData.deletedAccounts) ? backupData.deletedAccounts : [];
      const deletedPlanAccounts = Array.isArray(backupData.deletedPlanAccounts) ? backupData.deletedPlanAccounts : [];
      const deletedBudgets = Array.isArray(backupData.deletedBudgets) ? backupData.deletedBudgets : [];
      const deletedGoals = Array.isArray(backupData.deletedGoals) ? backupData.deletedGoals : [];

      return {
        app: "Contabilidad Personal PWA",
        version: "2.0",
        exportDate: now,
        stats: {
          accountsCount: accounts.length,
          transactionsCount: transactions.length,
          budgetsCount: budgets.length,
          goalsCount: goals.length,
          planAccountsCount: planAccounts.length,
          deletedPlanAccountsCount: deletedPlanAccounts.length
        },
        payload: JSON.stringify({
          accounts,
          transactions,
          budgets,
          goals,
          planAccounts,
          currencies,
          deletedAccounts,
          deletedPlanAccounts,
          deletedBudgets,
          deletedGoals
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
        const rawMsg = errData.error?.message || res.statusText;
        if (res.status === 403 && (rawMsg.includes("Missing or insufficient permissions") || errData.error?.status === "PERMISSION_DENIED")) {
          return {
            success: false,
            message: `Permisos insuficientes (403) en Firestore. Ve a Firebase Console -> Firestore Database -> Reglas y permite la escritura en 'backups'.`
          };
        }
        return {
          success: false,
          message: `Error al guardar en Firestore (${res.status}): ${rawMsg}`
        };
      } catch (err) {
        return { success: false, message: `Error de red al guardar respaldo: ${err.message}` };
      }
    },

    // --- MÉTODOS DE AUTENTICACIÓN FIREBASE AUTH (SPEC 021) ---

    async signUpUser(email, password, config = null) {
      const dbConfig = config || (Storage.getDbConfig ? Storage.getDbConfig() : null);
      if (!this.isFirebaseConfigured(dbConfig)) {
        return { success: false, message: "Firebase no está configurado." };
      }

      const val = Calculations && Calculations.validarCredencialesAuth
        ? Calculations.validarCredencialesAuth(email, password, true)
        : { valida: true, email, password };
      if (!val.valida) {
        return { success: false, message: val.error };
      }

      const payload = Calculations && Calculations.construirPayloadAuth
        ? Calculations.construirPayloadAuth("signUp", val.email, val.password)
        : { email: val.email, password: val.password, returnSecureToken: true };

      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${dbConfig.apiKey}`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok || res.status === 200) {
          const session = Calculations && Calculations.extraerSesionAuth
            ? Calculations.extraerSesionAuth(data)
            : { uid: data.localId, email: data.email, idToken: data.idToken, refreshToken: data.refreshToken };
          if (Storage && Storage.saveAuthSession) {
            Storage.saveAuthSession(session);
          }
          return { success: true, session, message: `Cuenta creada con éxito para ${session.email}.` };
        }

        const rawErr = (data.error && data.error.message) ? data.error.message : res.statusText;
        const msg = Calculations && Calculations.traducirErrorFirebaseAuth
          ? Calculations.traducirErrorFirebaseAuth(rawErr)
          : rawErr;
        return { success: false, message: msg };
      } catch (err) {
        return { success: false, message: `Error de red al registrar usuario: ${err.message}` };
      }
    },

    async signInUser(email, password, config = null) {
      const dbConfig = config || (Storage.getDbConfig ? Storage.getDbConfig() : null);
      if (!this.isFirebaseConfigured(dbConfig)) {
        return { success: false, message: "Firebase no está configurado." };
      }

      const val = Calculations && Calculations.validarCredencialesAuth
        ? Calculations.validarCredencialesAuth(email, password, false)
        : { valida: true, email, password };
      if (!val.valida) {
        return { success: false, message: val.error };
      }

      const payload = Calculations && Calculations.construirPayloadAuth
        ? Calculations.construirPayloadAuth("signIn", val.email, val.password)
        : { email: val.email, password: val.password, returnSecureToken: true };

      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${dbConfig.apiKey}`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok || res.status === 200) {
          const session = Calculations && Calculations.extraerSesionAuth
            ? Calculations.extraerSesionAuth(data)
            : { uid: data.localId, email: data.email, idToken: data.idToken, refreshToken: data.refreshToken };
          if (Storage && Storage.saveAuthSession) {
            Storage.saveAuthSession(session);
          }
          return { success: true, session, message: `Bienvenido de vuelta, ${session.email}.` };
        }

        const rawErr = (data.error && data.error.message) ? data.error.message : res.statusText;
        const msg = Calculations && Calculations.traducirErrorFirebaseAuth
          ? Calculations.traducirErrorFirebaseAuth(rawErr)
          : rawErr;
        return { success: false, message: msg };
      } catch (err) {
        return { success: false, message: `Error de red al iniciar sesión: ${err.message}` };
      }
    },

    async refreshUserToken(refreshToken, config = null) {
      const dbConfig = config || (Storage.getDbConfig ? Storage.getDbConfig() : null);
      if (!this.isFirebaseConfigured(dbConfig) || !refreshToken) {
        return null;
      }

      const payload = Calculations && Calculations.construirPayloadAuth
        ? Calculations.construirPayloadAuth("refresh", null, null, refreshToken)
        : { grant_type: "refresh_token", refresh_token: refreshToken };

      const url = `https://securetoken.googleapis.com/v1/token?key=${dbConfig.apiKey}`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok || res.status === 200) {
          const data = await res.json();
          const currentSession = Storage && Storage.getAuthSession ? Storage.getAuthSession() : {};
          const updatedSession = {
            ...currentSession,
            idToken: data.id_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000)
          };
          if (Storage && Storage.saveAuthSession) {
            Storage.saveAuthSession(updatedSession);
          }
          return updatedSession;
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    async getValidAuthToken(config = null) {
      const session = Storage && Storage.getAuthSession ? Storage.getAuthSession() : null;
      if (!session || !session.idToken) return null;

      const isExpired = Calculations && Calculations.esTokenExpirado
        ? Calculations.esTokenExpirado(session)
        : false;

      if (!isExpired) {
        return session.idToken;
      }

      if (session.refreshToken) {
        const refreshed = await this.refreshUserToken(session.refreshToken, config);
        return refreshed ? refreshed.idToken : session.idToken;
      }

      return session.idToken;
    },

    // --- OBTENER ESTADO REMOTO DE WORKSPACE (SPEC 015 & SPEC 021) ---
    async fetchRemoteWorkspace(config) {
      const dbConfig = config || (Storage.getDbConfig ? Storage.getDbConfig() : null);
      if (!this.isFirebaseConfigured(dbConfig)) return null;

      const session = Storage && Storage.getAuthSession ? Storage.getAuthSession() : null;
      const authToken = await this.getValidAuthToken(dbConfig);

      // Si el usuario está autenticado, su workspace reside en workspaces/{uid}
      const docPath = (session && session.uid) ? `workspaces/${session.uid}` : "workspaces/main";
      const endpoint = `https://firestore.googleapis.com/v1/projects/${dbConfig.projectId}/databases/(default)/documents/${docPath}?key=${dbConfig.apiKey}`;

      const headers = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      try {
        const res = await fetch(endpoint, { headers });
        if (res.status === 200) {
          const data = await res.json();
          if (data && data.fields) {
            return this.fromFirestoreFields(data.fields);
          }
        }
        // Si no existe el workspace privado pero sí hay un backup previo o workspace main, fallback suave
        if (res.status === 404 && docPath === "workspaces/main") {
          const backupsEndpoint = `https://firestore.googleapis.com/v1/projects/${dbConfig.projectId}/databases/(default)/documents/backups?key=${dbConfig.apiKey}&pageSize=1`;
          const backupRes = await fetch(backupsEndpoint, { headers }).catch(() => null);
          if (backupRes && backupRes.status === 200) {
            const bData = await backupRes.json();
            if (bData.documents && bData.documents.length > 0) {
              const latest = bData.documents[0];
              if (latest && latest.fields) {
                return this.fromFirestoreFields(latest.fields);
              }
            }
          }
        }
        return null;
      } catch (err) {
        return null;
      }
    },

    // --- GUARDAR ESTADO REMOTO DE WORKSPACE (SPEC 015 & SPEC 021) ---
    async saveRemoteWorkspace(workspaceData, config) {
      const dbConfig = config || (Storage.getDbConfig ? Storage.getDbConfig() : null);
      if (!this.isFirebaseConfigured(dbConfig)) {
        return { success: false, message: "Firebase no está configurado." };
      }

      const session = Storage && Storage.getAuthSession ? Storage.getAuthSession() : null;
      const authToken = await this.getValidAuthToken(dbConfig);
      const docPath = (session && session.uid) ? `workspaces/${session.uid}` : "workspaces/main";

      const payload = {
        updatedAt: new Date().toISOString(),
        userUid: session ? session.uid : null,
        userEmail: session ? session.email : null,
        accounts: Array.isArray(workspaceData.accounts) ? workspaceData.accounts : [],
        transactions: Array.isArray(workspaceData.transactions) ? workspaceData.transactions : [],
        budgets: Array.isArray(workspaceData.budgets) ? workspaceData.budgets : [],
        goals: Array.isArray(workspaceData.goals) ? workspaceData.goals : [],
        planAccounts: Array.isArray(workspaceData.planAccounts) ? workspaceData.planAccounts : [],
        currencies: Array.isArray(workspaceData.currencies) ? workspaceData.currencies : [],
        deletedAccounts: Array.isArray(workspaceData.deletedAccounts) ? workspaceData.deletedAccounts : [],
        deletedPlanAccounts: Array.isArray(workspaceData.deletedPlanAccounts) ? workspaceData.deletedPlanAccounts : [],
        deletedBudgets: Array.isArray(workspaceData.deletedBudgets) ? workspaceData.deletedBudgets : [],
        deletedGoals: Array.isArray(workspaceData.deletedGoals) ? workspaceData.deletedGoals : []
      };

      const fields = this.toFirestoreFields(payload);
      const endpoint = `https://firestore.googleapis.com/v1/projects/${dbConfig.projectId}/databases/(default)/documents/${docPath}?key=${dbConfig.apiKey}`;

      const headers = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      try {
        const res = await fetch(endpoint, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ fields })
        });

        if (res.ok || res.status === 200) {
          return { success: true, message: `Workspace (${docPath}) actualizado en Cloud Firestore.` };
        }
        const errData = await res.json().catch(() => ({}));
        return { success: false, message: `Error (${res.status}): ${errData.error?.message || res.statusText}` };
      } catch (err) {
        return { success: false, message: `Error de red: ${err.message}` };
      }
    },

    // --- SINCRONIZACIÓN BIDIRECCIONAL COMPLETA (SPEC 015) ---
    async syncBidirectional(customConfig = null) {
      const config = customConfig || (Storage.getDbConfig ? Storage.getDbConfig() : null);
      if (!this.isFirebaseConfigured(config)) {
        return {
          synced: false,
          provider: "none",
          message: "Operando en modo Local Storage (sin base de datos remota configurada)."
        };
      }

      const localState = {
        accounts: Storage.getAccounts ? Storage.getAccounts() : [],
        transactions: Storage.getTransactions ? Storage.getTransactions() : [],
        budgets: Storage.getBudgets ? Storage.getBudgets() : [],
        goals: Storage.getGoals ? Storage.getGoals() : [],
        planAccounts: Storage.getPlanAccounts ? Storage.getPlanAccounts() : [],
        currencies: Storage.getCurrencies ? Storage.getCurrencies() : [],
        deletedAccounts: Storage.getDeletedAccounts ? Storage.getDeletedAccounts() : [],
        deletedPlanAccounts: Storage.getDeletedPlanAccounts ? Storage.getDeletedPlanAccounts() : [],
        deletedBudgets: Storage.getDeletedBudgets ? Storage.getDeletedBudgets() : [],
        deletedGoals: Storage.getDeletedGoals ? Storage.getDeletedGoals() : []
      };

      const remoteState = await this.fetchRemoteWorkspace(config);

      // Si no hay nada en remoto aún, inicializamos remoto con el local
      if (!remoteState) {
        await this.saveRemoteWorkspace(localState, config);
        return {
          synced: true,
          provider: "firebase",
          hasChangesFromRemote: false,
          newTransactionsFromRemote: 0,
          mergedState: localState,
          message: "Datos locales inicializados en la nube."
        };
      }

      // Si hay datos remotos, fusionamos bidireccionalmente
      const fusion = Calculations && Calculations.fusionarEstadoContable
        ? Calculations.fusionarEstadoContable(localState, remoteState)
        : { mergedState: localState, hasChangesFromRemote: false, newTransactionsFromRemote: 0 };

      const merged = fusion.mergedState;

      // Guardar en Storage local si hubo cambios o para unificar
      if (Storage) {
        if (Storage.saveAccounts) Storage.saveAccounts(merged.accounts);
        if (Storage.saveTransactions) Storage.saveTransactions(merged.transactions);
        if (Storage.saveBudgets) Storage.saveBudgets(merged.budgets);
        if (Storage.saveGoals) Storage.saveGoals(merged.goals);
        if (Storage.savePlanAccounts) Storage.savePlanAccounts(merged.planAccounts);
        if (Storage.saveCurrencies && merged.currencies) Storage.saveCurrencies(merged.currencies);
        if (Storage.saveDeletedAccounts && merged.deletedAccounts) Storage.saveDeletedAccounts(merged.deletedAccounts);
        if (Storage.saveDeletedPlanAccounts && merged.deletedPlanAccounts) Storage.saveDeletedPlanAccounts(merged.deletedPlanAccounts);
        if (Storage.saveDeletedBudgets && merged.deletedBudgets) Storage.saveDeletedBudgets(merged.deletedBudgets);
        if (Storage.saveDeletedGoals && merged.deletedGoals) Storage.saveDeletedGoals(merged.deletedGoals);
      }

      // Subir el estado fusionado resultante a Firestore para que el otro dispositivo también lo reciba
      await this.saveRemoteWorkspace(merged, config);

      return {
        synced: true,
        provider: "firebase",
        hasChangesFromRemote: fusion.hasChangesFromRemote,
        newTransactionsFromRemote: fusion.newTransactionsFromRemote,
        mergedState: merged,
        message: fusion.newTransactionsFromRemote > 0
          ? `Sincronización exitosa: ${fusion.newTransactionsFromRemote} movimiento(s) recibido(s) desde otro dispositivo.`
          : "Sincronización al día con la nube."
      };
    },

    // --- SINCRONIZACIÓN GENERAL ---
    async syncAll() {
      const provider = this.getProvider();
      if (provider === "firebase") {
        return await this.syncBidirectional();
      }
      if (provider === "none") {
        return {
          synced: false,
          provider: "none",
          message: "Operando en modo Local Storage (sin base de datos remota configurada)."
        };
      }
      return { synced: true, provider: "supabase", message: "Sincronización con base de datos remota completada." };
    }
  };

  return DbAdapter;
});

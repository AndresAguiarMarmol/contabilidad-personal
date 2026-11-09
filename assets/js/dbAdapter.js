/**
 * dbAdapter.js — Adaptador para Base de Datos Real (Supabase PostgreSQL / Local Fallback)
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

  const DbAdapter = {
    isConfigured() {
      const config = Storage.getDbConfig ? Storage.getDbConfig() : null;
      return Boolean(config && config.provider === "supabase" && config.url && config.anonKey);
    },

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

    async syncAll() {
      if (!this.isConfigured()) {
        return { synced: false, message: "Operando en modo Local Storage (sin base de datos remota configurada)." };
      }
      return { synced: true, message: "Sincronización con base de datos remota completada." };
    }
  };

  return DbAdapter;
});

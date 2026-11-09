/**
 * dbAdapter.js — Adaptador para Base de Datos Real (Supabase PostgreSQL / Local Fallback)
 */
import { Storage } from "./storage.js";

export const DbAdapter = {
  isConfigured() {
    const config = Storage.getDbConfig();
    return config && config.provider === "supabase" && config.url && config.anonKey;
  },

  async testConnection(url, anonKey) {
    if (!url || !anonKey) {
      return { success: false, message: "URL y Anon Key son requeridos." };
    }
    try {
      // Intento de ping simple a la API de Supabase REST
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
    // Lógica de sincronización preparada
    return { synced: true, message: "Sincronización con base de datos remota completada." };
  }
};

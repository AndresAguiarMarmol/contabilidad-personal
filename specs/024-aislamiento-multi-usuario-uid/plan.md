# Plan de Implementación — Spec 024: Aislamiento Estricto Multi-Usuario por UID en Almacenamiento Local y Sincronización en la Nube

**Estado:** Aprobado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Arquitectura y Diseño Técnico

### A. Función Pura `obtenerClaveStorage(claveBase, uid)`
Ubicación: `assets/js/financeCalculations.js` (exportación universal para Node.js y navegador).
- Entrada:
  - `claveBase` (string, ej: `"finance_accounts_data"` o `"accounts"`).
  - `uid` (string o null/undefined, ej: `"user_andres_123"`).
- Comportamiento:
  - Si `!uid` o `typeof uid !== "string"` o `uid.trim() === ""`: retorna `claveBase`.
  - Normaliza: si `claveBase` inicia con `"finance_"`, extrae el sufijo posterior (`"accounts_data"`).
  - Retorna `finance_${uid.trim()}_${sufijo}` (ej. `finance_user_andres_123_accounts_data`).
  - Claves globales como `finance_theme` o `finance_auth_session` o `finance_remote_db_config` no se particionan porque pertenecen a la configuración del navegador/dispositivo.

### B. Capa de Persistencia `Storage`
Ubicación: `assets/js/storage.js`.
- Gestión de UID activo:
  - Variable interna `let activeUid = null;`.
  - Método `setActiveUid(uid)`: asigna `activeUid`.
  - Método `getActiveUid()`: retorna `activeUid` o, si es nulo, intenta leerlo de `getAuthSession()?.uid`.
  - Método `resolveKey(claveBase)`: llama a `calculations.obtenerClaveStorage(claveBase, this.getActiveUid())`.
  - Todos los métodos de lectura/escritura de datos contables (`getAccounts`, `saveAccounts`, `getTransactions`, `saveTransactions`, `getBudgets`, `saveBudgets`, `getGoals`, `saveGoals`, `getPlanAccounts`, `savePlanAccounts`, `getCurrencies`, `saveCurrencies`, `getDeleted*`, `saveDeleted*`) utilizan `resolveKey(STORAGE_KEYS.*)`.
  - Método `limpiarEspacioUsuario(uid)`: elimina todas las claves de localStorage pertenecientes a ese UID.

### C. Ciclo de Vida de Sesión en `assets/js/app.js`
- En `solicitarCierreSesion()`:
  - Llama a `Storage.clearAuthSession()`.
  - Llama a `Storage.setActiveUid(null)`.
  - Limpia completamente `state.accounts = []`, `state.transactions = []`, `state.budgets = []`, `state.goals = []`, `state.planAccounts = []`, `state.deletedAccounts = []`, etc.
  - Llama a `evaluarAccesoAuth()`.
- En inicio de sesión o registro (`DbAdapter.signInUser` / `signUpUser`):
  - Guarda sesión: `Storage.saveAuthSession(res.session)`.
  - Establece UID activo: `Storage.setActiveUid(res.session.uid)`.
  - Carga el estado específico de ese UID: `loadStateFromStorage()`.
  - Evalúa acceso y sincroniza con Firestore en segundo plano: `triggerAutoSync()`.

### D. Adaptador de Base de Datos `assets/js/dbAdapter.js`
- En `syncBidirectional()`:
  - Verifica que la sesión activa posea `uid`. Si no hay UID, detiene la sincronización con advertencia limpia.
  - Asegura que `localState` se lea exclusivamente con el UID de la sesión activa.
  - Sincroniza bidireccionalmente con `workspaces/{uid}`.

---

## 2. Plan de Pruebas Unitarias (TDD)
Archivo: `tests/user-isolation.test.js`
- **Test 1:** `obtenerClaveStorage` deriva correctamente claves con prefijo por UID y respeta claves globales o sin UID.
- **Test 2:** `Storage.setActiveUid` particiona los datos: guardar cuentas para UID 1 no contamina las cuentas de UID 2.
- **Test 3:** Conmutación de usuario: alternar de UID 1 a UID 2 devuelve arrays independientes y vacíos si UID 2 es nuevo.
- **Test 4:** Cierre de sesión y purga: al restablecer el UID o desloguearse, las cuentas del usuario no quedan expuestas en el ámbito global ni en un nuevo UID.
- **Test 5:** Sincronización multi-usuario: `DbAdapter.syncBidirectional` rechaza sesiones sin UID o sincroniza estrictamente en la partición correspondiente sin contaminar a otros.

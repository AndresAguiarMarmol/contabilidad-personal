# Tareas de Implementación — Spec 024: Aislamiento Estricto Multi-Usuario por UID en Almacenamiento Local y Sincronización en la Nube

**Estado:** Completado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## Checklist de Tareas

- [x] **Tarea 1 (TDD Red):** Crear archivo de pruebas unitarias `tests/user-isolation.test.js` con casos para `obtenerClaveStorage`, partición por UID en `Storage`, aislamiento entre usuarios y cierre de sesión limpio.
- [x] **Tarea 2 (TDD Green - Función Pura):** Implementar `obtenerClaveStorage(claveBase, uid)` en `assets/js/financeCalculations.js` y exportarla universalmente.
- [x] **Tarea 3 (TDD Green - Storage Namespacing):** Modificar `assets/js/storage.js` para añadir `getActiveUid()`, `setActiveUid(uid)`, `resolveKey(claveBase)` y migrar todos los accesos a `localStorage` para que utilicen claves particionadas por UID.
- [x] **Tarea 4 (TDD Green - Integración UI y Ciclo de Sesión):**
  - Modificar `assets/js/app.js` en `solicitarCierreSesion()` para purgar memoria activa y resetear `Storage.setActiveUid(null)`.
  - Modificar los listeners de Login/Registro para llamar a `Storage.setActiveUid(session.uid)` antes de `loadStateFromStorage()`.
  - Asegurar que `startApp()` inicialice `Storage.setActiveUid()` a partir de la sesión guardada.
- [x] **Tarea 5 (TDD Green - Adaptador Firestore):** Actualizar `assets/js/dbAdapter.js` en `syncBidirectional` para validar la sesión y sincronizar únicamente el espacio de nombres del usuario autenticado.
- [x] **Tarea 6 (Verificación Global):** Ejecutar `node --test tests/*.test.js` asegurando 100% de pruebas pasando (119/119 pruebas).
- [x] **Tarea 7 (Cache y Service Worker):** Incrementar la versión del Service Worker en `sw.js` a `contapersonal-v7` para invalidar la caché en los navegadores de los usuarios.
- [x] **Tarea 8 (Memoria del Proyecto):** Actualizar `memory.md` (Secciones 1, 2 y 3).
- [x] **Tarea 9 (Git & Despliegue):** Realizar commit y push de los cambios.
- [x] **Tarea 10 (Guía para el Usuario):** Explicar al usuario cómo eliminar de su cuenta personal las cuentas de su esposa que se mezclaron previamente, con la tranquilidad de que no afectarán la cuenta de su esposa en Firestore.

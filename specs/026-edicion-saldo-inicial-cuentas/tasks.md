# Tareas de Implementación — Spec 026: Edición de Saldo Inicial en Cuentas Financieras

**Estado:** Completado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## Checklist de Tareas

- [x] **Tarea 1 (TDD Red):** Crear archivo de pruebas `tests/account-initial-balance-edit.test.js` con casos exhaustivos para `validarEdicionCuenta`, `normalizarSaldoInicialCuenta`, y recálculo determinista de balances al editar el saldo inicial.
- [x] **Tarea 2 (TDD Green - Lógica Pura):**
  - Extender `validarEdicionCuenta` en `assets/js/financeCalculations.js` para validar `initialBalance`.
  - Implementar y exportar `normalizarSaldoInicialCuenta(type, initialBalance)`.
- [x] **Tarea 3 (TDD Green - UI en Modal de Edición):**
  - Añadir el campo `#acc-edit-input-balance` en el HTML de `openAccountEditModal` en `assets/js/app.js`.
  - Conectar la lectura, normalización, asignación a `account.initialBalance` y recálculo con `recalcularBalancesCuentas`.
  - Persistir cuentas con `Storage.saveAccounts` y sincronizar con Firestore en segundo plano.
- [x] **Tarea 4 (Verificación Global):** Ejecutar `node --test tests/*.test.js` y asegurar 100% pasando (124 pruebas previas + nuevas pruebas).
- [x] **Tarea 5 (Cache y Service Worker):** Incrementar la versión de cache en `sw.js` a `contapersonal-v9`.
- [x] **Tarea 6 (Memoria del Proyecto):** Actualizar `memory.md` (Secciones 1, 2 y 3).
- [x] **Tarea 7 (Git & Despliegue):** Realizar commit y push de los cambios a GitHub `main`.
- [x] **Tarea 8 (Notificación al Usuario):** Informar al usuario que la edición de saldo inicial está operativa en el modal de edición de cuentas.

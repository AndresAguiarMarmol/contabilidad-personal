# tasks.md — Tareas de Implementación (SDD)

**Especificación:** Spec 016 — Eliminación Definitiva de Cuentas Contables y Prevención de Resurrección en la Sincronización  
**Estado general:** Completado  

---

## Lista de Tareas Verificables

- [x] **Tarea 1 (TDD Red):** Escribir pruebas unitarias en `tests/sync-merge.test.js` para RF-2 y RF-6 (descarte de entidades en listas de eliminados y precedencia local de atributos) y verificar que fallen con `node --test tests/sync-merge.test.js`.
- [x] **Tarea 2 (TDD Green - Capa de Cálculo):** Implementar en `fusionarEstadoContable` y `obtenerCatalogoPlanCuentas` en `assets/js/financeCalculations.js` el soporte para `deletedPlanAccounts`, `deletedBudgets`, `deletedGoals`, y precedencia local en atributos `{ ...remoto, ...local }`.
- [x] **Tarea 3 (Persistencia y Sincronización):** Implementar en `assets/js/storage.js` y `assets/js/dbAdapter.js` la lectura, guardado y transmisión de las listas de eliminados en LocalStorage y Firestore.
- [x] **Tarea 4 (UI y Reactividad):** Integrar en `assets/js/app.js` el registro de eliminados en los botones de borrado de plan de cuentas, presupuestos y metas con disparo inmediato de `syncBidirectional()`, y retiro de eliminados al recrear una cuenta.
- [x] **Tarea 5 (Verificación Integral y Memoria):** Ejecutar la suite completa de pruebas unitarias (`node --test tests/*.test.js`), actualizar `memory.md`, sincronizar con GitHub y reportar al usuario (77/77 pruebas en verde).

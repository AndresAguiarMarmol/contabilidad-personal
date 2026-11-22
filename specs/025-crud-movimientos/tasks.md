# Tareas de Implementación — Spec 025: CRUD Completo de Movimientos en el Libro de Movimientos

**Estado:** Completado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## Checklist de Tareas

- [x] **Tarea 1 (TDD Red):** Crear archivo de pruebas `tests/transactions-crud.test.js` con casos exhaustivos para `recalcularBalancesCuentas`, edición, eliminación y lápidas en `fusionarEstadoContable`.
- [x] **Tarea 2 (TDD Green - Lógica Pura):**
  - Implementar `recalcularBalancesCuentas(cuentas, transacciones)` en `assets/js/financeCalculations.js`.
  - Actualizar `fusionarEstadoContable` para soportar lápidas `deletedTransactions`.
  - Exportar universalmente las nuevas funciones.
- [x] **Tarea 3 (TDD Green - Persistencia & Lápidas):**
  - Añadir `DELETED_TRANSACTIONS` en `assets/js/storage.js`.
  - Implementar `getDeletedTransactions()` y `saveDeletedTransactions(list)`.
  - Integrar en `dbAdapter.js` para persistencia en Firestore y sincronización bidireccional.
- [x] **Tarea 4 (TDD Green - UI en Libro de Movimientos):**
  - Agregar columna `<th class="py-3 px-4 text-center">Acciones</th>` en `index.html`.
  - Actualizar `renderTransactions()` en `assets/js/app.js` para renderizar botones de Editar y Eliminar y gestionar `colspan="7"` en estado vacío.
- [x] **Tarea 5 (TDD Green - Modal de Edición & Flujo de Borrado):**
  - Adaptar `openTransactionModal` para admitir `txToEdit`.
  - Precargar datos en el formulario y controlar envío en modo edición.
  - Implementar `solicitarEliminarTransaccion(txId)` con confirmación, lápidas y recálculo contable.
- [x] **Tarea 6 (Verificación Global):** Ejecutar `node --test tests/*.test.js` y asegurar 100% pasando (119 + nuevas pruebas).
- [x] **Tarea 7 (Cache y Service Worker):** Incrementar la versión del Service Worker en `sw.js` a `contapersonal-v8`.
- [x] **Tarea 8 (Memoria del Proyecto):** Actualizar `memory.md` (Secciones 1, 2 y 3).
- [x] **Tarea 9 (Git & Despliegue):** Realizar commit y push de los cambios.
- [x] **Tarea 10 (Notificación al Usuario):** Informar al usuario sobre las nuevas capacidades CRUD en el Libro de Movimientos.

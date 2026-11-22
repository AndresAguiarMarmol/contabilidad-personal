# Plan de Implementación — Spec 025: CRUD Completo de Movimientos en el Libro de Movimientos

**Estado:** Aprobado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Arquitectura y Componentes Técnicos

### A. Capa de Cálculos y Reglas de Negocio (`assets/js/financeCalculations.js`)
1. **`recalcularBalancesCuentas(cuentas, transacciones)`**:
   - Toma array inmutable de cuentas y array inmutable de transacciones.
   - Para cada cuenta `acc`, inicializa `balance = Number(acc.initialBalance || 0)`.
   - Itera todas las transacciones vigentes aplicando el impacto contable:
     - Si `tx.isSplit` y `Array.isArray(tx.splitLines)`:
       - Si `tx.accountId === acc.id`, resta `tx.amount`.
       - Por cada partida `line`: si `line.targetAccountId === acc.id`, suma `line.amount`.
     - Si `tx.type === "expense"` y `tx.accountId === acc.id`: resta `tx.amount`.
     - Si `tx.type === "income"` y `tx.accountId === acc.id`: suma `tx.amount`.
     - Si `tx.type === "transfer"`:
       - Si `tx.accountId === acc.id`, resta `tx.amount`.
       - Si `tx.toAccountId === acc.id`, suma `tx.toAmount ?? tx.amount`.
   - Retorna array de cuentas clonadas con `currentBalance: balance`.
2. **Actualización de `fusionarEstadoContable(localState, remoteState)`**:
   - Soporte para `deletedTransactions`: unificar `local.deletedTransactions` y `remote.deletedTransactions`.
   - Filtrar `txMap` para descartar cualquier transacción cuyo `id` esté en `deletedTransactionsSet`.
   - Usar `recalcularBalancesCuentas` para garantizar cuadratura exacta de los balances resultantes.

### B. Capa de Persistencia (`assets/js/storage.js`)
1. Añadir clave `STORAGE_KEYS.DELETED_TRANSACTIONS = "finance_deleted_transactions_data"`.
2. Implementar `getDeletedTransactions()` y `saveDeletedTransactions(list)`.
3. Integrar `deletedTransactions` en:
   - `exportBackup()` y `importBackup()`.
   - `resetToMockData()`.
   - `limpiarTodoElEstadoLocal()` y `limpiarClavesGlobalesLegacy()`.

### C. Capa de Adaptador Remoto (`assets/js/dbAdapter.js`)
1. En `syncBidirectional()`: incluir `deletedTransactions` en `localState` y persistir `merged.deletedTransactions`.
2. En `saveRemoteWorkspace()`: incluir `deletedTransactions` en el payload Firestore.
3. En `fromFirestoreFields()`: leer `deletedTransactions` si existe.

### D. Capa de Interfaz de Usuario (`assets/js/app.js` y `index.html`)
1. **`index.html`**:
   - Añadir `<th class="py-3 px-4 text-center">Acciones</th>` al encabezado de `#transactions-table-body`.
2. **`renderTransactions()` en `assets/js/app.js`**:
   - En el estado vacío: cambiar `colspan="6"` a `colspan="7"`.
   - En cada fila: añadir celda `<td>` con botones de editar y eliminar:
     - `button.btn-edit-tx` con atributo `data-tx-id="${tx.id}"`.
     - `button.btn-delete-tx` con atributo `data-tx-id="${tx.id}"`.
   - Delegar eventos de clic en `#transactions-table-body` para disparar `editarTransaccion(txId)` y `solicitarEliminarTransaccion(txId)`.
3. **`openTransactionModal(initialType = "expense", editTx = null)`**:
   - Si `editTx` está presente:
     - Título del modal: "Editar Movimiento".
     - Botón de guardado: "Actualizar Movimiento".
     - Precargar formulario con datos existentes (`amount`, `date`, `desc`, `account`, `toAccount`, `category`, `splitLines`, etc.).
   - Al enviar:
     - Si es edición: actualizar el elemento en `state.transactions`, recalcular balances de cuentas con `recalcularBalancesCuentas`, sincronizar presupuestos, persistir y refrescar.
     - Si es creación: comportamiento actual conservado.
4. **`solicitarEliminarTransaccion(txId)`**:
   - Confirmar eliminación mostrando concepto y monto.
   - Registrar lápida en `state.deletedTransactions`.
   - Filtrar de `state.transactions`.
   - Recalcular balances con `recalcularBalancesCuentas`.
   - Sincronizar presupuestos con `sincronizarPresupuestosConTransacciones`.
   - Persistir y auto-sincronizar.

---

## 2. Plan de Pruebas Unitarias TDD (`tests/transactions-crud.test.js`)
- **Test 1:** `recalcularBalancesCuentas` actualiza balances correctamente tras gastos, ingresos y transferencias simples.
- **Test 2:** `recalcularBalancesCuentas` maneja transferencias multidivisa y partidas split entre cuentas.
- **Test 3:** Simulación de edición: modificar el monto de una transacción y recalcular balances refleja exactamente el nuevo saldo contable sin desfases.
- **Test 4:** Simulación de eliminación: remover una transacción y recalcular balances restaura el saldo contable previo al registro del movimiento.
- **Test 5:** `fusionarEstadoContable` respeta `deletedTransactions`: un movimiento eliminado en local o remoto no resucita durante la sincronización multi-dispositivo.

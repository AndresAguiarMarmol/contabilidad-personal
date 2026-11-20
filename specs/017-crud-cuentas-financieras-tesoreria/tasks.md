# Tareas — Spec 017: CRUD Cuentas Financieras (Tesorería)

- [x] **Fase 1: TDD Red (Pruebas Unitarias)**
  - [x] Escribir pruebas en `tests/accounts.test.js` para `Calculations.purgarMovimientosDeCuenta(accountId, transactions)`.
  - [x] Escribir pruebas en `tests/sync-merge.test.js` para lápidas `deletedAccounts` en `Calculations.fusionarEstadoContable(localState, remoteState)`.
  - [x] Ejecutar `node --test tests/accounts.test.js tests/sync-merge.test.js` y verificar fallo controlado (Red).

- [x] **Fase 2: TDD Green (Capa de Cálculo Puro)**
  - [x] Implementar `purgarMovimientosDeCuenta(accountId, transactions)` en `assets/js/financeCalculations.js`.
  - [x] Implementar supresión por `deletedAccounts` en `fusionarEstadoContable` en `assets/js/financeCalculations.js`.
  - [x] Ejecutar `node --test tests/accounts.test.js tests/sync-merge.test.js` y verificar éxito (Green).

- [x] **Fase 3: Persistencia y Adaptador Remoto**
  - [x] Añadir clave `DELETED_ACCOUNTS` y métodos `getDeletedAccounts`, `saveDeletedAccounts` en `assets/js/storage.js`.
  - [x] Adaptar `prepareBackupDocument`, `saveRemoteWorkspace` y `syncBidirectional` en `assets/js/dbAdapter.js` para incluir `deletedAccounts`.

- [x] **Fase 4: Capa de Interfaz y Lógica de Aplicación (`assets/js/app.js`)**
  - [x] Inicializar `state.deletedAccounts` en `loadStateFromStorage()`.
  - [x] Implementar función unificada `solicitarEliminarCuentaFinanciera(accountId)`.
  - [x] Agregar botones de Editar y Eliminar en cada tarjeta de cuenta en `renderAccounts()`, con `e.stopPropagation()`.
  - [x] Agregar botones de Editar y Eliminar en la cabecera de `renderAccountDetailView()`.
  - [x] Habilitar botón de eliminar en cuentas financieras en `renderChartOfAccounts()` conectándolo a `solicitarEliminarCuentaFinanciera`.
  - [x] Si se crea una cuenta nueva, asegurar que su ID no permanezca en `deletedAccounts`.

- [x] **Fase 5: Verificación Global y Cierre**
  - [x] Ejecutar suite completa con `node --test tests/*.test.js` (verificar 100% verde sin regresiones - 80/80 tests).
  - [x] Actualizar `memory.md` (Sección 1, 2 y 3).
  - [ ] Realizar commit y push a GitHub (`main`).

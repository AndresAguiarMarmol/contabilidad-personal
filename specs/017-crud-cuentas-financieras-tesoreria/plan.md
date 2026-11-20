# Plan de Implementación — Spec 017: CRUD Cuentas Financieras (Tesorería)

## Arquitectura y Capas Afectadas

### 1. Capa de Cálculo Puro e Inmutabilidad (`assets/js/financeCalculations.js`)
- **Función pura de purga:**
  `Calculations.purgarMovimientosDeCuenta(accountId, transactions)`:
  Filtra inmutablemente todas las transacciones donde:
  - `tx.accountId === accountId`
  - `tx.toAccountId === accountId`
  - `tx.isSplit && tx.splitLines.some(l => l.targetAccountId === accountId)`
- **Ampliación de `Calculations.fusionarEstadoContable(localState, remoteState)`:**
  - Extraer y unificar lápidas de cuentas eliminadas:
    ```javascript
    const localDeletedAccs = Array.isArray(local.deletedAccounts) ? local.deletedAccounts : [];
    const remoteDeletedAccs = Array.isArray(remote.deletedAccounts) ? remote.deletedAccounts : [];
    const deletedAccsSet = new Set([...localDeletedAccs, ...remoteDeletedAccs]);
    ```
  - Al procesar cuentas financieras (`accMap`):
    Omitir cualquier cuenta cuyo `acc.id` esté en `deletedAccsSet`.
  - Incluir en el estado retornado:
    `deletedAccounts: Array.from(deletedAccsSet)`

### 2. Capa de Persistencia Local (`assets/js/storage.js`)
- Añadir constante clave de localStorage:
  `DELETED_ACCOUNTS: "finance_deleted_accounts_data"`
- Implementar métodos:
  - `Storage.getDeletedAccounts()`: retorna array desde localStorage con fallback `[]`.
  - `Storage.saveDeletedAccounts(deletedAccounts)`: persiste array en localStorage.

### 3. Capa de Base de Datos y Sincronización Remota (`assets/js/dbAdapter.js`)
- En `prepareBackupDocument()`:
  Añadir `deletedAccounts: Storage.getDeletedAccounts()` en el payload.
- En `saveRemoteWorkspace()`:
  Guardar `deletedAccounts` en el documento `workspaces/main`.
- En `syncBidirectional()`:
  Incluir `deletedAccounts: Storage.getDeletedAccounts()` en `localState`.
  Guardar el resultado fusionado `merged.deletedAccounts` en `Storage.saveDeletedAccounts()`.

### 4. Capa de Interfaz de Usuario y Flujo de Interacción (`assets/js/app.js`)
- **Renderizado de tarjetas en `renderAccounts()`:**
  - Agregar botones "Editar" (`btn-edit-account-card`) y "Eliminar" (`btn-delete-account-card`) en el pie o cabecera de cada tarjeta.
  - Añadir listener `click` con `e.stopPropagation()` para evitar navegar al detalle.
- **Renderizado de detalle en `renderAccountDetailView()`:**
  - Añadir en el header del detalle botones para "Editar Cuenta" y "Eliminar Cuenta".
- **Habilitación en Plan de Cuentas (`renderChartOfAccounts()`):**
  - Quitar la restricción `!acc.financialAccountId` que ocultaba el botón de eliminar.
  - Si es cuenta financiera, disparar el handler unificado `solicitarEliminarCuentaFinanciera(acc.id)`.
- **Controlador Unificado `solicitarEliminarCuentaFinanciera(accountId)`:**
  - Validar si `state.accounts.length <= 1`: abortar con toast de advertencia.
  - Consultar `Calculations.puedeEliminarCuenta(accountId, state.transactions)`.
  - Si hay movimientos:
    Confirmar con diálogo detallado:
    `"Esta cuenta tiene ${resumen.cantidadMovimientos} movimientos asociados.\n¿Deseas eliminar la cuenta junto con todos sus movimientos?"`
  - Si confirma:
    - Purgar movimientos usando `Calculations.purgarMovimientosDeCuenta(accountId, state.transactions)`.
    - Eliminar cuenta de `state.accounts`.
    - Registrar `accountId` en `state.deletedAccounts` y persistir vía `Storage.saveDeletedAccounts()`.
    - Persistir cuentas y transacciones (`Storage.saveAccounts`, `Storage.saveTransactions`).
    - Recalcular `state.accounts` balances con `Calculations.calcularBalanceMes()`.
    - Si la cuenta eliminada era la seleccionada en detalle, retornar a la lista de cuentas.
    - Disparar `DbAdapter.syncBidirectional()`.
    - Mostrar toast de éxito y re-renderizar vistas.

---

## Estrategia de Pruebas (TDD)
1. **`tests/accounts.test.js`:**
   - Probar `Calculations.purgarMovimientosDeCuenta`:
     - Elimina transacciones donde la cuenta es origen.
     - Elimina transacciones donde la cuenta es destino de transferencia.
     - Elimina transacciones donde la cuenta es receptora de una línea de split.
     - Mantiene intactas transacciones no vinculadas.
2. **`tests/sync-merge.test.js`:**
   - Probar que `Calculations.fusionarEstadoContable`:
     - Elimina cuentas presentes en `deletedAccounts` locales.
     - Elimina cuentas presentes en `deletedAccounts` remotas.
     - Retorna array unificado `deletedAccounts` sin duplicados.

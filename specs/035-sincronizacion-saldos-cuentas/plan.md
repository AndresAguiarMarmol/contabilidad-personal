# Plan de Implementación — Spec 035

## Fase 1: Pruebas Unitarias TDD Red (`tests/account-balance-sync.test.js`)
1. Probar que `crearCuentaObjeto` incluye `updatedAt`.
2. Probar que `fusionarEstadoContable` adopta la cuenta remota cuando `remoteAcc.updatedAt > localAcc.updatedAt`.
3. Probar que `fusionarEstadoContable` adopta la cuenta local cuando `localAcc.updatedAt > remoteAcc.updatedAt`.
4. Probar que `fusionarEstadoContable` adopta el saldo remoto cuando la cuenta remota tiene `updatedAt` y la local carece de él (migración legacy).
5. Probar que `fusionarEstadoContable` recalcula `currentBalance` correctamente a partir del saldo inicial resuelto y las transacciones.
6. Probar que `fusionarEstadoContable` establece `hasChangesFromRemote = true` cuando se actualiza el saldo o atributos de una cuenta existente sin agregar cuentas nuevas.

## Fase 2: Implementación en Lógica Pura (`assets/js/financeCalculations.js`)
1. Actualizar `crearCuentaObjeto` para incorporar `updatedAt: datos.updatedAt || new Date().toISOString()`.
2. Modificar la sección 2 (cuentas) de `fusionarEstadoContable` para comparar `updatedAt` con fallback a `remoteState.updatedAt` y resolución de saldos.
3. Incorporar bandera `hasAccountsUpdated` en el cálculo de `hasChangesFromRemote`.
4. Aplicar lógica análoga para transacciones, presupuestos y metas cuando exista `updatedAt`.

## Fase 3: Integración en Interfaz (`assets/js/app.js` y `assets/js/dbAdapter.js`)
1. En `openAccountEditModal` (`#form-edit-account`), asignar `account.updatedAt = new Date().toISOString()`.
2. En `openTransactionModal`, asignar `tx.updatedAt = new Date().toISOString()`.
3. En `DbAdapter.syncBidirectional`, asegurar mensajes descriptivos al actualizar saldos.
4. En `triggerAutoSync`, asegurar refresco completo de la UI.

## Fase 4: Verificación y Despliegue
1. Ejecutar `node --test tests/account-balance-sync.test.js`.
2. Ejecutar la suite completa `node --test tests/*.test.js`.
3. Incrementar versión de Service Worker a `contapersonal-v18`.
4. Actualizar `memory.md` y sincronizar en Git.

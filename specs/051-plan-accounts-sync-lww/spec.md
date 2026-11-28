# Spec 051: Sincronización Bidireccional Determinista del Plan de Cuentas (LWW)

## Estado
Aprobado por el usuario (Andrés) el 28 de Noviembre de 2026.

## Contexto y Diagnóstico
Al renombrar una cuenta del Plan de Cuentas Contable en un dispositivo (ej. teléfono móvil), el cambio no se reflejaba en el PC debido a:
1. En `Calculations.fusionarEstadoContable` (`assets/js/financeCalculations.js`), las cuentas locales del plan tenían prioridad ciega incondicional (`planMap.set(key, { ...p, ...existing })`), lo que causaba que la versión del PC sobreescribiera la versión remota.
2. Los objetos del Plan de Cuentas (`planAccounts`) no tenían asignado un timestamp `updatedAt` para resolver conflictos temporales.
3. No existía la bandera `hasPlanAccountsUpdated` para detectar si cuentas existentes cambiaron de nombre o propiedades durante la sincronización, impidiendo la reactividad en la UI.
4. El guardado en `openPlanAccountModal` llamaba directamente a `DbAdapter.syncBidirectional()` en lugar de utilizar `triggerAutoSync({ notify: false })`.

## Requerimientos (EARS)
1. **[R1 - Marca Temporal `updatedAt`]:** Al crear o modificar una cuenta/subcuenta en el Plan de Cuentas (`openPlanAccountModal`), el objeto DEBE recibir un timestamp ISO `updatedAt: new Date().toISOString()`.
2. **[R2 - Resolución Last-Write-Wins (LWW)]:** En `fusionarEstadoContable`, cuando una cuenta exista tanto en local como en remoto, el sistema DEBE comparar sus marcas temporales `updatedAt` (si alguna no tiene timestamp, se asume 0):
   - Si `remoteTime > localTime`, la versión remota prevalece (adoptando sus atributos actualizados) y se activa `hasPlanAccountsUpdated = true`.
   - Si `localTime >= remoteTime`, la versión local prevalece.
3. **[R3 - Detección de Cambios Remotos]:** La bandera `hasChangesFromRemote` en `fusionarEstadoContable` DEBE incluir `hasPlanAccountsUpdated`, de modo que cualquier cambio de nombre o configuración de cuentas remotas dispare el refresco del catálogo y su almacenamiento local.
4. **[R4 - Disparador de Sincronización]:** `openPlanAccountModal` DEBE utilizar `triggerAutoSync({ notify: false })` para sincronizar en segundo plano de manera no intrusiva y debounced.
5. **[R5 - Unificación de Cuenta 5.1.01]:** La cuenta `5.1.01` DEBE adoptar el nombre canónico `"Alquileres, Gastos Comunes, Jardinería, Reparaciones"` con timestamp actualizado para garantizar coherencia exacta entre todos los dispositivos (móvil y PC).

## Casos de Prueba (TDD)
- `fusionarEstadoContable` adopta la cuenta remota cuando `remote.updatedAt` es posterior a `local.updatedAt` y marca `hasPlanAccountsUpdated = true`.
- `fusionarEstadoContable` preserva la cuenta local cuando `local.updatedAt` es posterior o igual a `remote.updatedAt`.
- `fusionarEstadoContable` adopta la cuenta remota si la remota tiene `updatedAt` y la local carece de ella (migración heredada).
- La bandera `hasChangesFromRemote` es verdadera cuando solo una cuenta del plan ha sido actualizada de forma remota.
- Manejo correcto de cuentas eliminadas (`deletedPlanAccounts`) manteniéndose excluidas sin importar timestamps.

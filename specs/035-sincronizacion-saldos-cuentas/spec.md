# Especificación — Spec 035: Sincronización Multi-Dispositivo con Precedencia de Actualización y Replicación Íntegra de Saldos de Cuentas

## Contexto del Problema
Cuando un usuario actualiza los saldos de sus cuentas financieras (mediante el modal de edición de cuenta / saldo inicial o mediante la creación/ajuste de cuentas) en un dispositivo (ej. PC o teléfono A), los cambios se guardan localmente y se transmiten a Cloud Firestore (`workspaces/{uid}`). Sin embargo, al abrir o sincronizar un segundo dispositivo (ej. iPhone o PC B), las cuentas en dicho segundo dispositivo no reflejan los nuevos saldos o mantienen sus saldos locales antiguos.

### Causa Raíz
1. Las cuentas financieras (`Account`) carecían de una marca de tiempo de modificación (`updatedAt`).
2. En `Calculations.fusionarEstadoContable(localState, remoteState)`, al coincidir una cuenta local (`existing`) y una remota (`a`), se aplicaba una prioridad local incondicional:
   `initialBalance: existing.initialBalance ?? a.initialBalance`
   con `{ ...a, ...existing }`, provocando que el dispositivo receptor conservara su saldo antiguo local e ignorara la actualización proveniente de la nube.
3. Posteriormente, el dispositivo receptor subía su estado fusionado a Firestore, sobreescribiendo en la nube el saldo nuevo con el saldo antiguo.
4. `hasChangesFromRemote` solo consideraba adición de cuentas nuevas (`mergedAccounts.length > localAccs.length`), omitiendo actualizaciones de saldo o atributos en cuentas existentes.

---

## Requisitos Funcionales (Sintaxis EARS)

### RF-1: Estampado Temporal en Cuentas y Entidades (`updatedAt`)
- **Ubicuidad:** El sistema SHALL incorporar la propiedad `updatedAt` (cadena ISO 8601) en cada objeto `Account` al crearlo (`crearCuentaObjeto`) o al modificarlo (`openAccountEditModal`).
- **Ubicuidad:** Las transacciones (`Transaction`), presupuestos (`Budget`) y metas (`SavingsGoal`) SHALL incorporar o actualizar `updatedAt` al crearse o modificarse.

### RF-2: Fusión Basada en Precedencia Temporal (Last-Write-Wins / LWW)
- **Cuando:** `fusionarEstadoContable` encuentre una cuenta presente tanto en el estado local como en el remoto:
  - **Si:** `remoteAcc.updatedAt` es posterior a `localAcc.updatedAt` (o la cuenta remota tiene `updatedAt` y la local no):
    - El sistema SHALL adoptar los atributos y el saldo inicial de la cuenta remota (`{ ...localAcc, ...remoteAcc }`).
  - **Si:** `localAcc.updatedAt` es posterior a `remoteAcc.updatedAt`:
    - El sistema SHALL preservar los atributos y el saldo inicial de la cuenta local (`{ ...remoteAcc, ...localAcc }`).
  - **Si:** Ambas marcas temporales son inexistentes o iguales pero los saldos difieren (`remoteAcc.initialBalance !== localAcc.initialBalance`):
    - El sistema SHALL adoptar el saldo inicial remoto actualizado si `remoteState.updatedAt` indica sincronización reciente en la nube, garantizando que los dispositivos secundarios se actualicen.

### RF-3: Recálculo Determinista y Detección Exhaustiva de Cambios
- **Ubicuidad:** El sistema SHALL recalcular el balance actual (`currentBalance`) de cada cuenta fusionada a partir de su saldo inicial resuelto y el conjunto de transacciones fusionadas mediante `recalcularBalancesCuentas`.
- **Ubicuidad:** El sistema SHALL marcar `hasChangesFromRemote = true` siempre que al menos una cuenta existente haya actualizado su saldo inicial, balance actual o atributos desde la versión remota (`hasAccountsUpdated = true`).
- **Ubicuidad:** `DbAdapter.syncBidirectional` SHALL informar en su mensaje que los saldos y cuentas fueron actualizados desde la nube.

### RF-4: Sincronización Inmediata y Reactiva en UI
- **Cuando:** `triggerAutoSync` finalice con `hasChangesFromRemote = true`:
  - El sistema SHALL actualizar el estado en memoria (`state.accounts`), persistir en `Storage`, re-renderizar la vista activa (`renderActiveView()`) y emitir un toast confirmando la sincronización exitosa de los saldos.

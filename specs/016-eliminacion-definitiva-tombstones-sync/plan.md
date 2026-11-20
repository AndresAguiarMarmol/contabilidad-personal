# plan.md — Plan Técnico: Eliminación Definitiva de Cuentas Contables y Prevención de Resurrección en la Sincronización

**Versión:** 1.0.0  
**Fecha:** 2026-11-19  
**Cobertura:** RF-1, RF-2, RF-3, RF-4, RF-5, RF-6  

---

## 1. Arquitectura de Lápidas (Tombstones) en Sincronización

```
[Acción: Eliminar Subcuenta 1.1.02.02]
          │
          ├──> 1. Remover de state.planAccounts
          ├──> 2. Agregar código e ID a state.deletedPlanAccounts
          ├──> 3. Persistir en localStorage (Storage.saveDeletedPlanAccounts)
          └──> 4. Disparar DbAdapter.syncBidirectional()
                      │
                      ▼
     Calculations.fusionarEstadoContable(localState, remoteState)
                      │
                      ├──> Unificar: mergedDeleted = Union(localDeleted, remoteDeleted)
                      ├──> Al iterar planAccounts (local y remoto):
                      │       IF (mergedDeleted.has(code) OR mergedDeleted.has(id))
                      │           -> DESCARTAR (No resucitar)
                      │       ELSE
                      │           -> Precedencia local { ...remoto, ...local }
                      │
                      └──> mergedState = { planAccounts: cleanList, deletedPlanAccounts: mergedDeleted }
                                │
                                ├──> Guardar en localStorage limpio
                                └──> Guardar en Firestore workspaces/main
```

---

## 2. Componentes Afectados y Modificaciones Técnicas

### 2.1. `assets/js/financeCalculations.js` (RF-2 y RF-6)
- En `fusionarEstadoContable(localState, remoteState)`:
  - Extraer `localDeletedPlan = localState?.deletedPlanAccounts || []`, `remoteDeletedPlan = remoteState?.deletedPlanAccounts || []`.
  - Crear `Set` de eliminados: `deletedPlanSet = new Set([...localDeletedPlan, ...remoteDeletedPlan])`.
  - Mismo proceso para `deletedBudgets` y `deletedGoals`.
  - Al poblar `planMap`, `budgetMap` y `goalMap`: omitir elementos eliminados y dar precedencia local en atributos `{ ...remoto, ...local }`.
  - En `accMap`: aplicar `{ ...a, ...existing, initialBalance: existing.initialBalance ?? a.initialBalance }`.
  - En `obtenerCatalogoPlanCuentas`: sincronizar `catalogo[existingIdx].name = acc.name`.
  - Retornar listas unificadas en `mergedState`.

### 2.2. `assets/js/storage.js` (RF-1 y RF-4)
- Nuevas claves en `STORAGE_KEYS`:
  - `DELETED_PLAN_ACCOUNTS: "finance_deleted_plan_accounts_data"`
  - `DELETED_BUDGETS: "finance_deleted_budgets_data"`
  - `DELETED_GOALS: "finance_deleted_goals_data"`
- Métodos auxiliares: `getDeleted...()`, `saveDeleted...()`.

### 2.3. `assets/js/dbAdapter.js` (RF-3)
- En `syncBidirectional()`:
  - Inyectar en `localState` las listas de eliminados.
  - Al recibir `mergedState`: guardar en `Storage` las listas unificadas.
- En `prepareBackupDocument()` y `saveRemoteWorkspace()`:
  - Serializar `deletedPlanAccounts`, `deletedBudgets`, `deletedGoals` dentro de `workspaces/main`.

### 2.4. `assets/js/app.js` (RF-1, RF-3 y RF-5)
- En `loadStateFromStorage()` y `triggerAutoSync()`: cargar y mantener sincronizadas las listas de eliminados.
- En `btn-delete-plan-account`: registrar el código e ID en `state.deletedPlanAccounts`, guardar en Storage y disparar de inmediato `DbAdapter.syncBidirectional()`.
- En `btn-delete-budget` y `btn-delete-goal`: registrar la eliminación y disparar `syncBidirectional()`.
- En `openPlanAccountModal` (Submit): retirar el código de `state.deletedPlanAccounts` si el usuario vuelve a crear una cuenta con ese código (RF-5).

---

## 3. Estrategia de Pruebas TDD (`tests/sync-merge.test.js`)

1. **RF-2:** Fusión con una subcuenta presente en `remoteState` pero cuyo código está en `localState.deletedPlanAccounts`. Resultado: la subcuenta NO debe estar en `mergedState.planAccounts`.
2. **RF-2:** Fusión donde `remoteState.deletedPlanAccounts` contiene una subcuenta presente en `localState`. Resultado: la subcuenta es purgada de `mergedState.planAccounts`.
3. **RF-2:** Fusión con presupuesto y meta en lista de eliminados. Resultado: se suprimen de `mergedState.budgets` y `mergedState.goals`.
4. **RF-6:** Cuenta modificada localmente mantiene su nombre y color frente a la versión remota desactualizada.
5. **RF-6:** Catálogo contable refleja el nombre actualizado de la cuenta financiera vinculada.

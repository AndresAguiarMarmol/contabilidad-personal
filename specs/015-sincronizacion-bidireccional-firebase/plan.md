# Plan de Arquitectura Técnica — Spec 015

## 1. Estrategia de Sincronización Multi-Dispositivo
Para sincronizar en tiempo real entre PC, iPhone y otros dispositivos sin bundlers pesados y bajo API REST de Firestore:

### A. Ubicación en Firestore
- Documento: `workspaces/main` (o `workspace/main`)
- Estructura del documento Firestore:
  ```json
  {
    "fields": {
      "updatedAt": { "stringValue": "2026-11-18T11:20:00.000Z" },
      "accounts": { "arrayValue": { "values": [...] } },
      "transactions": { "arrayValue": { "values": [...] } },
      "budgets": { "arrayValue": { "values": [...] } },
      "goals": { "arrayValue": { "values": [...] } },
      "planAccounts": { "arrayValue": { "values": [...] } }
    }
  }
  ```

### B. Algoritmo de Fusión Bidireccional (`fusionarEstadoContable`)
```text
Entrada: localState { accounts, transactions, budgets, goals, planAccounts },
         remoteState { accounts, transactions, budgets, goals, planAccounts }

1. Transacciones:
   - Crear un Map con las transacciones locales y remotas indexadas por id.
   - Ordenar cronológicamente por fecha descendente.
   - Conteo de elementos agregados desde el remoto para notificar al usuario.

2. Cuentas:
   - Unir cuentas por id (preservando configuraciones de color, icono, etc.).
   - Recalcular `currentBalance` de cada cuenta sumando su `initialBalance` y todos los movimientos netos aplicados de las transacciones consolidadas.

3. Presupuestos y Metas:
   - Unir por id, priorizando la versión con mayor fecha o progreso.

4. Plan de Cuentas:
   - Unir subcuentas y cuentas personalizadas por código e id.

Salida: {
  mergedState: { accounts, transactions, budgets, goals, planAccounts },
  hasChangesFromRemote: boolean,
  newTransactionsCount: number
}
```

### C. Ciclo de Vida del Auto-Sync en `app.js`
1. **Inicio de la aplicación (`startApp`):**
   - Cargar `localStorage` (cero delay).
   - Si `DbAdapter.getProvider() === "firebase"` -> llamar `triggerAutoSync(true)`.
2. **Tras cada mutación:**
   - `saveTransaction` -> tras guardar local, `triggerAutoSync(false)`.
   - `saveAccount`, `saveBudget`, `saveGoal`, `savePlanAccount` -> tras guardar local, `triggerAutoSync(false)`.
3. **Al retomar la aplicación:**
   - Evento `document.addEventListener("visibilitychange")` -> si `document.visibilityState === "visible"`, ejecutar `triggerAutoSync(false)`.

---

## 2. Plan de Pruebas TDD (`tests/sync-merge.test.js`)
- Caso 1: Fusión de transacciones de PC y de iPhone sin pérdida de datos ni duplicación.
- Caso 2: Recálculo contable exacto del balance de cuenta tras fusionar transacciones cruzadas.
- Caso 3: Preservación de cuentas nuevas creadas en cualquiera de los dispositivos.
- Caso 4: Detección precisa de `newTransactionsCount` y `hasChangesFromRemote`.
- Caso 5: Manejo defensivo ante estados remotos vacíos o nulos.

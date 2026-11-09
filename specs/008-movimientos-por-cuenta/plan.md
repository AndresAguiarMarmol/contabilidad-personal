# Plan Técnico — Spec 008 (Movimientos por Cuenta Seleccionada)

## 1. Arquitectura y Módulos Afectados

### Archivos Afectados:
1. `assets/js/financeCalculations.js`:
   - `obtenerMovimientosDeCuenta(transactions, accountId)`: Función pura que filtra todas las transacciones que involucren a `accountId` (como cuenta pagadora `accountId`, receptora `toAccountId` en transferencias, o destinataria de partidas en `splitLines`).
   - `calcularResumenCuenta(transactions, accountId)`: Función pura que calcula el total de ingresos/abonos, total de gastos/cargos, balance neto del historial y cantidad de movimientos de la cuenta.
2. `tests/account-details.test.js`:
   - Pruebas unitarias completas con `node --test` para validar `obtenerMovimientosDeCuenta` y `calcularResumenCuenta` (incluyendo transferencias y partidas split).
3. `index.html`:
   - Incorporar contenedor `#account-detail-panel` debajo de `#accounts-grid` en la sección `view-accounts`.
4. `assets/js/app.js`:
   - Variable de estado `state.selectedAccountId = null;`.
   - Modificar `renderAccounts()` para:
     - Asignar atributo `data-account-id="${acc.id}"` y clases interactivas (cursor-pointer, transición hover, borde activo si `state.selectedAccountId === acc.id`).
     - Renderizar o actualizar `#account-detail-panel` con los movimientos filtrados y KPIs de la cuenta seleccionada.
     - Vincular eventos de clic en las tarjetas de cuenta para alternar la selección (`toggle`).
     - Vincular evento en el botón de cerrar del panel para deseleccionar.

---

## 2. Lógica Pura y Algoritmos (`financeCalculations.js`)

### `obtenerMovimientosDeCuenta(transactions, accountId)`:
```javascript
function obtenerMovimientosDeCuenta(transactions, accountId) {
  if (!Array.isArray(transactions) || !accountId) return [];
  return transactions.filter(tx => {
    if (tx.accountId === accountId) return true;
    if (tx.toAccountId === accountId) return true;
    if (Boolean(tx.isSplit && Array.isArray(tx.splitLines))) {
      return tx.splitLines.some(line => line.targetAccountId === accountId);
    }
    return false;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}
```

### `calcularResumenCuenta(transactions, accountId)`:
Calcula el impacto neto para la cuenta en particular:
- Si es `income` y `accountId === tx.accountId`: abono (+).
- Si es `expense` y `accountId === tx.accountId`: cargo (-).
- Si es `transfer`:
  - Si `tx.accountId === accountId`: egreso/salida (-).
  - Si `tx.toAccountId === accountId`: ingreso/entrada (+).
- Si es `split`:
  - Si `tx.accountId === accountId`: cargo por el monto total (-).
  - Si `line.targetAccountId === accountId`: abono por el monto de la partida (+).

---

## 3. Decisiones Técnicas y Alternativas Descartadas

- **Decisión:** Renderizar el detalle de movimientos directamente en `view-accounts` debajo de las tarjetas.
  - *Alternativa descartada:* Redirigir a la vista `view-transactions` con un filtro.
  - *Motivo:* El usuario solicitó explícitamente "en las Cuentas & Billeteras, al seleccionar una cuenta, muestra los movimientos asociados a esta". Mantener la interacción en la misma vista evita perder el contexto de las demás cuentas y permite inspeccionar varias cuentas consecutivamente con un solo clic.

---

## 4. Trazabilidad con Requisitos Funcionales (EARS)
- **RF-1:** Selección interactiva y resaltado visual -> `app.js` (`renderAccounts`).
- **RF-2:** Panel de detalle con métricas y lista de transacciones -> `app.js` (`renderAccountDetailPanel`).
- **RF-3:** Inclusión de partidas de movimientos split -> `obtenerMovimientosDeCuenta` y renderizado de desglose.
- **RF-4:** Estado vacío amigable cuando no hay transacciones -> contenedor condicional con botón de acción rápida.
- **RF-5:** Botón de cerrar y deselección -> `app.js`.
- **RF-6:** Funciones puras desacopladas -> `financeCalculations.js` y `tests/account-details.test.js`.


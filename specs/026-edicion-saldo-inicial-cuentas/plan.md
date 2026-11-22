# Plan Técnico — Spec 026: Edición de Saldo Inicial en Cuentas Financieras

**Estado:** Aprobado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Arquitectura y Responsabilidades de Módulos

El objetivo técnico de esta especificación es permitir que los usuarios modifiquen el `initialBalance` de cualquier cuenta financiera desde el modal de edición (`openAccountEditModal`), asegurando que su `currentBalance` se recalcule de forma atómica y determinista a través de `recalcularBalancesCuentas(cuentas, transacciones)`.

```
┌────────────────────────────────────────────────────────┐
│ UI (assets/js/app.js)                                  │
│ - Modal de edición (#form-edit-account)                │
│ - Campo precargado #acc-edit-input-balance             │
│ - Invocación a normalizar y recalcular                 │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│ Cálculos Puros (assets/js/financeCalculations.js)      │
│ - validarEdicionCuenta(datos, cuentas, id)             │
│ - normalizarSaldoInicialCuenta(tipo, initialBalance)   │
│ - recalcularBalancesCuentas(cuentas, transacciones)    │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│ Persistencia & Sync (assets/js/storage.js & dbAdapter) │
│ - Guardado en LocalStorage (aislado por UID)           │
│ - Sincronización en la nube (Firestore workspaces/{uid})│
└────────────────────────────────────────────────────────┘
```

### Módulos Involucrados:
1. `assets/js/financeCalculations.js`:
   - Extender `validarEdicionCuenta` para verificar que `initialBalance` (si es provisto) sea un número finito y válido.
   - Implementar y exportar la función pura `normalizarSaldoInicialCuenta(type, initialBalance)` que aplica la regla contable de convertir importes positivos a negativos en cuentas de tipo `"credit_card"`.
2. `assets/js/app.js`:
   - Incorporar en `openAccountEditModal(accountId)` el campo HTML `#acc-edit-input-balance` con el valor actual de `account.initialBalance || 0`.
   - En el submit del formulario:
     - Extraer y validar el nuevo saldo inicial.
     - Normalizar mediante `normalizarSaldoInicialCuenta(typeVal, balanceVal)`.
     - Asignar `account.initialBalance = nuevoSaldo`.
     - Recalcular deterministamente los saldos de todas las cuentas con `recalcularBalancesCuentas(state.accounts, state.transactions)`.
     - Persistir en `Storage.saveAccounts` y disparar auto-sync con Firebase.
     - Refrescar la vista activa (`renderActiveView()`).
3. `sw.js`:
   - Incrementar la versión de cache a `contapersonal-v9`.

---

## 2. Decisiones Técnicas y Alternativas Descartadas

- **Decisión:** Reutilizar `recalcularBalancesCuentas` para actualizar el `currentBalance` tras editar el `initialBalance`.
  - *Alternativa descartada:* Sumar la diferencia entre el saldo inicial anterior y el nuevo (`delta = nuevo - anterior; currentBalance += delta`). Descartada porque los cálculos incrementales acumulan errores de redondeo o inconsistencias si existieron transferencias multidivisa o splits desbalanceados.
- **Decisión:** Regla de conversión de pasivo en `normalizarSaldoInicialCuenta`.
  - *Alternativa descartada:* Permitir saldos positivos en tarjetas de crédito como deuda. Descartada porque viola la convención contable del sistema donde el saldo adeudado de pasivos se almacena como número negativo.

---

## 3. Trazabilidad de Requisitos

| Requisito Funcional | Componente / Función | Verificación en Tests |
| :--- | :--- | :--- |
| **RF-1:** Visualización en Edición | `app.js` (`openAccountEditModal`) | Inspección DOM modal |
| **RF-2:** Validación de Saldo Inicial | `financeCalculations.js` (`validarEdicionCuenta`) | `tests/account-initial-balance-edit.test.js` |
| **RF-3:** Recálculo Determinista | `recalcularBalancesCuentas` | `tests/account-initial-balance-edit.test.js` |
| **RF-4:** Tratamiento Tarjeta Crédito | `normalizarSaldoInicialCuenta` | `tests/account-initial-balance-edit.test.js` |
| **RF-5:** Persistencia y UI | `app.js`, `Storage`, `DbAdapter` | Suite global + test de persistencia |

---

## 4. Estrategia de Pruebas Unitarias (TDD Red-Green)

Archivo: `tests/account-initial-balance-edit.test.js` ejecutado con `node --test`:
1. `validarEdicionCuenta` valida correctamente números finitos y rechaza valores vacíos o no numéricos.
2. `normalizarSaldoInicialCuenta` preserva saldos en activos (banco, efectivo, ahorros) y convierte números positivos a negativos en tarjetas de crédito.
3. `recalcularBalancesCuentas` recalcula con exactitud una cuenta sin movimientos al cambiar su saldo inicial.
4. `recalcularBalancesCuentas` recalcula con exactitud una cuenta con historial mixto (gastos, ingresos, transferencias) al cambiar su saldo inicial.
5. Edición y recálculo mantienen cuadratura contable y compatibilidad completa con el catálogo contable del Plan de Cuentas.

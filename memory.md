# memory.md — Memoria del proyecto

Registro de todo lo que debe preservarse entre sesiones de trabajo: arquitectura de datos, decisiones técnicas tomadas e historial de cambios.
**Los agentes deben leer este archivo antes de empezar y actualizarlo al terminar cada tarea** (ver `AGENTS.md`).

---

## 1. Estructura de datos y persistencia

### A. Persistencia en `localStorage` (Modo Offline / Local por defecto)
- **Clave:** `finance_accounts_data`
  - Array de objetos `Account`: `id`, `name`, `type` (`"bank"` | `"cash"` | `"wallet"` | `"savings"` | `"credit_card"`), `initialBalance`, `currentBalance`, `currency`, `color`, `icon`, `isExcludedFromTotal`.
- **Clave:** `finance_transactions_data`
  - Array de objetos `Transaction`: `id`, `date`, `type` (`"income"` | `"expense"` | `"transfer"`), `accountId`, `toAccountId`, `category`, `amount`, `description`, `paymentMethod`, `isRecurring`, `isSplit` (booleano opcional), `splitLines` (array de partidas: `{ id, description, amount, category, targetAccountId }`).
- **Clave:** `finance_budgets_data`
  - Array de objetos `Budget`: `id`, `category`, `limitAmount`, `spentAmount`, `month`.
- **Clave:** `finance_goals_data`
  - Array de objetos `SavingsGoal`: `id`, `title`, `targetAmount`, `currentAmount`, `deadlineDate`, `color`.
- **Clave:** `finance_theme`
  - Valores: `"dark"` | `"light"`. Gestiona el modo de color persistido en `<html>`.
- **Clave:** `finance_remote_db_config`
  - Objeto con `provider` (`"supabase"` | `"none"`), `url`, `anonKey`.

### B. Base de Datos Real en la Nube (Supabase PostgreSQL)
- **Script SQL:** `schema.sql` (tablas: `accounts`, `categories`, `transactions`, `budgets`, `savings_goals`).
- **Adaptador:** `assets/js/dbAdapter.js` universal compatible con navegador y pruebas.

---

## 2. Decisiones vigentes

- **Movimientos Divididos (Split Transactions):** Permite desglosar un pago global (ej. tarjeta de crédito) en múltiples partidas que afectan de forma atómica a diferentes cuentas patrimoniales/activos o categorías de gasto. Aplica principio de cuadratura contable estricta en tiempo real ($\sum \text{líneas} = \text{monto total}$). Bloquea guardado ante descuadres numéricos o montos no positivos. Las funciones puras `validarMovimientoSplit()` y `aplicarMovimientoSplitEnCuentas()` garantizan inmutabilidad y atomicidad.
- **Planilla Interactiva de Nuevas Cuentas Financieras:** Implementada dentro del `<dialog id="app-modal">` nativo. Permite dar de alta cuentas de tipo Banco, Efectivo, Billetera Digital, Ahorro/Inversión y Tarjeta de Crédito, asignando color, icono y moneda. Si es tarjeta de crédito con saldo positivo ingresado, se registra automáticamente como deuda contable negativa.
- **Planilla Interactiva de Nuevos Movimientos:** Implementada en `<dialog id="app-modal">` nativo. Conmutación reactiva entre Gasto, Ingreso y Transferencia. Integra de inmediato cualquier cuenta nueva creada y soporta modo Split.
- **Validación e Inmutabilidad (`financeCalculations.js`):** Funciones puras `validarNuevaCuenta()`, `crearCuentaObjeto()`, `validarTransaccion()`, `aplicarTransaccionEnCuentas()`, `validarMovimientoSplit()` y `aplicarMovimientoSplitEnCuentas()` probadas con `node --test` (25/25 pruebas en verde).
- **Arranque Universal sin CORS:** Scripts universales bajo `window.ContaPersonal` y orden de carga secuencial en `index.html` (compatible con `file:///` y HTTP).
- **Enfoque Exclusivo:** Contabilidad y Finanzas Personales/Familiares (sin inventario comercial ni pedidos).

---

## 3. Historial de cambios

- **2026-11-09 — Spec 004: Movimientos Divididos (Split) con Afectación Multicuenta (SDD):**
  - Creada especificación formal `specs/004-movimientos-split/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Diseñada e implementada la suite `tests/split-transactions.test.js` con metodología TDD Red-Green (9 pruebas unitarias, 25/25 pruebas totales en verde en el proyecto).
  - Implementadas en `assets/js/financeCalculations.js` las funciones puras `validarMovimientoSplit()` y `aplicarMovimientoSplitEnCuentas()`, y adaptado `calcularBalanceMes()` para el cálculo granular por partidas.
  - Desarrollada la interfaz reactiva en la planilla de Nuevo Movimiento (`assets/js/app.js`): toggle Split, repetidor dinámico de partidas, selectores mixtos (Cuentas Receptores/Activos y Categorías), botones de añadir/eliminar partida (mínimo 2) y barra de cuadratura en tiempo real.
  - Actualizado el historial de movimientos y dashboard para visualizar el badge 'Split (N)' y el desglose de cada partida.
  - Verificado en el navegador mediante Chrome DevTools con el caso real de compra con tarjeta de crédito de $1.000.000 (Aspiradora $80.000 para 'Activos del Hogar' y Televisor $920.000 para 'Electrónica y Computación'), con actualización atómica de saldos y 0 errores de consola.
- **2026-11-09 — Spec 003: Planilla y Creación de Nuevas Cuentas Financieras (SDD):**
  - Creada especificación formal `specs/003-crear-cuenta-financiera/` (`spec.md` en EARS, `plan.md`, `tasks.md`).
  - Implementadas en `assets/js/financeCalculations.js` las funciones puras `validarNuevaCuenta()` y `crearCuentaObjeto()`.
  - Creada suite `tests/accounts.test.js` con 5 pruebas unitarias (16 pruebas totales en verde en el proyecto).
  - Diseñada e implementada la planilla interactiva completa en `assets/js/app.js` con selectores de tipo, saldo inicial, color identificador, moneda y exclusión de patrimonio.
  - Conectada al botón "+ Nueva Cuenta", actualizando de forma reactiva la cuadrícula de cuentas, el Dashboard y haciéndola disponible de inmediato en la planilla de Nuevos Movimientos.
  - Verificada en vivo con Chrome DevTools con 0 errores de consola.
- **2026-11-09 — Spec 002: Planilla de Registro de Nuevos Movimientos (SDD):**
  - Implementada planilla interactiva de ingresos, gastos y transferencias con suite `tests/transactions.test.js`.
- **2026-11-09 — Spec 001: Corrección de Arranque Universal y Resiliencia (SDD):**
  - Creado `docs/constitution.md` y resuelto problema de CORS en `file:///`.
- **2026-11-09:** Refactor integral a Contabilidad Personal pura sin inventario.

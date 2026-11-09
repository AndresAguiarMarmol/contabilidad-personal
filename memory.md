# memory.md — Memoria del proyecto

Registro de todo lo que debe preservarse entre sesiones de trabajo: arquitectura de datos, decisiones técnicas tomadas e historial de cambios.
**Los agentes deben leer este archivo antes de empezar y actualizarlo al terminar cada tarea** (ver `AGENTS.md`).

---

## 1. Estructura de datos y persistencia

### A. Persistencia en `localStorage` (Modo Offline / Local por defecto)
- **Clave:** `finance_accounts_data`
  - Array de objetos `Account`: `id`, `name`, `type` (`"cash"` | `"bank"` | `"credit_card"` | `"wallet"` | `"savings"`), `initialBalance`, `currentBalance`, `currency`, `color`, `icon`, `isExcludedFromTotal`.
- **Clave:** `finance_transactions_data`
  - Array de objetos `Transaction`: `id`, `date`, `type` (`"income"` | `"expense"` | `"transfer"`), `accountId`, `toAccountId`, `category`, `amount`, `description`, `paymentMethod`, `isRecurring`.
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

- **Planilla Interactiva de Nuevos Movimientos:** Implementada dentro del `<dialog id="app-modal">` nativo. Permite conmutar reactivamente entre Gasto, Ingreso y Transferencia, adaptando dinámicamente los selectores de cuenta receptora y categorías.
- **Validación e Impacto Atómico Puro (`financeCalculations.js`):** Funciones puras `validarTransaccion()` y `aplicarTransaccionEnCuentas()` que garantizan la integridad contable sin mutaciones destructivas, verificadas al 100% mediante `node --test`.
- **Arranque Universal sin CORS:** Scripts universales con namespace `window.ContaPersonal` y orden de carga secuencial en `index.html` (compatible con `file:///` y HTTP).
- **Enfoque Exclusivo:** Contabilidad y Finanzas Personales/Familiares (sin inventario comercial ni pedidos).

---

## 3. Historial de cambios

- **2026-11-09 — Spec 002: Planilla de Registro de Nuevos Movimientos (SDD):**
  - Creada especificación formal `specs/002-formulario-nuevo-movimiento/` (`spec.md` en EARS, `plan.md`, `tasks.md`).
  - Implementadas en `assets/js/financeCalculations.js` las funciones puras `validarTransaccion()` y `aplicarTransaccionEnCuentas()`.
  - Creada suite `tests/transactions.test.js` con 7 pruebas unitarias (11 pruebas totales en el proyecto pasando al 100% en verde).
  - Diseñada e implementada la planilla interactiva completa en `assets/js/app.js` con selector de tipo (Gasto / Ingreso / Transferencia), cuentas dinámicas, categorías y persistencia atómica en `Storage`.
  - Verificada en vivo con Chrome DevTools: apertura de modal, conmutación de pestañas, registro exitoso de gasto de \$25.000 con impacto inmediato en el Dashboard y tabla de transacciones.
- **2026-11-09 — Spec 001: Corrección de Arranque Universal y Resiliencia (SDD):**
  - Creado `docs/constitution.md` y resuelto problema de CORS en `file:///`.
- **2026-11-09:** Refactor integral a Contabilidad Personal pura sin inventario.

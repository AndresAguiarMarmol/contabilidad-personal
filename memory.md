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

- **Arranque Universal sin CORS:** Se migró de ES Modules (`type="module"`) a scripts universales con namespace `window.ContaPersonal` y orden de carga secuencial en `index.html`. Esto permite abrir la app directamente con doble clic (`file:///`) sin congelamientos, además de funcionar en servidores HTTP.
- **Lógica Pura Desacoplada (`assets/js/financeCalculations.js`):** Cálculos de patrimonio neto, balances y presupuestos aislados para verificación determinista con `node --test`.
- **Carga Defensiva PWA:** Registro de Service Worker y manifiesto condicionados a `location.protocol.startsWith('http')` para evitar excepciones en entornos locales.
- **Enfoque Exclusivo:** Contabilidad y Finanzas Personales/Familiares (sin inventario comercial ni pedidos).

---

## 3. Historial de cambios

- **2026-11-09 — Spec 001: Corrección de Arranque Universal y Resiliencia (SDD):**
  - Identificada causa raíz de congelamiento: bloqueo de CORS en Chromium para `<script type="module">` y llamadas al Service Worker bajo protocolo `file:///`.
  - Creado `docs/constitution.md` con los 6 principios inviolables del proyecto.
  - Creada especificación formal `specs/001-fix-arranque-app/` (`spec.md` en EARS, `plan.md`, `tasks.md`).
  - Implementado `assets/js/financeCalculations.js` con suite de pruebas `tests/finance.test.js` (4/4 pruebas pasando en verde).
  - Universalizados `mockData.js`, `storage.js`, `dbAdapter.js` y `app.js` bajo `window.ContaPersonal`.
  - Validado en vivo mediante Chrome DevTools (0 errores en consola, renderizado inmediato de \$1.860.000 en patrimonio neto y navegación instantánea).
- **2026-11-09:** Refactor integral a Contabilidad Personal pura sin inventario.
- **2026-11-09:** Limpieza inicial del workspace y definición de requerimientos técnicos.

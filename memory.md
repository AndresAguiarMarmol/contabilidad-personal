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
- **Adaptador:** `assets/js/dbAdapter.js` que permite verificar conectividad y sincronizar datos sin bloquear la UI.

---

## 2. Decisiones vigentes

- **Enfoque Exclusivo:** **Contabilidad y Finanzas Personales/Familiares**. Quedan eliminados todos los conceptos de catálogo comercial, inventario, insumos o pedidos a proveedores.
- **PWA Instalable:** `manifest.json` y `sw.js` configurados para instalación directa en pantallas de inicio de Android/iOS/iPad.
- **Stack:** Full-client SPA modular con Vanilla ES6 (`assets/js/`) y Tailwind CSS vía CDN, sin empaquetadores complejos.
- **Reglas de Integridad Contable Personal:**
  - `income`: Incrementa el saldo de la cuenta personal asociada.
  - `expense`: Decrementa el saldo de la cuenta personal asociada.
  - `transfer`: Decrementa la cuenta origen e incrementa la cuenta destino.
  - $\text{Patrimonio Neto} = \sum(\text{Activos y Ahorros}) - \sum(\text{Deuda de Tarjetas de Crédito})$.

---

## 3. Historial de cambios

- **2026-11-09:** **Corrección arquitectónica integral a Contabilidad Personal Pura:**
  - Eliminados por completo los módulos y datos de inventario, stock e insumos.
  - Reconstruido el Shell Visual con 5 vistas personales: Dashboard Patrimonial, Cuentas & Billeteras, Movimientos, Presupuestos & Metas, y Conexión Supabase/Ajustes.
  - Sincronizados `SPEC.md`, `PROMPT_ANTIGRAVITY_FASE_1.md`, `AGENTS.md`, `index.html`, `mockData.js`, `storage.js`, `dbAdapter.js` y `app.js`.
  - Añadido `manifest.json` y `sw.js` para PWA.
- **2026-11-09:** Limpieza inicial del workspace y definición de requerimientos técnicos.

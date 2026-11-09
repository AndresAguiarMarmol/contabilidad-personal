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

- **Pantalla Adicional de Detalle y Movimientos de Cuenta (`view-account-detail`):** La selección de cualquier cuenta en "Cuentas & Billeteras" navega a una pantalla adicional dedicada dentro del enrutador SPA. La pantalla presenta cabecera completa con identidad de la cuenta (icono, color, tipo, moneda y saldo contable destacado), botón de retorno directo "← Volver a Cuentas & Billeteras", 3 tarjetas KPI acumuladas (Total Abonos, Total Cargos y Conteo de Movimientos), buscador textual y filtro de tipo interno, tabla cronológica con soporte de partidas split e impacto relativo (`+` / `-`), y botón para crear un movimiento preseleccionando dicha cuenta.
- **Respaldo y Restauración Integral JSON:** Permite descargar un backup completo de toda la información contable (cuentas, transacciones split, presupuestos y metas) con versión y timestamp. Validación de integridad mediante la función pura `validarBackupJSON()` antes de sobreescribir `localStorage`, con diálogo de confirmación informando la cantidad exacta de registros a restaurar.
- **Filtros Multidimensionales y Exportación CSV (RFC 4180 con UTF-8 BOM):** Filtrado reactivo en el Libro de Movimientos por búsqueda textual, tipo de transacción, cuenta financiera, categoría y rango de fechas (mes actual, mes anterior, últimos 3 meses o rango personalizado con selectores de fecha). Exportación de los movimientos filtrados a formato CSV estándar con cabecera BOM (`\uFEFF`) para compatibilidad directa con Microsoft Excel, incluyendo el desglose pormenorizado de partidas de movimientos divididos (split).
- **Gestión de Metas de Ahorro Personal:** Implementada en `<dialog id="app-modal">`. Permite crear y editar metas (título, monto objetivo, monto ahorrado inicial, fecha límite y color). Tarjetas interactivas con cálculo de porcentaje, monto faltante o insignia de logro `🏆 ¡Meta Cumplida!`. Modal de aporte rápido `openContributeGoalModal()` para sumar fondos periódicos a una meta. Acciones de edición y eliminación con persistencia en `finance_goals_data`.
- **Gestión de Presupuestos Mensuales por Categoría:** Implementada en `<dialog id="app-modal">`. Permite crear y editar límites mensuales por categoría, detectando en tiempo real el gasto del mes desde las transacciones (estándar y partidas split). Semáforos visuales de alerta: verde ($\le 75\%$), amarillo ($76\% - 100\%$) y rojo ($> 100\%$ sobregiro). Acciones de edición de límite y eliminación con persistencia en `finance_budgets_data`.
- **Movimientos Divididos (Split Transactions):** Permite desglosar un pago global (ej. tarjeta de crédito) en múltiples partidas que afectan de forma atómica a diferentes cuentas patrimoniales/activos o categorías de gasto. Aplica principio de cuadratura contable estricta en tiempo real ($\sum \text{líneas} = \text{monto total}$). Bloquea guardado ante descuadres numéricos o montos no positivos. Las funciones puras `validarMovimientoSplit()` y `aplicarMovimientoSplitEnCuentas()` garantizan inmutabilidad y atomicidad.
- **Planilla Interactiva de Nuevas Cuentas Financieras:** Implementada dentro del `<dialog id="app-modal">` nativo. Permite dar de alta cuentas de tipo Banco, Efectivo, Billetera Digital, Ahorro/Inversión y Tarjeta de Crédito, asignando color, icono y moneda. Si es tarjeta de crédito con saldo positivo ingresado, se registra automáticamente como deuda contable negativa.
- **Planilla Interactiva de Nuevos Movimientos:** Implementada en `<dialog id="app-modal">` nativo. Conmutación reactiva entre Gasto, Ingreso y Transferencia. Integra de inmediato cualquier cuenta nueva creada y soporta modo Split.
- **Validación e Inmutabilidad (`financeCalculations.js`):** Funciones puras `validarNuevaCuenta()`, `crearCuentaObjeto()`, `validarTransaccion()`, `aplicarTransaccionEnCuentas()`, `validarMovimientoSplit()`, `aplicarMovimientoSplitEnCuentas()`, `validarPresupuesto()`, `calcularGastoCategoriaMes()`, `sincronizarPresupuestosConTransacciones()`, `validarMetaAhorro()`, `calcularProgresoMeta()`, `aplicarAporteMeta()`, `validarBackupJSON()`, `filtrarTransacciones()`, `generarTransaccionesCSV()`, `obtenerMovimientosDeCuenta()` y `calcularResumenCuenta()` probadas con `node --test` (44/44 pruebas en verde).
- **Arranque Universal sin CORS:** Scripts universales bajo `window.ContaPersonal` y orden de carga secuencial en `index.html` (compatible con `file:///` y HTTP).
- **Enfoque Exclusivo:** Contabilidad y Finanzas Personales/Familiares (sin inventario comercial ni pedidos).

---

## 3. Historial de cambios

- **2026-11-09 — Spec 009: Pantalla Adicional de Detalle y Movimientos de Cuenta (SDD):**
  - Creada especificación formal `specs/009-pantalla-detalle-cuenta/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Actualizada la suite `tests/account-details.test.js` (44/44 pruebas totales en verde en el proyecto).
  - Creada en `index.html` la nueva sección `<section id="view-account-detail">` para navegación limpia a pantalla completa.
  - Implementado en `assets/js/app.js` el enrutamiento hacia la pantalla adicional (`openAccountDetail`), botón "← Volver a Cuentas & Billeteras", ficha de cabecera con saldo, tarjetas KPI de abonos/cargos, barra de filtros interna y tabla de movimientos asociados con desglose split.
  - Comprobado funcionamiento en el navegador y verificado en tests automatizados.
- **2026-11-09 — Spec 008: Visualización de Movimientos y KPIs por Cuenta Seleccionada (SDD):**
  - Creada especificación formal `specs/008-movimientos-por-cuenta/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Diseñada e implementada la suite `tests/account-details.test.js` con metodología TDD Red-Green (2 pruebas unitarias exhaustivas, 43/43 pruebas totales en verde en el proyecto).
  - Implementadas en `assets/js/financeCalculations.js` las funciones puras `obtenerMovimientosDeCuenta()` y `calcularResumenCuenta()`.
  - Actualizado `index.html` incorporando el contenedor reactivo `#account-detail-container` debajo de la cuadrícula de cuentas.
  - Desarrollada en `assets/js/app.js` la interactividad de selección en tarjetas de cuentas (`state.selectedAccountId`), con anillo de foco, badge de estado activo y renderizado del panel de detalle con 3 KPIs y tabla cronológica de movimientos (soporta gastos, ingresos, transferencias y partidas de pagos divididos split con impacto relativo `+` o `-`).
  - Verificado en el navegador con Chrome DevTools (selección de múltiples cuentas, tarjeta de crédito y cuentas de activo split, cierre y deselección con 0 errores de consola).
- **2026-11-09 — Spec 007: Respaldo Integral JSON y Filtros Avanzados con Exportación CSV (SDD):**
  - Creada especificación formal `specs/007-backup-filtros-csv/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Diseñada e implementada la suite `tests/backup-and-export.test.js` con metodología TDD Red-Green (4 pruebas unitarias exhaustivas, 41/41 pruebas totales en verde en el proyecto).
  - Implementadas en `assets/js/financeCalculations.js` las funciones puras `validarBackupJSON()`, `generarTransaccionesCSV()` y `filtrarTransacciones()`.
  - Añadida barra de filtros multidimensionales en `view-transactions` (`index.html`) con selectores de tipo, cuenta, categoría, rango temporal y selector condicional de fechas personalizadas.
  - Implementada en `assets/js/app.js` la reactividad de filtros en tiempo real y el botón de exportación CSV con descarga directa compatible con Microsoft Excel (UTF-8 BOM y detalle split).
  - Implementada la validación previa de respaldo JSON e importación con confirmación de conteo de entidades.
  - Verificado en el navegador con Chrome DevTools (búsqueda, filtros por cuenta/categoría/fechas, exportación CSV y backup JSON con 0 errores de consola).
- **2026-11-09 — Spec 006: Gestión de Metas de Ahorro Personal (SDD):**
  - Creada especificación formal `specs/006-metas-ahorro/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Diseñada e implementada la suite `tests/goals.test.js` con metodología TDD Red-Green (6 pruebas unitarias, 37/37 pruebas totales en verde en el proyecto).
  - Implementadas en `assets/js/financeCalculations.js` las funciones puras `validarMetaAhorro()`, `calcularProgresoMeta()` y `aplicarAporteMeta()`.
  - Desarrollada la planilla modal interactiva `openGoalModal()` en `assets/js/app.js` conectada al botón `btn-modal-new-goal`.
  - Desarrollado el modal de aporte rápido `openContributeGoalModal()` para registrar incrementos de ahorro directamente en cada meta.
  - Mejorado el renderizado en `renderBudgets()` (`goals-grid`) con barras de progreso coloreadas, monto restante/meta cumplida y botones de aporte, edición y eliminación.
  - Verificado en el navegador con Chrome DevTools (creación de meta, aporte al 100% con insignia de logro, edición y eliminación limpia con 0 errores de consola).
- **2026-11-09 — Spec 005: Gestión de Presupuestos Mensuales por Categoría (SDD):**
  - Creada especificación formal `specs/005-gestion-presupuestos/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Diseñada e implementada la suite `tests/budgets.test.js` con metodología TDD Red-Green (6 pruebas unitarias, 31/31 pruebas totales en verde en el proyecto).
  - Implementadas en `assets/js/financeCalculations.js` las funciones puras `validarPresupuesto()`, `calcularGastoCategoriaMes()` y `sincronizarPresupuestosConTransacciones()`.
  - Desarrollada la planilla interactiva modal `openBudgetModal()` en `assets/js/app.js` con selector de categoría, monto límite, mes de vigencia y vista previa en tiempo real del gasto detectado.
  - Mejorado el renderizado en `renderBudgets()` con semáforo porcentual, saldo disponible / sobregiro, y botones de edición y eliminación reactivos.
  - Conectado el botón `btn-modal-new-budget` y verificado en el navegador con Chrome DevTools (creación, cambio de semáforo a amarillo/rojo y eliminación limpia con 0 errores de consola).
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

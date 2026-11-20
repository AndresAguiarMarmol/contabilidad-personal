# memory.md — Memoria del proyecto

Registro de todo lo que debe preservarse entre sesiones de trabajo: arquitectura de datos, decisiones técnicas tomadas e historial de cambios.
**Los agentes deben leer este archivo antes de empezar y actualizarlo al terminar cada tarea** (ver `AGENTS.md`).

---

## 1. Estructura de datos y persistencia

### A. Persistencia en `localStorage` (Modo Offline / Local por defecto)
- **Clave:** `finance_accounts_data`
  - Array de objetos `Account`: `id`, `name`, `type` (`"bank"` | `"cash"` | `"wallet"` | `"savings"` | `"credit_card"`), `initialBalance`, `currentBalance`, `currency`, `color`, `icon`, `isExcludedFromTotal`.
- **Clave:** `finance_transactions_data`
  - Array de objetos `Transaction`: `id`, `date`, `type` (`"income"` | `"expense"` | `"transfer"`), `accountId`, `toAccountId`, `category`, `categoryCode` (código contable del plan, ej. `5.2.01`), `amount`, `description`, `paymentMethod`, `isRecurring`, `isSplit` (booleano opcional), `splitLines` (array de partidas: `{ id, description, amount, category, categoryCode, targetAccountId }`).
- **Clave:** `finance_budgets_data`
  - Array de objetos `Budget`: `id`, `category`, `limitAmount`, `spentAmount`, `month`.
- **Clave:** `finance_goals_data`
  - Array de objetos `SavingsGoal`: `id`, `title`, `targetAmount`, `currentAmount`, `deadlineDate`, `color`.
- **Clave:** `finance_plan_accounts_data`
  - Array de objetos `AccountPlanItem` personalizados: `id`, `code`, `name`, `parentCode` (código de la cuenta base padre para subcuentas), `isSubaccount` (booleano), `classNumber` (1..5), `classType`, `groupName`, `nature` ("debit" | "credit"), `balance`, `periodMovement`, `isSystem`.
- **Claves de Lápidas (Tombstones - Spec 016):**
  - `finance_deleted_plan_accounts_data`: Array de códigos e IDs de subcuentas eliminadas.
  - `finance_deleted_budgets_data`: Array de IDs de presupuestos eliminados.
  - `finance_deleted_goals_data`: Array de IDs de metas eliminadas.
- **Clave:** `finance_theme`
  - Valores: `"dark"` | `"light"`. Gestiona el modo de color persistido en `<html>`.
- **Clave:** `finance_remote_db_config`
  - Objeto con `provider` (`"firebase"` | `"supabase"` | `"none"`), `projectId`, `apiKey`, `authDomain`, `storageBucket`, `url`, `anonKey`.

### B. Base de Datos Real en la Nube (Supabase PostgreSQL)
- **Script SQL:** `schema.sql` (tablas: `accounts`, `categories`, `transactions`, `budgets`, `savings_goals`).
- **Adaptador:** `assets/js/dbAdapter.js` universal compatible con navegador y pruebas.

### C. Base de Datos en la Nube y Alojamiento con Firebase (Cloud Firestore & Hosting)
- **Proyecto:** `mi-propia-contabilidad`
- **Servicios:** Cloud Firestore (colecciones: `workspaces`, `accounts`, `transactions`, `budgets`, `goals`, `planAccounts`, `backups`) y Firebase Hosting (`mi-propia-contabilidad.web.app`).
- **Sincronización Multi-Dispositivo (Spec 015):** Persistencia y consolidación en el documento `workspaces/main` con fusión bidireccional determinista de transacciones, recálculo atómico de balances contables y auto-sync en segundo plano al arrancar, mutar datos y cambiar de visibilidad/foco en móviles y PC.
- **Reglas de Seguridad:** `firestore.rules` (`rules_version = '2'`) configuradas para permitir operaciones de lectura y escritura directas para las colecciones del proyecto y endpoints REST (`workspaces`, `accounts`, `transactions`, `budgets`, `goals`, `planAccounts`, `backups`) en modo personal/desarrollo mediante Web API Key, verificadas y compiladas sin errores mediante dry-run de Firebase CLI.
- **Adaptador:** `assets/js/dbAdapter.js` REST API con serialización pura `toFirestoreFields`/`fromFirestoreFields`, prueba de conexión, sincronización bidireccional y almacenamiento de respaldos completos en Firestore.

---

## 2. Decisiones vigentes

- **Lápidas de Eliminación y Precedencia Local en Sincronización Multi-Dispositivo (Spec 016):** Resuelve el problema distribuido donde entidades eliminadas localmente (subcuentas del plan contable como `1.1.02.02`, presupuestos mensuales y metas de ahorro) reaparecían resucitadas tras sincronizar con Firebase, y donde modificaciones locales a atributos de cuentas eran sobreescritas por versiones remotas desactualizadas. La arquitectura implementa lápidas persistentes (`deletedPlanAccounts`, `deletedBudgets`, `deletedGoals`) que se conservan en `localStorage` y en `workspaces/main` de Firestore. Durante la fusión (`fusionarEstadoContable`), los eliminados se unifican y cualquier entidad eliminada se descarta activamente tanto de la copia local como de la remota. Para entidades activas, los atributos locales tienen precedencia (`{ ...remoto, ...local }`) y el nombre en el catálogo contable se sincroniza con la cuenta financiera vinculada (`obtenerCatalogoPlanCuentas`). Si el usuario decide recrear deliberadamente una cuenta con el mismo código en el futuro, se retira de la lista de lápidas permitiendo su alta limpia.
- **Sincronización Bidireccional Multi-Dispositivo con Firebase Firestore (Spec 015):** Resuelve la sincronización concurrente entre PC, iPhone y otros dispositivos móviles/escritorio. La arquitectura persiste el estado consolidado en `workspaces/main` de Cloud Firestore mediante API REST y ejecuta la función pura `Calculations.fusionarEstadoContable(localState, remoteState)` para unir transacciones sin duplicados por ID, combinando cuentas, presupuestos, metas y subcuentas, recalculando atómicamente el `currentBalance` de cada cuenta en base a todos los movimientos combinados (incluyendo splits). La sincronización es automática al arrancar la app (`startApp`), inmediata en segundo plano al registrar cualquier movimiento/cuenta/meta, reactiva al volver a la pestaña o app móvil (`visibilitychange`/`focus`), y manual vía botón de cabecera `#btn-quick-sync` con spinner animado y toasts informativos.
- **Integración con Firebase Cloud Firestore y Hosting (Spec 014):** Soporte para base de datos en la nube y alojamiento en Firebase (`mi-propia-contabilidad`). La arquitectura implementa un adaptador desacoplado en `assets/js/dbAdapter.js` vía API REST de Google Firestore v1, lo cual garantiza compatibilidad directa tanto en navegador web (HTTP/HTTPS y `file:///`) como en pruebas automatizadas con Node.js, sin añadir dependencias externas pesadas ni exigir bundlers de compilación. Incluye validadores y serializadores de tipos nativos Firestore (`toFirestoreFields`, `fromFirestoreFields`), prueba de conectividad en vivo con diagnóstico inteligente (detecta si Firestore requiere inicialización en Firebase Console y provee enlace directo), sincronización de las 5 entidades contables (`accounts`, `transactions`, `budgets`, `goals`, `planAccounts`) y persistencia de copias de respaldo completas JSON en la colección `backups` con metadata y estadísticas. La seguridad está blindada con `firestore.rules` declarativas y compiladas con éxito vía dry-run.
- **Cuentas Secundarias (Subcuentas) en el Plan de Cuentas (Spec 013):** Permite crear subcuentas secundarias dependientes de cualquier Cuenta Base del catálogo contable (`parentCode`). Al seleccionar una cuenta base en la planilla modal o mediante el botón de acción rápida `+ Subcuenta` (`btn-add-subaccount`) en las filas del Plan de Cuentas, el sistema calcula de forma determinista el siguiente código numérico correlativo mediante la función pura `Calculations.generarSiguienteCodigoSubcuenta` (ej. `5.1.01.01`, `5.1.01.02`), heredando automáticamente la clase contable, el rubro y la naturaleza deudora/acreedora del padre. En la tabla del Plan de Cuentas, las subcuentas se presentan indentadas jerárquicamente con conector visual `↳` y badge `Subcuenta de [parentCode]`, e integradas de inmediato a las categorías de movimientos y presupuestos.
- **Enlace de Categorías con el Plan de Cuentas Contable (Spec 012):** El campo "Categorías" de nuevos movimientos, filtros del Libro de Movimientos y el formulario de Presupuestos Mensuales emana de forma 100% reactiva y dinámica del catálogo maestro del Plan de Cuentas (`Calculations.obtenerCategoriasDesdePlan`). Para movimientos de gasto se ofrecen las cuentas de la Clase 5 (Gastos); para ingresos, las cuentas de la Clase 4 (Ingresos); y para movimientos divididos (Split), se permite imputar partidas a cuentas de gasto (Clase 5) o a bienes personales/activos fijos del hogar (Clase 1.3: Mobiliario, Computación, Inmuebles, Vehículos), además de cuentas financieras de tesorería. Toda transacción guarda tanto el nombre amigable de la categoría como su código contable normalizado (`categoryCode`), el cual se visualiza en la tabla de movimientos.
- **Repositorio Oficial en GitHub:** Alojado y sincronizado en `https://github.com/AndresAguiarMarmol/contabilidad-personal` en la rama `main`, con tracking remoto activo y sincronización de todas las especificaciones implementadas.
- **Plan de Cuentas Contable Personal Integral (5 Clases Contables: Activos, Pasivos, Patrimonio, Ingresos y Gastos):** Acceso directo desde el botón "Plan de Cuentas" (`folder-tree`, insignia `CRUD`) en `#sidebar nav`. Implementa la estructura contable completa orientada a finanzas personales y familiares: Clase 1 (Activos: disponible, inversiones y bienes patrimoniales), Clase 2 (Pasivos: tarjetas y deudas a corto y largo plazo), Clase 3 (Patrimonio Neto: capital inicial y ahorro acumulado), Clase 4 (Ingresos: laborales, inversiones y reembolsos) y Clase 5 (Gastos: vivienda, alimentación, transporte, salud, educación, ocio y financieros). Tablero de 6 KPIs consolidados (Total Activos, Total Pasivos, Patrimonio Neto, Ingresos Período, Gastos Período, Resultado Operativo), selector reactivo de clase, buscador en vivo, y modales interactivos para alta y edición de cuentas contables con validación de unicidad y preservación de cuentas del sistema.
- **Pantalla Adicional de Detalle y Movimientos de Cuenta (`view-account-detail`):** La selección de cualquier cuenta en "Cuentas & Billeteras" navega a una pantalla adicional dedicada dentro del enrutador SPA. La pantalla presenta cabecera completa con identidad de la cuenta (icono, color, tipo, moneda y saldo contable destacado), botón de retorno directo "← Volver a Cuentas & Billeteras", 3 tarjetas KPI acumuladas (Total Abonos, Total Cargos y Conteo de Movimientos), buscador textual y filtro de tipo interno, tabla cronológica con soporte de partidas split e impacto relativo (`+` / `-`), y botón para crear un movimiento preseleccionando dicha cuenta.
- **Respaldo y Restauración Integral JSON:** Permite descargar un backup completo de toda la información contable (cuentas, transacciones split, presupuestos y metas) con versión y timestamp. Validación de integridad mediante la función pura `validarBackupJSON()` antes de sobreescribir `localStorage`, con diálogo de confirmación informando la cantidad exacta de registros a restaurar.
- **Filtros Multidimensionales y Exportación CSV (RFC 4180 con UTF-8 BOM):** Filtrado reactivo en el Libro de Movimientos por búsqueda textual, tipo de transacción, cuenta financiera, categoría y rango de fechas (mes actual, mes anterior, últimos 3 meses o rango personalizado con selectores de fecha). Exportación de los movimientos filtrados a formato CSV estándar con cabecera BOM (`\uFEFF`) para compatibilidad directa con Microsoft Excel, incluyendo el desglose pormenorizado de partidas de movimientos divididos (split).
- **Gestión de Metas de Ahorro Personal:** Implementada en `<dialog id="app-modal">`. Permite crear y editar metas (título, monto objetivo, monto ahorrado inicial, fecha límite y color). Tarjetas interactivas con cálculo de porcentaje, monto faltante o insignia de logro `🏆 ¡Meta Cumplida!`. Modal de aporte rápido `openContributeGoalModal()` para sumar fondos periódicos a una meta. Acciones de edición y eliminación con persistencia en `finance_goals_data`.
- **Gestión de Presupuestos Mensuales por Categoría:** Implementada en `<dialog id="app-modal">`. Permite crear y editar límites mensuales por categoría, detectando en tiempo real el gasto del mes desde las transacciones (estándar y partidas split). Semáforos visuales de alerta: verde ($\le 75\%$), amarillo ($76\% - 100\%$) y rojo ($> 100\%$ sobregiro). Acciones de edición de límite y eliminación con persistencia en `finance_budgets_data`.
- **Movimientos Divididos (Split Transactions):** Permite desglosar un pago global (ej. tarjeta de crédito) en múltiples partidas que afectan de forma atómica a diferentes cuentas patrimoniales/activos o categorías de gasto. Aplica principio de cuadratura contable estricta en tiempo real ($\sum \text{líneas} = \text{monto total}$). Bloquea guardado ante descuadres numéricos o montos no positivos. Las funciones puras `validarMovimientoSplit()` y `aplicarMovimientoSplitEnCuentas()` garantizan inmutabilidad y atomicidad.
- **Planilla Interactiva de Nuevas Cuentas Financieras:** Implementada dentro del `<dialog id="app-modal">` nativo. Permite dar de alta cuentas de tipo Banco, Efectivo, Billetera Digital, Ahorro/Inversión y Tarjeta de Crédito, asignando color, icono y moneda. Si es tarjeta de crédito con saldo positivo ingresado, se registra automáticamente como deuda contable negativa.
- **Planilla Interactiva de Nuevos Movimientos:** Implementada en `<dialog id="app-modal">` nativo. Conmutación reactiva entre Gasto, Ingreso y Transferencia. Integra de inmediato cualquier cuenta nueva creada y soporta modo Split.
- **Validación e Inmutabilidad (`financeCalculations.js`):** Funciones puras `validarNuevaCuenta()`, `crearCuentaObjeto()`, `validarTransaccion()`, `aplicarTransaccionEnCuentas()`, `validarMovimientoSplit()`, `aplicarMovimientoSplitEnCuentas()`, `validarPresupuesto()`, `calcularGastoCategoriaMes()`, `sincronizarPresupuestosConTransacciones()`, `validarMetaAhorro()`, `calcularProgresoMeta()`, `aplicarAporteMeta()`, `validarBackupJSON()`, `filtrarTransacciones()`, `generarTransaccionesCSV()`, `obtenerMovimientosDeCuenta()`, `calcularResumenCuenta()`, `clasificarPlanDeCuentas()`, `validarEdicionCuenta()`, `puedeEliminarCuenta()`, `obtenerCatalogoPlanCuentas()`, `calcularResumenPlanCuentas()`, `validarCuentaPlan()`, `puedeEliminarCuentaPlan()`, `obtenerCategoriasDesdePlan()`, `resolverCategoriaPlan()` y `generarSiguienteCodigoSubcuenta()` probadas con `node --test` (62/62 pruebas en verde).
- **Arranque Universal sin CORS:** Scripts universales bajo `window.ContaPersonal` y orden de carga secuencial en `index.html` (compatible con `file:///` y HTTP).
- **Enfoque Exclusivo:** Contabilidad y Finanzas Personales/Familiares (sin inventario comercial ni pedidos).

---

## 3. Historial de cambios

- **2026-11-19 — Spec 016: Eliminación Definitiva de Cuentas Contables y Prevención de Resurrección en la Sincronización (SDD):**
  - Creada especificación formal `specs/016-eliminacion-definitiva-tombstones-sync/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Diseñada e implementada la suite de pruebas unitarias TDD Red-Green en `tests/sync-merge.test.js` (5 nuevas pruebas unitarias exhaustivas para RF-2 y RF-6, elevando la suite completa del proyecto a 77/77 pruebas en verde).
  - Implementada en `assets/js/financeCalculations.js` la supresión activa de entidades eliminadas en `fusionarEstadoContable(localState, remoteState)` mediante unión y filtrado por lápidas (`deletedPlanAccounts`, `deletedBudgets`, `deletedGoals`), garantizando que cuentas eliminadas (como `1.1.02.02`) no resuciten al auto-sincronizar.
  - Implementada la precedencia local de atributos `{ ...remoto, ...local }` en cuentas y actualización de nombres en `obtenerCatalogoPlanCuentas()`.
  - Implementados en `assets/js/storage.js` y `assets/js/dbAdapter.js` los métodos de persistencia y serialización de lápidas en `localStorage` y en el documento `workspaces/main` de Firestore.
  - Integrado en `assets/js/app.js` el registro inmediato de eliminaciones con disparo automático de `syncBidirectional()` en segundo plano, y la reactivación limpia al recrear deliberadamente una cuenta con el mismo código contable.
  - Verificación global con `node --test tests/*.test.js`: 77/77 pruebas en verde sin regresiones.
- **2026-11-18 — Spec 015: Sincronización Bidireccional Multi-Dispositivo con Firebase Firestore (SDD):**
  - Creada especificación formal `specs/015-sincronizacion-bidireccional-firebase/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Diseñada e implementada la suite `tests/sync-merge.test.js` con metodología TDD Red-Green (5 pruebas unitarias exhaustivas, elevando la suite a 72/72 pruebas totales en verde en el proyecto).
  - Implementada en `assets/js/financeCalculations.js` la función pura `fusionarEstadoContable(localState, remoteState)` con unión de transacciones sin duplicados, recálculo atómico de balances de cuentas y combinación de presupuestos, metas y subcuentas del plan contable.
  - Implementados en `assets/js/dbAdapter.js` los métodos `fetchRemoteWorkspace()`, `saveRemoteWorkspace()` y `syncBidirectional()` sobre el documento consolidado `workspaces/main` de Firestore con fallback para migrar automáticamente copias previas de la colección `backups`.
  - Integrada la sincronización automática (Auto-Sync) en `assets/js/app.js`: se dispara silenciosamente al arrancar la app, inmediatamente tras registrar cada movimiento o cambio de cuenta/presupuesto/meta, y al reanudar la app en el móvil (`visibilitychange`/`focus`).
  - Añadido botón interactivo `#btn-quick-sync` en la cabecera superior con icono de nube y animación de sincronización en curso.
  - Actualizado el Service Worker a `contapersonal-v3` en `sw.js` para asegurar refresco inmediato en iOS Safari y navegadores móviles.
- **2026-11-18 — Actualización de Reglas de Seguridad en Cloud Firestore (`firestore.rules`):**
  - Actualizado el archivo `firestore.rules` (`rules_version = '2'`) para habilitar lectura y escritura en las colecciones del sistema (`accounts`, `transactions`, `budgets`, `goals`, `planAccounts`, `backups`) y comodín global, adaptado al modelo de consumo de la PWA vía API REST de Firestore con Web API Key (desarrollo personal sin sesión interactiva de Firebase Auth obligatoria).
  - Compilación y verificación sintáctica ejecutada exitosamente mediante dry-run de Firebase CLI (`npx firebase deploy --only firestore:rules --dry-run`), confirmando 0 errores de sintaxis CEL y compatibilidad total para despliegue.
- **2026-11-17 — Spec 014: Integración de Base de Datos y Alojamiento con Firebase (Cloud Firestore & Hosting) (SDD):**
  - Creada especificación formal `specs/014-integracion-firebase-firestore/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Verificado e instalado Firebase CLI (`firebase-tools@15.36.0`) y configurados `.firebaserc` y `firebase.json` asociados al proyecto `mi-propia-contabilidad`.
  - Invocado el subagente especialista `firestore-rules-author` para generar `firestore.rules` declarativas de nivel de producción, con compilación dry-run validada con 0 advertencias y 0 errores.
  - Diseñada e implementada la suite `tests/firebase-db.test.js` con metodología TDD Red-Green (5 pruebas unitarias exhaustivas, elevando la suite a 67/67 pruebas totales en verde en el proyecto).
  - Implementadas en `assets/js/dbAdapter.js` las funciones puras y asíncronas: `toFirestoreFields()`, `fromFirestoreFields()`, `prepareBackupDocument()`, `isFirebaseConfigured()`, `testFirebaseConnection()`, `saveBackupToFirebase()` y `syncAll()`.
  - Corregido endpoint de diagnóstico en `DbAdapter.testFirebaseConnection` para consultar la colección estructurada `/documents/accounts` con soporte nativo de CORS (resolviendo error de navegador `Failed to fetch`).
  - Integrado en `index.html` y `assets/js/app.js` el panel interactivo de Firebase en la sección de Configuración (`#view-settings`), permitiendo guardar credenciales, probar conectividad en vivo, subir respaldos completos a Firestore y sincronizar datos con feedback visual y toasts.
  - Sincronizado y publicado en el repositorio de GitHub (`main`).
- **2026-11-12 — Spec 013: Creación de Cuentas Secundarias (Subcuentas) a Cuentas Base (SDD):**
  - Creada especificación formal `specs/013-cuentas-secundarias-plan/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Diseñada e implementada la suite `tests/subaccounts-plan.test.js` con metodología TDD Red-Green (5 pruebas unitarias exhaustivas, 62/62 pruebas totales en verde en el proyecto).
  - Implementadas en `assets/js/financeCalculations.js`: `generarSiguienteCodigoSubcuenta(parentCode, catalogo)` y validación jerárquica de prefijo en `validarCuentaPlan()`.
  - Integrada en `assets/js/app.js`: botón rápido de acción `+ Subcuenta` (`btn-add-subaccount`) en las filas de Cuentas Base en el Plan de Cuentas; selector reactivo de "Cuenta Base Padre" en `openPlanAccountModal` con cálculo automático del siguiente código correlativo y herencia de clase, rubro y naturaleza; renderizado indentado jerárquico con conector `↳` y badge `Subcuenta de [parentCode]`; disponibilidad automática en selectores de nuevos movimientos y presupuestos.
  - Sincronizado y publicado en el repositorio de GitHub (`main`).
- **2026-11-12 — Spec 012: Enlace de Categorías de Movimientos con el Plan de Cuentas Contable (SDD):**
  - Creada especificación formal `specs/012-enlazar-categorias-plan-cuentas/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Diseñada e implementada la suite `tests/category-plan-link.test.js` con metodología TDD Red-Green (5 pruebas unitarias exhaustivas, 57/57 pruebas totales en verde en el proyecto).
  - Implementadas en `assets/js/financeCalculations.js`: `obtenerCategoriasDesdePlan(catalogo, tipo)` y `resolverCategoriaPlan(valor, catalogo)`.
  - Integrado en `assets/js/app.js`: modal de nuevo movimiento (`openTransactionModal`) enlazado a cuentas de Clase 5 (Gastos) y Clase 4 (Ingresos); repetidor de partidas Split enlazado a Clase 5 (Gastos) y Clase 1.3 (Bienes/Activos Fijos); guardado y persistencia de `category` y `categoryCode`; visualización de código contable en la tabla de transacciones; filtro `#tx-category-filter` y selector de presupuestos `#budget-input-category` alimentados del catálogo contable.
  - Sincronizado y publicado en el repositorio de GitHub (`main`).
- **2026-11-12 — Infraestructura: Creación y Sincronización del Repositorio en GitHub:**
  - Creado repositorio público `contabilidad-personal` en GitHub bajo la cuenta del usuario (`AndresAguiarMarmol`).
  - Configurado el origen remoto hacia `https://github.com/AndresAguiarMarmol/contabilidad-personal.git`.
  - Publicada y sincronizada la rama `main` con todo el historial de desarrollo y las 11 especificaciones SDD (52/52 pruebas unitarias en verde).
- **2026-11-12 — Spec 011: Plan de Cuentas Orientado a Contabilidad Personal (SDD):**
  - Creada especificación formal `specs/011-plan-de-cuentas-personal/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Diseñada e implementada la suite `tests/personal-chart-of-accounts.test.js` con metodología TDD Red-Green (5 pruebas unitarias exhaustivas, 52/52 pruebas totales en verde en el proyecto).
  - Implementadas en `assets/js/financeCalculations.js`: catálogo base `CATALOGO_PLAN_CUENTAS_PERSONAL_BASE` (Clase 1 Activos, Clase 2 Pasivos, Clase 3 Patrimonio, Clase 4 Ingresos, Clase 5 Gastos), `obtenerCatalogoPlanCuentas()`, `calcularResumenPlanCuentas()`, `validarCuentaPlan()` y `puedeEliminarCuentaPlan()`.
  - Añadida persistencia de cuentas del plan contable en `assets/js/storage.js` (`finance_plan_accounts_data`) y respaldo/restauración JSON.
  - Conectado el botón "Plan de Cuentas" en `#sidebar nav` con la vista integral `view-chart-of-accounts`.
  - Desarrollada interfaz con 6 KPIs superiores, selector de clase contable (Todas, 1. Activos, 2. Pasivos, 3. Patrimonio, 4. Ingresos, 5. Gastos), buscador en tiempo real, tablas jerárquicas y modal interactivo para crear y editar cuentas (`openPlanAccountModal`).
- **2026-11-12 — Spec 010: Plan de Cuentas (CRUD) en Menú Vertical (SDD):**
  - Creada especificación formal `specs/010-plan-de-cuentas-crud/` (`spec.md` en formato EARS, `plan.md`, `tasks.md`).
  - Diseñada e implementada la suite `tests/chart-of-accounts.test.js` con metodología TDD Red-Green (3 pruebas unitarias exhaustivas, 47/47 pruebas totales en verde en el proyecto).
  - Implementadas en `assets/js/financeCalculations.js` las funciones puras `clasificarPlanDeCuentas()`, `validarEdicionCuenta()` y `puedeEliminarCuenta()`.
  - Añadido botón de navegación "Plan de Cuentas" en `#sidebar nav` (`index.html`) con insignia `CRUD`, icono `folder-tree`, ubicado inmediatamente debajo de "Cuentas & Billeteras".
  - Creada en `index.html` la sección `<section id="view-chart-of-accounts">` con integración completa en el enrutador SPA (`switchView()`).
  - Desarrollada la vista interactiva con 3 KPIs superiores (Total Activos, Total Pasivos, Patrimonio Neto), buscador en vivo, filtro por grupo contable y tablas estructuradas por rubro.
  - Implementado modal interactivo de edición (`openAccountEditModal`) y flujo de borrado con validación de integridad referencial contra transacciones vinculadas.
  - Sincronización reactiva con `state.accounts`, `Storage.saveAccounts()` y el resto de las vistas de la app.
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

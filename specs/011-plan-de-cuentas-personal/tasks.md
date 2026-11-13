# Tareas de Implementación — Spec 011 (Plan de Cuentas Orientado a Contabilidad Personal)

- [x] **T1: TDD Red (Suite de Pruebas de Lógica Pura del Plan de Cuentas Personal)**
  - Crear archivo `tests/personal-chart-of-accounts.test.js`.
  - Diseñar casos de prueba para:
    1. Generación del catálogo estándar con las 5 clases contables (Activos, Pasivos, Patrimonio, Ingresos, Gastos).
    2. Enlace y cómputo de saldos/movimientos de cuentas financieras y transacciones en el plan.
    3. Cálculo del resumen contable (Activos, Pasivos, Patrimonio Neto, Ingresos, Gastos, Resultado Neto).
    4. Validación de alta y edición de cuentas contables (`validarCuentaPlan`).
    5. Verificación de integridad para eliminación (`puedeEliminarCuentaPlan`).
  - Ejecutar `node --test tests/personal-chart-of-accounts.test.js` y confirmar fallo controlado (fase Red).

- [x] **T2: TDD Green (Implementación de Funciones Puras en `financeCalculations.js`)**
  - Definir la constante `CATALOGO_PLAN_CUENTAS_PERSONAL_BASE` con cuentas estructuradas de finanzas personales.
  - Implementar `obtenerCatalogoPlanCuentas`, `calcularResumenPlanCuentas`, `validarCuentaPlan` y `puedeEliminarCuentaPlan`.
  - Exportar funciones en `window.ContaPersonal.Calculations` y `module.exports`.
  - Ejecutar `node --test tests/personal-chart-of-accounts.test.js` y verificar paso al 100% en verde.

- [x] **T3: Persistencia en `storage.js`**
  - Añadir soporte para guardar y recuperar cuentas personalizadas del Plan de Cuentas (`STORAGE_KEYS.PLAN_ACCOUNTS = "finance_plan_accounts_data"`).
  - Incluir `planAccounts` en el respaldo y restauración JSON.

- [x] **T4: Interfaz de Usuario y Enlace del Botón en `app.js` e `index.html`**
  - Verificar y asegurar el botón "Plan de Cuentas" en `#sidebar nav`.
  - Diseñar la vista integral `view-chart-of-accounts` con:
    - 6 KPIs superiores (Activos, Pasivos, Patrimonio Neto, Ingresos, Gastos, Resultado del Período).
    - Selector interactivo de clases contables (Pestañas: Todas, 1. Activos, 2. Pasivos, 3. Patrimonio, 4. Ingresos, 5. Gastos).
    - Buscador en vivo por código o nombre de cuenta.
    - Tabla estructurada con Código, Nombre, Clase/Rubro, Naturaleza, Saldo/Movimiento acumulado y Acciones CRUD.
    - Modal `openPlanAccountModal` para crear y editar cuentas del plan.
    - Confirmación y eliminación de cuentas del plan.

- [x] **T5: Verificación Integral, Pruebas y Gobernanza**
  - Ejecutar la suite completa `node --test tests/*.test.js` asegurando que todas las suites pasen.
  - Verificar en navegador funcionamiento y ausencia de errores de consola.
  - Actualizar `specs/011-plan-de-cuentas-personal/spec.md` con DoD completo.
  - Actualizar `memory.md` y realizar commit git.

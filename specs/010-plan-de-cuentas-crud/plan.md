# Plan Técnico — Spec 010 (Plan de Cuentas CRUD)

## 1. Arquitectura y Módulos Afectados

### Archivos Afectados:
1. `assets/js/financeCalculations.js`:
   - `clasificarPlanDeCuentas(accounts)`: Función pura que clasifica las cuentas en Grupo 1 (Activos) y Grupo 2 (Pasivos), asigna códigos contables estructurados y calcula subtotales de cada grupo y patrimonio neto.
   - `validarEdicionCuenta(datos, cuentasExistentes, cuentaId)`: Función pura que valida que los datos de edición de una cuenta sean válidos y que el nombre no colisione con otra cuenta distinta a la actual.
   - `puedeEliminarCuenta(cuentaId, transactions)`: Función pura que inspecciona si la cuenta está vinculada a movimientos registrados y contabiliza cuántas transacciones se verían afectadas.
2. `tests/chart-of-accounts.test.js`:
   - Suite de pruebas unitarias con `node --test` para validar las funciones puras antes de la implementación de la UI (fase TDD Red-Green).
3. `index.html`:
   - Incorporar en el menú vertical (`#sidebar nav`), inmediatamente debajo de "Cuentas & Billeteras", el botón de navegación a "Plan de Cuentas".
   - Crear la sección `<section id="view-chart-of-accounts" class="hidden space-y-5">`.
4. `assets/js/app.js`:
   - Registrar `"chart-of-accounts"` en `VIEW_METADATA` y en `switchView()`.
   - Implementar `renderChartOfAccounts()` con desglose de Activos y Pasivos, búsqueda en vivo y filtros.
   - Desarrollar `openAccountEditModal(accountId)` para permitir la edición de cuentas existentes.
   - Implementar la eliminación de cuentas con confirmación de seguridad y actualización atómica en `Storage.saveAccounts()`.

---

## 2. Decisiones Técnicas y Alternativas Descartadas

- **Decisión:** Mantener una estructura de Plan de Cuentas con códigos contables universales (1. Activos, 2. Pasivos) compatible con las cuentas financieras existentes.
  - *Alternativa descartada:* Crear una entidad separada de cuentas contables desacoplada de las cuentas de dinero.
  - *Motivo:* En contabilidad personal, las cuentas de dinero (banco, efectivo, billetera, tarjeta) *son* las cuentas patrimoniales maestras. Unificar la gestión permite que cualquier cuenta creada, editada o eliminada en el Plan de Cuentas actualice inmediatamente el balance, el selector de movimientos y el dashboard sin duplicación de datos.

---

## 3. Trazabilidad con Requisitos Funcionales (EARS)
- **RF-1:** Botón en menú vertical debajo de Billeteras -> `index.html` (`#sidebar nav`).
- **RF-2:** Pantalla del Plan de Cuentas con totales por grupo contable -> `renderChartOfAccounts()`.
- **RF-3:** Listado detallado con códigos y saldos -> `clasificarPlanDeCuentas()`.
- **RF-4:** Alta de cuenta contable (Create) -> `openAccountModal()`.
- **RF-5:** Edición de cuenta contable (Update) -> `openAccountEditModal()` + `validarEdicionCuenta()`.
- **RF-6:** Eliminación de cuenta con seguridad (Delete) -> `puedeEliminarCuenta()`.
- **RF-7:** Funciones puras desacopladas -> `financeCalculations.js` y `tests/chart-of-accounts.test.js`.

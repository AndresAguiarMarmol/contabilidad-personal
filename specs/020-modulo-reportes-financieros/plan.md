# Plan Técnico — Spec 020: Módulo de Reportes Financieros

## 1. Arquitectura de Cálculo Desacoplada (`assets/js/financeCalculations.js`)

Se crearán las siguientes funciones puras independientes del DOM:
1. `generarBalanceGeneral(accounts, planCatalog, transactions, options = {})`:
   - Determina el saldo de cada rubro a la fecha de corte seleccionada.
   - Aplica valorización a CLP para cuentas en moneda extranjera según `currencies`.
   - Agrupa en:
     - `activos`: `{ circulante: { total, cuentas: [...] }, fijo: { total, cuentas: [...] }, total }`
     - `pasivos`: `{ circulante: { total, cuentas: [...] }, largoPlazo: { total, cuentas: [...] }, total }`
     - `patrimonio`: `{ capital: { total, cuentas: [...] }, resultadoEjercicio, total }`
   - Valida la cuadratura contable y reporta `{ descuadre: Math.abs(activos.total - (pasivos.total + patrimonio.total)) }`.
2. `generarEstadoResultados(transactions, planCatalog, options = {})`:
   - Filtra transacciones comprendidas en el rango de fechas `startDate` y `endDate`.
   - Discrimina gastos e ingresos estándar y partidas split.
   - Convierte a CLP si alguna transacción imputa a cuentas extranjeras.
   - Agrupa en:
     - `ingresos`: `{ operacionales: [...], noOperacionales: [...], total }`
     - `gastos`: `{ operacionales: [...], financieros: [...], total }`
     - `resultadoNeto`: `ingresos.total - gastos.total`
     - `tasaAhorro`: porcentaje relativo de ahorro del período.
3. `generarReporteCSV(tipoReporte, dataReporte)`:
   - Convierte los datos procesados en formato CSV compatible con RFC 4180 y Excel (BOM UTF-8).

## 2. Capa de Presentación e Interfaz (`index.html` y `assets/js/app.js`)

- En `index.html`:
  - Botón de navegación `data-nav-view="reports"` en `<aside id="sidebar">` con icono `file-bar-chart`.
  - Sección `<section id="view-reports" class="hidden space-y-6">`:
    - Cabecera con título, selector de reporte activo (tabs "Balance General Clasificado" / "Estado de Ganancias y Pérdidas").
    - Barra de herramientas con selector de período ("Mes Actual", "Año Actual", "Personalizado"), inputs de fecha, botón "Imprimir / PDF" y botón "Exportar CSV".
    - Contenedor dinámico `#report-content-container` donde se inyecta la presentación contable.
    - Estilos específicos de impresión (`@media print`) para formato ejecutivo limpio.
- En `assets/js/app.js`:
  - Enrutamiento: soporte para la vista `reports`.
  - Estado: `state.reports = { activeReport: "balance", periodType: "current-month", startDate: "", endDate: "" }`.
  - `renderReports()`: calcula y despliega el estado financiero seleccionado.
  - Listeners para cambio de tab, cambio de período, impresión y exportación CSV.

## 3. Plan de Pruebas Unitarias TDD (`tests/reports.test.js`)
- Test 1: `generarBalanceGeneral` calcula activos circulantes, fijos, pasivos y patrimonio con cuadratura contable estricta.
- Test 2: `generarBalanceGeneral` valoriza cuentas extranjeras a CLP según tasas vigentes.
- Test 3: `generarEstadoResultados` calcula ingresos, gastos ordinarios/financieros y resultado neto en el período.
- Test 4: `generarEstadoResultados` procesa adecuadamente partidas split de gastos e ingresos.
- Test 5: Conciliación del Resultado del Ejercicio: el resultado del Estado de Resultados coincide con el resultado integrado en el Patrimonio Neto del Balance General para el mismo período.
- Test 6: `generarReporteCSV` genera CSV estructurado con BOM UTF-8 y totales.

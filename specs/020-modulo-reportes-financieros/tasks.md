# Tareas — Spec 020: Módulo de Reportes Financieros

- [x] **Fase 1: TDD Red (Pruebas Unitarias)**
  - [x] Crear `tests/reports.test.js` con las pruebas unitarias para `generarBalanceGeneral`, `generarEstadoResultados` y `generarReporteCSV`.
  - [x] Ejecutar `node --test tests/reports.test.js` y verificar fallo en rojo (Red).

- [x] **Fase 2: TDD Green (Lógica Pura de Cálculo)**
  - [x] Implementar `generarBalanceGeneral` en `assets/js/financeCalculations.js`.
  - [x] Implementar `generarEstadoResultados` en `assets/js/financeCalculations.js`.
  - [x] Implementar `generarReporteCSV` en `assets/js/financeCalculations.js`.
  - [x] Exportar funciones en `FinanceCalculationsModule`.
  - [x] Ejecutar `node --test tests/reports.test.js` y verificar éxito en verde (Green).

- [x] **Fase 3: Capa de Interfaz y Aplicación**
  - [x] Agregar botón "Reportes" en el sidebar de `index.html`.
  - [x] Agregar contenedor de la vista `#view-reports` con selector de pestañas, barra de períodos contables, botones de acción y área de visualización.
  - [x] Agregar estilos de impresión `@media print` en `index.html` para presentación ejecutiva sin sidebar ni botones.
  - [x] Implementar en `assets/js/app.js`:
    - [x] Enrutamiento SPA hacia `reports`.
    - [x] Función `renderReports()` y renderizadores específicos para Balance General y Estado de Resultados.
    - [x] Manejadores de eventos para tabs, filtros de períodos (mes actual, año actual, rango personalizado), botón de imprimir y descarga de CSV.

- [x] **Fase 4: Verificación Integral**
  - [x] Ejecutar suite completa `node --test tests/*.test.js` (100% pruebas pasando).
  - [x] Verificar que no existan regresiones en ningún otro módulo.

- [x] **Fase 5: Documentación y Despliegue**
  - [x] Actualizar `memory.md` (Sección 2 y Sección 3).
  - [x] Marcar checklist en `tasks.md`.
  - [x] Realizar commit y push a GitHub (`main`).

# Tareas de Implementación — Spec 007 (Backup y Exportación CSV)

- [x] **T1: TDD Red (Pruebas unitarias de backup, CSV y filtros)**
  - Crear archivo `tests/backup-and-export.test.js` con pruebas para `validarBackupJSON`, `generarTransaccionesCSV` y `filtrarTransacciones`.
  - Ejecutar `node --test tests/backup-and-export.test.js` y confirmar fallo controlado (fase Red).

- [x] **T2: TDD Green (Implementación de lógica pura)**
  - Implementar las funciones en `assets/js/financeCalculations.js`.
  - Exportarlas en `window.ContaPersonal` y `module.exports`.
  - Ejecutar `node --test tests/*.test.js` y confirmar que todas las suites pasen en verde.

- [x] **T3: Actualización de Interfaz en `index.html`**
  - Añadir en la barra de filtros de `view-transactions` selectores de cuenta, categoría, rango de fechas y botón "Exportar CSV".
  - Asegurar diseño responsivo en móvil y escritorio.

- [x] **T4: Integración en `assets/js/app.js`**
  - Conectar filtros reactivos en `initFiltersAndEvents()` y usarlos en `renderTransactions()`.
  - Conectar `btn-export-csv` para generar y descargar el archivo `.csv`.
  - Conectar `#input-import-json` y los botones de exportación JSON con modal de validación previa e importación.

- [x] **T5: Verificación en navegador y sincronización de gobernanza**
  - Probar exportación de backup JSON e importación.
  - Probar filtrado multidimensional y descarga CSV en vivo mediante Chrome DevTools MCP.
  - Marcar DoD en `specs/007-backup-filtros-csv/spec.md`.
  - Actualizar `memory.md` y realizar commit git.

# Spec 007 — Respaldo Integral (JSON) y Filtros Avanzados con Exportación CSV

Estado: implementada

## 1. Contexto y Objetivo
La portabilidad y el análisis de datos son esenciales en una aplicación de contabilidad personal:
1. **Respaldo y Restauración Integral (JSON):** Permitir al usuario descargar un backup completo de toda su información financiera (cuentas, transacciones split, presupuestos y metas) y restaurarlo con validación previa de integridad desde cualquier navegador o dispositivo.
2. **Filtros Avanzados y Exportación CSV de Movimientos:** Proporcionar en la vista de transacciones un filtrado multidimensional (por texto, tipo, cuenta específica, categoría y rango de fechas) y la exportación de los datos filtrados a un archivo CSV estándar (compatible con Excel y Google Sheets) que incluya el desglose de partidas split.

---

## 2. Usuarios y Historias de Usuario
- **HU-1:** Como usuario, quiero descargar una copia de seguridad JSON completa de mi contabilidad para resguardar mis datos o migrarlos a otro dispositivo.
- **HU-2:** Como usuario, quiero seleccionar un archivo JSON de respaldo y que el sistema valide su estructura antes de restaurar mis datos.
- **HU-3:** Como usuario, quiero filtrar mis movimientos por cuenta, categoría y rango de fechas (ej. mes actual, últimos 3 meses o rango personalizado) para analizar mis finanzas en detalle.
- **HU-4:** Como usuario, quiero exportar la lista de transacciones filtradas a un archivo CSV para abrirlo en Excel o Google Sheets.

---

## 3. Requisitos Funcionales (EARS)
- **RF-1 (Evento):** CUANDO el usuario hace clic en "Descargar Copia JSON", EL SISTEMA genera y descarga automáticamente un archivo JSON con timestamp conteniendo todas las cuentas, transacciones (con líneas split), presupuestos y metas.
- **RF-2 (Evento):** CUANDO el usuario selecciona un archivo JSON en "Restaurar Copia JSON", EL SISTEMA valida su formato mediante `validarBackupJSON()` y solicita confirmación informando la cantidad de registros encontrados antes de sobreescribir la persistencia local.
- **RF-3 (Comportamiento continuo):** EL SISTEMA ofrece en la vista de Movimientos filtros reactivos por:
  - Búsqueda textual (concepto o detalle).
  - Tipo de movimiento (todos, gasto, ingreso, transferencia).
  - Cuenta financiera de origen (todas o una específica).
  - Categoría de gasto/ingreso (todas o una específica).
  - Rango de fechas (todo el historial, mes actual, mes anterior, últimos 3 meses o rango personalizado con selector de fecha inicio y fin).
- **RF-4 (Comportamiento continuo):** EL SISTEMA aplica la función pura `filtrarTransacciones()` actualizando reactivamente la tabla y el contador de movimientos coincidentes.
- **RF-5 (Evento):** CUANDO el usuario hace clic en "Exportar CSV", EL SISTEMA invoca `generarTransaccionesCSV()` con las transacciones que cumplen los filtros activos y dispara la descarga de un archivo `.csv` codificado en UTF-8 con BOM para correcta visualización en Microsoft Excel.

---

## 4. Requisitos No Funcionales
- **RNF-1:** Compatibilidad universal en formato CSV (RFC 4180) con delimitador por comas y escape seguro de campos con texto especial o saltos de línea.
- **RNF-2:** Lógica pura desacoplada y probada al 100% en `node --test`.
- **RNF-3:** Funcionamiento offline garantizado sin requerir conexión a internet ni librerías externas.

---

## 5. Casos Límite y Manejo de Errores
- Archivo JSON corrupto o con estructura ajena a la app: `validarBackupJSON()` retorna error claro y no altera el estado actual.
- Exportación CSV sin movimientos filtrados: El sistema descarga el encabezado CSV o notifica al usuario si no hay movimientos.
- Caracteres especiales o acentos en español (á, é, í, ó, ú, ñ): Deben exportarse con BOM `\uFEFF` para que Excel en Windows los reconozca automáticamente.

---

## 6. Criterios de Finalización (DoD)
- [x] Función pura `validarBackupJSON()` con pruebas unitarias en `node --test`.
- [x] Función pura `generarTransaccionesCSV()` con pruebas unitarias en `node --test`.
- [x] Función pura `filtrarTransacciones()` con pruebas unitarias en `node --test`.
- [x] Exportación JSON funcional desde el botón del encabezado y la vista de ajustes.
- [x] Restauración JSON con validación previa de integridad e importación exitosa.
- [x] Filtros avanzados en la vista de Movimientos (Cuenta, Categoría y Rango de Fecha).
- [x] Botón de "Exportar CSV" descargable con los filtros activos.
- [x] Verificación en vivo en navegador con Chrome DevTools con 0 errores de consola.

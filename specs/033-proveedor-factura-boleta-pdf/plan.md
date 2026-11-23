# Plan de Implementación — Spec 033: Proveedor y Factura-Boleta PDF

## Fase 1: Pruebas Unitarias TDD Red
- Crear `tests/proveedor-factura-pdf.test.js`:
  - Prueba 1: Verificar que `schema.sql` contenga las columnas `supplier` e `invoice_pdf` en la tabla `transactions`.
  - Prueba 2: Verificar que `validarTransaccion` en `financeCalculations.js` acepte y valide defensivamente `supplier`, `invoicePdf` e `invoiceName`.
  - Prueba 3: Verificar que `financeCalculations.js` incluya funciones puras para normalizar proveedor (`normalizarProveedor`) y generar nombre estándar de comprobante (`generarNombreComprobante`).
  - Prueba 4: Verificar que el formulario en `index.html` / `app.js` disponga de los campos `#tx-input-supplier`, `#btn-camera-invoice`, `#btn-upload-invoice` y contenedor `#tx-invoice-preview`.
  - Prueba 5: Verificar que la tabla de movimientos en `app.js` renderice el proveedor y el enlace/botón al PDF si existe.

## Fase 2: Implementación TDD Green
- Modificar `schema.sql`:
  - Añadir columnas `supplier TEXT` e `invoice_pdf TEXT`, `invoice_name TEXT` en `CREATE TABLE transactions`.
- Modificar `assets/js/financeCalculations.js`:
  - Implementar `normalizarProveedor(supplier)`.
  - Implementar `generarNombreComprobante(txDesc, date, extension)`.
  - Actualizar `validarTransaccion` para validar atributos de comprobante si están presentes.
- Modificar `index.html`:
  - Incluir CDN de jsPDF para conversión cliente de fotos a PDF.
- Modificar `assets/js/app.js`:
  - En `openTransactionModal`:
    - Añadir campo de entrada `#tx-input-supplier`.
    - Añadir controles de adjuntos (cámara y selector de archivo).
    - Implementar manejadores para captura con cámara, compresión en canvas y conversión a PDF.
    - Manejar estado de vista previa y eliminación del comprobante.
    - Guardar y precargar `supplier`, `invoicePdf`, `invoiceName`.
  - En `renderTransactionsTable` y `renderAccountDetailView`:
    - Desplegar el proveedor en la columna de concepto/descripción.
    - Desplegar botón de visualización/descarga de PDF cuando `invoicePdf` exista.
    - Implementar modal o visor interactivo para abrir el PDF.

## Fase 3: Validación y Cierre
- Ejecutar suite de pruebas: `node --test tests/*.test.js` (asegurar 100% verde).
- Incrementar versión de Service Worker a `contapersonal-v16` en `sw.js`.
- Actualizar `memory.md`.
- Confirmar con git commit y git push a GitHub.

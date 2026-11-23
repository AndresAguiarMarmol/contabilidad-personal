# Plan de Implementación — Spec 034: Extracción de Datos desde PDF

## Fase 1: Pruebas Unitarias TDD Red
- Crear `tests/pdf-data-extraction.test.js`:
  - Prueba 1: Probar `parsearFechaComprobante` con múltiples formatos de fechas chilenas/latinoamericanas (`23/11/2026`, `23-11-2026`, `2026-11-23`, `23 de noviembre de 2026`).
  - Prueba 2: Probar `parsearMontoComprobante` con textos típicos de boletas/facturas (`TOTAL A PAGAR: $ 45.990`, `TOTAL: $15.000`, `IMPORTE TOTAL: 120.500 CLP`).
  - Prueba 3: Probar `inferirProveedorComprobante` identificando razones sociales y nombres comerciales conocidos (`ENEL DISTRIBUCION CHILE S.A.`, `WALMART CHILE`, etc.).
  - Prueba 4: Probar `inferirMedioPagoComprobante` reconociendo Débito/Redcompra, Tarjeta de Crédito, Transferencia y Efectivo.
  - Prueba 5: Probar `inferirCategoriaComprobante` mapeando el rubro del comprobante hacia el catálogo contable del Plan de Cuentas (servicios básicos, supermercado, salud, transporte, etc.).
  - Prueba 6: Probar la función consolidadora `extraerDatosDesdeTextoComprobante`.
  - Prueba 7: Verificar presencia de banner de autocompletado y funciones de extracción en `app.js` e `index.html`.

## Fase 2: Implementación TDD Green
- Modificar `assets/js/financeCalculations.js`:
  - Implementar `parsearFechaComprobante(texto)`.
  - Implementar `parsearMontoComprobante(texto)`.
  - Implementar `inferirProveedorComprobante(texto)`.
  - Implementar `inferirMedioPagoComprobante(texto)`.
  - Implementar `inferirCategoriaComprobante(texto, proveedor, catalogo)`.
  - Implementar `extraerDatosDesdeTextoComprobante(texto, catalogo)`.
  - Exportar todas las funciones en `Calculations`.
- Modificar `index.html`:
  - Agregar librerías CDN para `pdf.js` y `tesseract.js` con soporte asíncrono y workers.
- Modificar `assets/js/app.js`:
  - Integrar extractor de texto para PDFs con `pdf.js` (`extraerTextoDesdePdf`).
  - Integrar extractor de texto para imágenes con `Tesseract.js` (`extraerTextoDesdeImagen`).
  - En `openTransactionModal`, tras procesar el PDF o la foto, ejecutar la extracción y autocompletar `#tx-input-date`, `#tx-input-amount`, `#tx-input-supplier`, `#tx-input-method`, `#tx-input-category` y `#tx-input-desc`.
  - Desplegar tarjeta de notificación de autocompletado `#tx-auto-extracted-banner`.

## Fase 3: Validación y Cierre
- Ejecutar suite de pruebas: `node --test tests/*.test.js` (asegurar 100% verde).
- Incrementar versión de Service Worker a `contapersonal-v17` en `sw.js`.
- Actualizar `memory.md`.
- Confirmar con git commit y git push a GitHub.

# Spec 034 — Extracción y Autocompletado de Campos desde Factura/Boleta PDF

## Contexto
En el flujo contable personal de registro de gastos e ingresos, el usuario solicita automatizar la lectura de los comprobantes adjuntos (facturas, boletas, comprobantes tributarios):
*"Leer del PDF los campos fecha, categoria , Proveedor , Monto de Transaccion , tipo de pago y asignarlo a los campos de la BD"*

Actualmente, el sistema permite adjuntar un PDF o tomar una foto y convertirla a PDF (Spec 033), pero el usuario debe digitar manualmente la fecha, el proveedor, el monto, la categoría y el medio de pago.

Esta especificación implementa un motor de **extracción y autocompletado inteligente**:
1. Para **documentos PDF digitales nativos** (descargados de bancos, servicios o comercio electrónico): lectura del flujo de texto con `pdf.js`.
2. Para **fotos y comprobantes físicos escaneados**: reconocimiento óptico de caracteres (OCR) en cliente con `Tesseract.js` sobre la imagen/canvas.
3. **Motor heurístico y determinista (`Calculations.extraerDatosDesdeTextoComprobante`)**: análisis semántico del texto extraído para identificar con alta precisión:
   - **Fecha (`fecha`):** Detección de patrones de fecha chilenos e internacionales (`DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`, etc.).
   - **Monto (`monto`):** Localización de palabras clave de cierre contable (`TOTAL`, `TOTAL A PAGAR`, `TOTAL VENTA`, `MONTO TOTAL`) y normalización numérica.
   - **Proveedor (`proveedor`):** Detección de cabeceras comerciales, razones sociales y marcas conocidas (ej: Enel, Aguas Andinas, Líder, Falabella, CGE, Copec, etc.) o palabras clave (`Emisor:`, `Razón Social:`).
   - **Tipo de pago (`tipoPago`):** Clasificación según términos detectados (`Tarjeta de Crédito`, `Débito`, `Redcompra`, `Transferencia`, `Efectivo`).
   - **Categoría (`categoria`):** Inferencia contextual mapeada contra el catálogo del Plan de Cuentas vigente (Clase 5 Gastos / Clase 4 Ingresos).
4. **Asignación inmediata en formulario y base de datos:** Los campos se precargan reactivamente en el formulario modal para que el usuario pueda validarlos/ajustarlos antes de guardar, persistiendo finalmente en la BD (`localStorage`, Supabase `schema.sql` y Firestore `workspaces/{uid}`).

---

## Requerimientos Funcionales (EARS)

### RF-1: Motor Puro de Análisis y Extracción Heurística
- **Ubiquitous:** The system SHALL exponer la función pura `Calculations.extraerDatosDesdeTextoComprobante(texto, catalogo)` que retorne un objeto `{ fecha, monto, proveedor, tipoPago, categoria, categoriaCodigo, confianza }`.
- **Event-driven:** WHEN se suministre un texto con fechas (`DD/MM/YYYY`, etc.), the system SHALL normalizar la fecha al formato estándar `YYYY-MM-DD`.
- **Event-driven:** WHEN se identifiquen palabras clave de monto (`TOTAL`, `TOTAL A PAGAR`, `$`), the system SHALL extraer el importe monetario correspondiente sin símbolos ni puntuación conflictiva.
- **Event-driven:** WHEN se detecten términos de medios de pago (`Débito`, `Redcompra`, `Crédito`, `Transferencia`, `Efectivo`), the system SHALL retornar el identificador correspondiente (`debit`, `credit`, `transfer`, `cash`).
- **Event-driven:** WHEN se detecte un comercio o rubro reconocible, the system SHALL inferir la categoría contable correspondiente según el catálogo del Plan de Cuentas.

### RF-2: Extracción de Texto de Documentos PDF
- **Event-driven:** WHEN el usuario cargue un archivo PDF (`.pdf`), the system SHALL utilizar `pdf.js` para extraer el flujo textual de sus páginas y alimentar el motor de análisis.

### RF-3: Extracción de Texto de Fotos y Comprobantes Escaneados (OCR)
- **Event-driven:** WHEN el usuario tome una foto con la cámara o cargue una imagen (`.jpg`, `.png`), the system SHALL ejecutar OCR en cliente mediante `Tesseract.js` sobre la imagen/canvas optimizado para obtener el texto del comprobante y alimentar el motor de análisis.

### RF-4: Autocompletado Reactivo en Formulario de Transacción
- **Event-driven:** WHEN el motor de extracción devuelva valores detectados, the system SHALL asignar automáticamente los valores a los campos `#tx-input-date`, `#tx-input-amount`, `#tx-input-supplier`, `#tx-input-category` y `#tx-input-method`, desplegando un banner informativo de autocompletado que permita al usuario revisar o ajustar los datos antes de guardarlos.

### RF-5: Persistencia en Base de Datos
- **Event-driven:** WHEN el usuario confirme el guardado del movimiento, the system SHALL almacenar todos los campos extraídos y validados en el modelo `Transaction`, en `localStorage` y en la sincronización en la nube con Cloud Firestore.

---

## Requerimientos No Funcionales (RNF)

- **RNF-1 (Cero Regresiones):** No alterar las 157 pruebas unitarias vigentes.
- **RNF-2 (Operación Defensiva):** Si la lectura o el OCR fallan o el texto no contiene patrones reconocibles, el sistema debe registrar el archivo sin bloquear el formulario y notificar limpiamente al usuario.
- **RNF-3 (Privacidad 100% en Cliente):** Todo el procesamiento de lectura de PDF y OCR se realiza localmente en el navegador del usuario, sin enviar archivos a APIs externas de terceros.

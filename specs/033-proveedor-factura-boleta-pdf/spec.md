# Spec 033 — Registro de Proveedor, Factura/Boleta PDF y Conversión de Fotos en Transacciones

## Contexto
En la gestión contable y financiera personal/familiar, los usuarios necesitan vincular sus movimientos con:
1. El **Proveedor o Beneficiario** específico que recibe los fondos (ej: supermercado, proveedor de servicios básicos, colegiatura, tienda comercial, etc.).
2. El comprobante tributario o respaldo formal (**Factura / Boleta**) en formato PDF.
3. La capacidad operativa de capturar directamente con la cámara del dispositivo móvil o smartphone una foto de la boleta/factura física, convertirla automáticamente a un documento PDF optimizado y asignarla a la transacción.

Para garantizar viabilidad en entornos PWA y almacenamiento local (`localStorage` / Firestore), las imágenes capturadas con la cámara deben comprimirse adecuadamente en cliente antes de ensamblar el PDF, evitando saturar cuotas de almacenamiento mientras se preserva total legibilidad del comprobante.

---

## Requerimientos Funcionales (EARS)

### RF-1: Campo "Proveedor" en Base de Datos y Modelo de Transacciones
- **Ubiquitous:** The system SHALL incluir el campo `supplier` (TEXT, opcional) en la tabla `transactions` de `schema.sql` y en el objeto `Transaction` para almacenar el nombre del proveedor o beneficiario.
- **Event-driven:** WHEN se visualice o edite una transacción, the system SHALL disponer del campo interactivo `#tx-input-supplier` precargado con el valor existente o vacío si no aplica.

### RF-2: Campo "Factura-Boleta" (PDF) en Base de Datos y Modelo
- **Ubiquitous:** The system SHALL incluir los campos `invoice_pdf` (TEXT, opcional) e `invoice_name` (TEXT, opcional) en la tabla `transactions` de `schema.sql` y en el objeto `Transaction` (`invoicePdf` en formato Data URL Base64 y `invoiceName` como nombre descriptivo).
- **Event-driven:** WHEN una transacción disponga de un comprobante PDF adjunto, the system SHALL desplegar en la tabla del Libro de Movimientos y Detalle de Cuenta un botón accesible para visualizar o descargar dicho documento PDF.

### RF-3: Captura de Foto y Conversión Automática a PDF
- **Event-driven:** WHEN el usuario pulse el botón "Tomar Foto" (`#btn-camera-invoice`) desde el formulario de movimiento en un dispositivo móvil o PC, the system SHALL activar la cámara mediante `<input type="file" accept="image/*" capture="environment">`.
- **State-driven:** WHILE se procese una imagen capturada o seleccionada, the system SHALL redimensionar y comprimir la imagen en un canvas HTML (ancho máximo 1200px, compresión JPEG) y compilarla como un documento PDF estándar (Data URL `data:application/pdf;base64,...`).
- **Event-driven:** WHEN la conversión a PDF finalice, the system SHALL asociar el archivo generado al campo `#tx-input-invoice-pdf`, mostrando una tarjeta de vista previa con el nombre del archivo, tamaño aproximado y opciones para previsualizar o desadjuntar.

### RF-4: Carga Directa de Archivo PDF Existente
- **Event-driven:** WHEN el usuario seleccione directamente un archivo PDF desde su dispositivo mediante el botón "Cargar Documento" (`#btn-upload-invoice`), the system SHALL leerlo y asignarlo directamente como comprobante de la transacción.

### RF-5: Persistencia, Edición y Sincronización
- **Event-driven:** WHEN se guarde la transacción (nueva o editada), the system SHALL persistir `supplier`, `invoicePdf` e `invoiceName` en `localStorage` y en la sincronización en la nube con Cloud Firestore (`workspaces/{uid}`).

---

## Requerimientos No Funcionales (RNF)

- **RNF-1 (Optimización de Tamaño):** Las fotos convertidas a PDF no deben exceder un tamaño razonable para `localStorage` (típicamente $\le 400\text{ KB}$ por comprobante mediante compresión previa en canvas).
- **RNF-2 (Cero Regresiones):** Las 151 pruebas unitarias previas deben continuar pasando al 100%.
- **RNF-3 (Compatibilidad Universal):** La funcionalidad de conversión y visualización debe operar de forma defensiva tanto con jsPDF disponible como con mecanismos de respaldo nativos en el navegador.

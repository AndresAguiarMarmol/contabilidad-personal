# SPEC-047: Visor Integrado de Comprobantes PDF (In-App PDF Viewer Modal) con Retorno Garantizado en iOS / iPhone

## 1. Contexto y Justificación
Al visualizar un comprobante PDF adjunto a una transacción desde un iPhone (utilizando Safari o la aplicación instalada como PWA en modo standalone), el comportamiento previo mediante `window.open` o navegación a la Data URL provocaba la sustitución del contexto de la aplicación por el visor nativo de PDF de iOS. Dado que las PWAs en iOS carecen de barra de navegación y botón "Atrás" del navegador, los usuarios quedaban atrapados en el documento PDF sin posibilidad de volver a la aplicación sin forzar el cierre de la misma.

Para garantizar una experiencia móvil fluida, confiable y con retorno asegurado, se debe sustituir la apertura en nueva ventana o navegación externa por un **Visor de PDF Integrado dentro de la App (In-App PDF Viewer Modal)**. Este modal se despliega sobre la vista activa sin abandonar la aplicación, ofreciendo un botón prominente y accesible de "Volver a la App" o "Cerrar", previsualización del documento, botón de descarga directa y soporte para compartir nativamente mediante `navigator.share` (iOS Share Sheet).

## 2. Lenguaje Ubicuo (Ubiquitous Language)
- **Visor Integrado de PDF (`#modal-pdf-viewer`):** Cuadro de diálogo modal (`<dialog>`) nativo HTML5 que contiene el iframe o visor del archivo PDF y los controles superiores de navegación.
- **Botón Volver a la App (`#btn-close-pdf-modal`):** Botón táctil destacado en la cabecera del visor que cierra el modal y devuelve al usuario exactamente al punto del Libro de Movimientos donde se encontraba.
- **Compartir Nativo (`navigator.share`):** API web que permite invocar la hoja nativa de iOS para enviar el PDF por AirDrop, WhatsApp, correo o guardarlo en la app Archivos de Apple.

## 3. Requisitos Funcionales (EARS)

### Ubiquitous / Siempre activos
- **RF-1 (Modal Dedicado en el DOM):** El sistema **debe** incluir en `index.html` el elemento `<dialog id="modal-pdf-viewer">` con cabecera fija, título (`#pdf-modal-filename`), botón de cierre (`#btn-close-pdf-modal`), botón de descarga (`#btn-download-pdf-modal`), botón de compartir (`#btn-share-pdf-modal`) y marco de visualización (`#pdf-viewer-frame`).
- **RF-2 (Retorno Inmediato a la App):** Al pulsar `#btn-close-pdf-modal` o la tecla Escape, el sistema **debe** cerrar el modal (`modal.close()`), revocar URLs temporales creadas para el visor para evitar fugas de memoria, y devolver el foco a la aplicación sin recargar la página.
- **RF-3 (Apertura In-App en `abrirComprobantePdf`):** La función `abrirComprobantePdf(dataUrl, fileName)` **debe** abrir el modal integrado `#modal-pdf-viewer` en lugar de invocar `window.open` o alterar `window.location`.
- **RF-4 (Soporte Táctil Optimizado para Móvil / iOS):** La cabecera del visor **debe** mantener una barra de herramientas con altura táctil mínima de 44px (`min-h-[44px]`), botón de retorno de fácil pulsación con icono de flecha/cruz y texto visible "Volver", y el visor debe ocupar el área visual (`h-[92vh]` o adaptativo) con desplazamiento táctil suave (`-webkit-overflow-scrolling: touch;`).
- **RF-5 (Visualización desde Detalle de Cuenta):** El sistema **debe** conectar los botones `.btn-view-invoice` dentro de la vista de Detalle de Cuenta (`#view-account-detail`) para que invoquen `abrirComprobantePdf` de la misma manera que en el Libro de Movimientos.

## 4. Requisitos No Funcionales (NFR)
- **RNF-1 (Compatibilidad PWA iOS):** El visor debe funcionar perfectamente en iOS Safari tanto en navegador web como en pantalla completa (Modo Standalone PWA).
- **RNF-2 (Eficiencia de Memoria):** Convertir las Data URLs base64 a objetos `Blob` temporales con `URL.createObjectURL()` y revocarlos con `URL.revokeObjectURL()` al cerrar el modal.
- **RNF-3 (Caché PWA):** Incrementar la versión de caché del Service Worker a `contapersonal-v30` en `sw.js`.

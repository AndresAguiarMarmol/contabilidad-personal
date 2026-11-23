# Plan de Implementación — Spec 031: Viewport iOS Header y Footer

## Fase 1: Pruebas Unitarias TDD Red
- Crear `tests/ios-viewport-header-footer.test.js`:
  - Prueba 1: Verificar que `<meta name="viewport">` contenga `viewport-fit=cover`.
  - Prueba 2: Verificar que `assets/css/styles.css` defina reglas para `100dvh`, `-webkit-fill-available`, `.header-safe` y `.footer-safe` con `env(safe-area-inset-*)`.
  - Prueba 3: Verificar que `<header>` en `index.html` posea la clase `.header-safe`, mantenga `flex-shrink-0` y optimice botones móviles (`#btn-quick-new-tx` y `#btn-quick-sync`).
  - Prueba 4: Verificar que `#app-footer` posea la clase `.footer-safe` y `<main>` disponga de contención de desplazamiento (`main-scroll-safe`).

## Fase 2: Implementación TDD Green
- Modificar `assets/css/styles.css`:
  - Agregar soporte para `100dvh` y `-webkit-fill-available` en `html`, `body` y `#app-container`.
  - Agregar clases de utilidad `.header-safe`, `.footer-safe` y `.main-scroll-safe`.
- Modificar `index.html`:
  - Actualizar meta viewport: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`.
  - Aplicar `.header-safe` en `<header>`.
  - Compactar acciones en `<header>` para móviles (`#btn-quick-new-tx` y `#btn-quick-sync`).
  - Aplicar `.main-scroll-safe` en `<main>`.
  - Aplicar `.footer-safe` en `#app-footer`.

## Fase 3: Validación y Cierre
- Ejecutar suite de pruebas: `node --test tests/*.test.js` (asegurar 100% verde).
- Incrementar versión del Service Worker a `contapersonal-v14` en `sw.js`.
- Actualizar memoria en `memory.md`.
- Confirmar con git commit y git push.

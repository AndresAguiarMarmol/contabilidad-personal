# Plan de Implementación — Spec 032: Header en 2 Líneas

## Fase 1: Pruebas Unitarias TDD Red
- Crear `tests/header-two-lines.test.js`:
  - Prueba 1: Verificar que `<header>` incluya estructura de dos líneas (`flex-col` con dos filas hijas `justify-between`).
  - Prueba 2: Verificar que la primera fila contenga la marca `ContaPersonal` / `Finanzas Personales` y el `#auth-user-widget`.
  - Prueba 3: Verificar que la segunda fila contenga `#page-title` / `#page-subtitle` a la izquierda y `#btn-quick-sync`, `#btn-quick-new-tx`, `#btn-open-sidebar` a la derecha.
  - Prueba 4: Verificar que `#page-title` ya no esté restringido a pantallas `xl` (`hidden xl:flex`) sino visible en móvil.

## Fase 2: Implementación TDD Green
- Modificar `index.html`:
  - Reestructurar `<header>` con contenedor `flex flex-col` y dos sub-contenedores de fila.
  - Fila 1: Marca a la izquierda, `#auth-user-widget` a la derecha.
  - Fila 2: Título de página a la izquierda, botones `#btn-quick-sync`, `#btn-quick-new-tx` y `#btn-open-sidebar` a la derecha.
- Modificar `assets/css/styles.css` si es necesario para ajustar el cálculo de altura mínima en `.header-safe`.

## Fase 3: Validación y Cierre
- Ejecutar suite de pruebas: `node --test tests/*.test.js` (asegurar 100% verde en todas las pruebas).
- Incrementar versión del Service Worker a `contapersonal-v15` en `sw.js`.
- Actualizar `memory.md`.
- Confirmar con git commit y push a GitHub.

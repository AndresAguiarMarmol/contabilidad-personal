# Tareas de Implementación — Spec 028: Ergonomía Móvil del Dashboard y Alineación Inferior del Footer

**Estado:** Completado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## Checklist de Tareas

- [x] **Tarea 1 (TDD Red):** Crear archivo de pruebas `tests/dashboard-responsive-footer.test.js` verificando clases responsivas de métricas (2 por fila en móvil), compactación de tarjetas y `mt-auto` + `flex flex-col` en footer/main.
- [x] **Tarea 2 (TDD Green - Cuadrícula y Tarjetas Dashboard):**
  - Actualizar el contenedor de métricas en `#view-dashboard` a `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4`.
  - Compactar las 4 tarjetas con `p-3 sm:p-5`, textos proporcionados e iconos `w-9 h-9 sm:w-12 sm:h-12`.
  - Actualizar `#dash-budget-progress-list` a `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3`.
- [x] **Tarea 3 (TDD Green - Footer Bottom Sticky en PC):**
  - Aplicar `flex flex-col` a `<main>` en `index.html`.
  - Aplicar `mt-auto flex-shrink-0` a `#app-footer` en `index.html`.
- [x] **Tarea 4 (Verificación Global):** Ejecutar `node --test tests/*.test.js` y asegurar 100% pasando (133 previas + nuevas pruebas).
- [x] **Tarea 5 (Cache y Service Worker):** Incrementar la versión de cache en `sw.js` a `contapersonal-v11`.
- [x] **Tarea 6 (Memoria del Proyecto):** Actualizar `memory.md` (Secciones 2 y 3).
- [x] **Tarea 7 (Git & Despliegue):** Realizar commit y push de los cambios a GitHub `main`.
- [x] **Tarea 8 (Notificación al Usuario):** Informar al usuario sobre los ajustes de tamaño en iPhone y posición inferior del footer en PC.

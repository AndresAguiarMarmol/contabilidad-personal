# Tareas de Implementación — Spec 029: Ergonomía Móvil de Cuentas Financieras (2 por Fila en iPhone)

**Estado:** Completado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## Checklist de Tareas

- [x] **Tarea 1 (TDD Red):** Crear archivo de pruebas `tests/accounts-responsive.test.js` verificando clases de 2 columnas en `#accounts-grid` y tarjetas compactas `p-3 sm:p-5` en `app.js`.
- [x] **Tarea 2 (TDD Green - Cuadrícula en index.html):**
  - Modificar `#accounts-grid` a `grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4` en `index.html`.
- [x] **Tarea 3 (TDD Green - Tarjetas Compactas en app.js):**
  - Actualizar plantilla en `renderAccounts()` con dimensiones proporcionales para móviles (`p-3 sm:p-5`, iconos y botones compactos).
- [x] **Tarea 4 (Verificación Global):** Ejecutar `node --test tests/*.test.js` y asegurar 100% pasando (137 previas + nuevas pruebas).
- [x] **Tarea 5 (Cache y Service Worker):** Incrementar la versión de cache en `sw.js` a `contapersonal-v12`.
- [x] **Tarea 6 (Memoria del Proyecto):** Actualizar `memory.md` (Secciones 2 y 3).
- [x] **Tarea 7 (Git & Despliegue):** Realizar commit y push de los cambios a GitHub `main`.
- [x] **Tarea 8 (Notificación al Usuario):** Informar al usuario sobre la nueva visualización de 2 cuentas por fila en iPhone.

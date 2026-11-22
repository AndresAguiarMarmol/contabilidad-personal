# Tareas de Implementación — Spec 030: Header de Aplicación con Identidad de Marca y Menú a la Derecha

**Estado:** Completado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## Checklist de Tareas

- [x] **Tarea 1 (TDD Red):** Crear archivo de pruebas `tests/header-layout.test.js` verificando que el header contenga "ContaPersonal", "Finanzas Personales", y que `#btn-open-sidebar` esté a la derecha con "Menú".
- [x] **Tarea 2 (TDD Green - Maquetación en index.html):**
  - Modificar el `<header>` en `index.html` para incluir el bloque de marca a la izquierda y el botón de menú a la derecha.
  - Preservar `#page-title` y `#page-subtitle` en el DOM.
- [x] **Tarea 3 (TDD Green - Control de Toggle en app.js):**
  - Actualizar el evento de `#btn-open-sidebar` en `assets/js/app.js` para soportar apertura en móvil y toggle en PC.
- [x] **Tarea 4 (Verificación Global):** Ejecutar `node --test tests/*.test.js` y asegurar 100% pasando (140 previas + nuevas pruebas).
- [x] **Tarea 5 (Cache y Service Worker):** Incrementar la versión de cache en `sw.js` a `contapersonal-v13`.
- [x] **Tarea 6 (Memoria del Proyecto):** Actualizar `memory.md` (Secciones 2 y 3).
- [x] **Tarea 7 (Git & Despliegue):** Realizar commit y push de los cambios a GitHub `main`.
- [x] **Tarea 8 (Notificación al Usuario):** Informar al usuario sobre la nueva cabecera y la disposición del menú.

# Tareas de Implementación — Spec 027: Footer de Créditos, Versión y Contacto

**Estado:** Completado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## Checklist de Tareas

- [x] **Tarea 1 (TDD Red):** Crear archivo de pruebas `tests/footer-credits.test.js` verificando la presencia en el DOM de autoría, versión, enlace a WhatsApp y atributos de seguridad.
- [x] **Tarea 2 (TDD Green - Marcado HTML en App):**
  - Agregar `<footer id="app-footer">` al final de `<main>` en `index.html`.
  - Agregar créditos en la pantalla de bienvenida `#auth-gate-screen` en `index.html`.
- [x] **Tarea 3 (Verificación Global):** Ejecutar `node --test tests/*.test.js` y asegurar 100% pasando (129 previas + nuevas pruebas).
- [x] **Tarea 4 (Cache y Service Worker):** Incrementar la versión de cache en `sw.js` a `contapersonal-v10`.
- [x] **Tarea 5 (Memoria del Proyecto):** Actualizar `memory.md` (Secciones 2 y 3).
- [x] **Tarea 6 (Git & Despliegue):** Realizar commit y push de los cambios a GitHub `main`.
- [x] **Tarea 7 (Notificación al Usuario):** Informar al usuario sobre los créditos incorporados.

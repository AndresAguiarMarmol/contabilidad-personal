# Plan Técnico — Spec 027: Footer de Créditos, Versión y Contacto

**Estado:** Aprobado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Arquitectura y Estructura en el DOM

El pie de página (footer) se implementará mediante marcado semántico `<footer>` con estilos CSS utilitarios de Tailwind compatibles con el modo oscuro y claro de la aplicación.

### Puntos de Inserción:
1. **Pie del Área Principal (`index.html` al final de `<main>`):**
   - Elemento `<footer id="app-footer">` al final de `<main class="flex-1 overflow-y-auto ...">`.
   - Incluye separador superior con borde sutil, textos destacados en negrita, insignia de versión y enlace estilizado a WhatsApp con icono representativo o formato legible.
2. **Pie de la Pantalla de Acceso (`#auth-gate-screen`):**
   - Bloque complementario debajo de la tarjeta de autenticación de Firebase en `#auth-gate-screen`.
   - Colores con contraste optimizado sobre el fondo oscuro del gate.

---

## 2. Marcado HTML Propuesto

```html
<!-- Footer Global de la Aplicación -->
<footer id="app-footer" class="mt-12 pt-6 pb-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
  <p class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
    <span><strong class="font-semibold text-slate-700 dark:text-slate-300">Análisis y Diseño:</strong> Andres Aguiar</span>
    <span class="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
    <span><strong class="font-semibold text-slate-700 dark:text-slate-300">Versión:</strong> V1.0 — Santiago de Chile</span>
  </p>
  <p class="flex items-center justify-center gap-1.5">
    <strong class="font-semibold text-slate-700 dark:text-slate-300">Contacto / WhatsApp:</strong>
    <a href="https://wa.me/56933395447" target="_blank" rel="noopener noreferrer" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold underline underline-offset-2 transition-colors inline-flex items-center gap-1">
      <span>+56933395447</span>
    </a>
  </p>
</footer>
```

---

## 3. Estrategia de Pruebas Unitarias

Archivo: `tests/footer-credits.test.js` ejecutado con `node --test`:
- Valida que `index.html` contenga el elemento `#app-footer`.
- Valida la presencia de la cadena "Análisis y Diseño: Andres Aguiar".
- Valida la presencia de "Versión: V1.0 — Santiago de Chile".
- Valida que el enlace de WhatsApp tenga `href="https://wa.me/56933395447"` y el texto `+56933395447`.
- Valida que el enlace contenga `target="_blank"` y `rel="noopener noreferrer"`.
- Valida la presencia en `#auth-gate-screen`.

# Plan Técnico — Spec 028: Ergonomía Móvil del Dashboard y Alineación Inferior del Footer

**Estado:** Aprobado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Arquitectura de Cambios y Maquetación

### Componente 1: Cuadrícula y Tarjetas del Dashboard (`index.html`)
- Cambiar la clase del contenedor de métricas en `#view-dashboard`:
  - Anterior: `class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"`
  - Nuevo: `class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4"`
- Ajustar las 4 tarjetas de métricas:
  - Contenedor: `p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between`
  - Textos de etiqueta: `text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate`
  - Cifras monetarias: `text-base sm:text-xl md:text-2xl font-bold mt-0.5 sm:mt-1 tabular-nums truncate`
  - Subtítulos: `text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate`
  - Contenedor de icono: `w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ... flex-shrink-0 ml-1.5`
  - Iconos SVG: `w-4 h-4 sm:w-6 sm:h-6`
- Lista de presupuestos en Dashboard (`#dash-budget-progress-list`):
  - Anterior: `class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"`
  - Nuevo: `class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3"`

### Componente 2: Footer en la Parte Baja de la Pantalla (PC / Móvil)
- En el contenedor `<main>` de `index.html`:
  - Anterior: `class="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950"`
  - Nuevo: `class="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950 flex flex-col min-h-0"`
- En el elemento `#app-footer` de `index.html`:
  - Anterior: `class="mt-12 pt-6 pb-6 border-t ..."`
  - Nuevo: `class="mt-auto pt-8 pb-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5 flex-shrink-0"`
- Este patrón clásico de flexbox (`flex-col` en el contenedor padre + `mt-auto` en el hijo terminal) absorbe todo el espacio vertical sobrante cuando las vistas tienen poco contenido, fijando el pie de página visualmente al fondo de la pantalla en PC sin superponerse ni quedar flotando a media altura.

---

## 2. Estrategia de Pruebas Unitarias

Archivo: `tests/dashboard-responsive-footer.test.js`:
- Verificar que el contenedor de métricas en `#view-dashboard` utilice `grid-cols-2`.
- Verificar que las tarjetas de métricas incluyan `p-3` en móvil y `sm:p-5`.
- Verificar que `#dash-budget-progress-list` utilice `grid-cols-2` en móvil.
- Verificar que `<main>` incluya `flex flex-col`.
- Verificar que `#app-footer` incluya `mt-auto` y `flex-shrink-0`.

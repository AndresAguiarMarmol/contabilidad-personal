# Plan Técnico — Spec 030: Header de Aplicación con Identidad de Marca y Menú a la Derecha

**Estado:** Aprobado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Arquitectura y Maquetación del Header

### 1.1 Estructura en `index.html` (`<header>`)
```html
<header class="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-4 md:px-6 flex-shrink-0 gap-2">
  
  <!-- Lado Izquierdo: Identidad de Marca solicitada -->
  <div class="flex items-center gap-2.5 min-w-0">
    <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-sm flex-shrink-0">
      <i data-lucide="wallet" class="w-4 h-4"></i>
    </div>
    <div class="min-w-0">
      <span class="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white truncate block">
        Conta<span class="text-emerald-600 dark:text-emerald-400">Personal</span>
      </span>
      <span class="block text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
        Finanzas Personales
      </span>
    </div>

    <!-- Título de vista activa preservado (visible en pantallas grandes) -->
    <div class="hidden xl:flex flex-col pl-4 border-l border-slate-200 dark:border-slate-800 ml-1">
      <h1 id="page-title" class="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">Dashboard Patrimonial</h1>
      <p id="page-subtitle" class="text-[10px] text-slate-400 truncate max-w-[240px]">Resumen de patrimonio neto, ingresos y gastos</p>
    </div>
  </div>

  <!-- Lado Derecho: Acciones Rápidas y Botón de Menú -->
  <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
    <!-- Widget Auth -->
    <div id="auth-user-widget" class="flex items-center"></div>

    <!-- Sync -->
    <button id="btn-quick-sync" title="Sincronizar con la nube (Firebase)" class="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition-all active:scale-95">
      <i id="quick-sync-icon" data-lucide="cloud" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
      <span id="quick-sync-text" class="hidden sm:inline">Sincronizar</span>
    </button>

    <!-- Nuevo Movimiento -->
    <button id="btn-quick-new-tx" class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all shadow-emerald-600/20 active:scale-95">
      <i data-lucide="plus-circle" class="w-4 h-4"></i>
      <span class="hidden sm:inline">Nuevo Movimiento</span>
      <span class="sm:hidden">Nuevo</span>
    </button>

    <!-- Botón Menú ubicado a la derecha -->
    <button id="btn-open-sidebar" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all text-xs font-semibold active:scale-95" title="Abrir / Alternar Menú de Navegación">
      <i data-lucide="menu" class="w-4 h-4 text-slate-600 dark:text-slate-300"></i>
      <span>Menú</span>
    </button>
  </div>
</header>
```

### 1.2 Lógica de Navegación en `assets/js/app.js`
- Actualizar el listener de `#btn-open-sidebar`:
  - En móviles (`window.innerWidth < 768`): invoca `openMobileSidebar()`.
  - En desktop (`window.innerWidth >= 768`): conmuta la visibilidad de `#sidebar` (`classList.toggle("md:hidden")`), permitiendo colapsar o expandir el menú lateral.

---

## 2. Estrategia de Pruebas Unitarias

Archivo: `tests/header-layout.test.js`:
- Verificar que `<header>` contenga "ContaPersonal" y "Finanzas Personales" en su contenedor izquierdo.
- Verificar que `#btn-open-sidebar` esté ubicado en el contenedor derecho de `<header>`.
- Verificar que `#btn-open-sidebar` contenga el texto "Menú" y el icono `menu`.
- Verificar que `#page-title` y `#page-subtitle` sigan existiendo en el DOM.

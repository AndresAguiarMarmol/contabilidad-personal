# Plan Técnico — Spec 029: Ergonomía Móvil de Cuentas Financieras (2 por Fila en iPhone)

**Estado:** Aprobado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Modificaciones de Maquetación y Componentes

### 1.1 Contenedor `#accounts-grid` (`index.html`)
- Reemplazar:
  `class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"`
- Por:
  `class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4"`

### 1.2 Plantilla de Tarjetas `.account-card` (`assets/js/app.js` en `renderAccounts`)
- Modificar el marcado generado en el template string:
  - Contenedor de tarjeta: `p-3 sm:p-5 rounded-xl border ... space-y-2.5 sm:space-y-4`
  - Icono principal: `w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl` con icono svg `w-4 h-4 sm:w-5 sm:h-5`
  - Badge de tipo: `text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full ... max-w-[70px] sm:max-w-none truncate`
  - Botones de acción (editar / eliminar): `p-1 sm:p-1.5 rounded-lg` con iconos `w-3 h-3 sm:w-3.5 sm:h-3.5`
  - Nombre de cuenta: `text-xs sm:text-sm font-bold ... truncate`
  - Moneda: `text-[10px] sm:text-xs text-slate-400`
  - Etiqueta de saldo: `text-[10px] sm:text-xs text-slate-500`
  - Saldo numérico: `text-sm sm:text-xl font-bold tabular-nums truncate`
  - Enlace "Ver detalle →": `hidden sm:inline text-[11px] font-semibold ...`

---

## 2. Estrategia de Pruebas Unitarias

Archivo: `tests/accounts-responsive.test.js`:
- Verificar que `#accounts-grid` en `index.html` utilice `grid-cols-2`.
- Verificar que las tarjetas generadas en `renderAccounts` de `assets/js/app.js` contengan las clases responsivas `p-3 sm:p-5` y `w-7 h-7 sm:w-10 sm:h-10`.
- Verificar que los botones de acción rápida conserven sus atributos de evento `data-account-action="edit"` y `data-account-action="delete"`.

# Tareas — Spec 023: Buscador y Filtro de Cuentas Financieras, Billeteras y Tarjetas

- [x] **Fase 1: TDD Red (Pruebas Unitarias)**
  - [x] Crear `tests/accounts-search.test.js` con casos de prueba para `filtrarCuentasFinancieras` (vacío, coincidencia por nombre, por tipo, por divisa, insensibilidad a tildes/mayúsculas, casos límite sin coincidencias).
  - [x] Ejecutar `node --test tests/accounts-search.test.js` y certificar fallo controlado en rojo (Red).
  - *Cubre: RF-2, RF-3, RF-4, RNF-3.* `Hecho cuando: los tests fallan con "filtrarCuentasFinancieras is not a function".`

- [x] **Fase 2: TDD Green (Lógica Pura de Filtrado)**
  - [x] Implementar `filtrarCuentasFinancieras` y función de normalización en `assets/js/financeCalculations.js`.
  - [x] Exportar `filtrarCuentasFinancieras` en el factory universal.
  - [x] Ejecutar `node --test tests/accounts-search.test.js` y validar 100% de tests en verde (Green).
  - *Cubre: RF-2, RF-3, RNF-1, RNF-3.* `Hecho cuando: todos los tests de accounts-search.test.js pasan en verde.`

- [x] **Fase 3: Capa de Interfaz y Enlace Reactivo**
  - [x] En `index.html`: agregar la barra con `#accounts-search-input`, icono `search`, botón `#btn-clear-accounts-search` y contenedor `#accounts-empty-search` en `<section id="view-accounts">`.
  - [x] En `assets/js/app.js`: vincular el input de búsqueda con `state.accountsSearchTerm`, invocar `filtrarCuentasFinancieras` al renderizar la cuadrícula y preservar los listeners de tarjetas, edición y eliminación.
  - [x] Probar limpieza del término con el botón limpiar.
  - *Cubre: RF-1, RF-3, RF-4, RF-5, RNF-2.* `Hecho cuando: al escribir en la barra se filtran en vivo las tarjetas y al borrar se restablecen.`

- [x] **Fase 4: Verificación Integral y Prevención de Regresiones**
  - [x] Ejecutar suite completa `node --test tests/*.test.js` (100% pruebas en verde).
  - [x] Verificar que no haya regresiones en los otros módulos ni en el detalle de cuenta.
  - *Cubre: RNF-1, RNF-3.* `Hecho cuando: 114+ pruebas pasan exitosamente.`

- [x] **Fase 5: Documentación y Sincronización**
  - [x] Actualizar `memory.md` (Sección 1, Sección 2 y Sección 3).
  - [x] Marcar checklist en `tasks.md`.
  - [x] Actualizar service worker `sw.js` si corresponde y realizar git commit + push a `origin/main`.
  - *Cubre: Preservación de memoria y cierre SDD.* `Hecho cuando: commit sincronizado en GitHub y memory.md actualizado.`

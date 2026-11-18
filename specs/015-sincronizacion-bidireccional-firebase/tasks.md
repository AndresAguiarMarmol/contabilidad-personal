# Tareas de Implementación — Spec 015

- [x] **T1: TDD Red (Suite de pruebas unitarias `tests/sync-merge.test.js`)**
  - Diseñar casos de prueba para `Calculations.fusionarEstadoContable`.
  - Probar fusión sin duplicación de transacciones de distintos dispositivos.
  - Probar recálculo contable exacto de saldos de cuentas fusionadas.
  - Probar fusión de cuentas, presupuestos, metas y subcuentas.
  - Ejecutar `node --test tests/sync-merge.test.js` y confirmar fallo controlado (Red).

- [x] **T2: TDD Green (Implementación en `assets/js/financeCalculations.js`)**
  - Implementar la función pura `fusionarEstadoContable(local, remote)`.
  - Recálculo contable automático de `currentBalance` por cuenta aplicando cargos y abonos de todas las transacciones consolidadas (incluyendo splits).
  - Exportar en `Calculations` y ejecutar `node --test tests/sync-merge.test.js` hasta alcanzar 100% verde (5/5).

- [x] **T3: Adaptador Firestore Bidireccional (`assets/js/dbAdapter.js`)**
  - Implementar `fetchRemoteWorkspace(config)`: descarga el documento `workspaces/main` de Firestore (con fallback a backups existentes).
  - Implementar `saveRemoteWorkspace(workspaceData, config)`: guarda el estado consolidado en `workspaces/main` vía PATCH REST.
  - Implementar `syncBidirectional()`: obtiene estado local, descarga remoto, ejecuta `fusionarEstadoContable`, guarda en `localStorage` si hubo cambios, actualiza Firestore y retorna resumen.

- [x] **T4: Integración de Auto-Sync y UI en `assets/js/app.js` e `index.html`**
  - Crear helper `triggerAutoSync(options)` con indicador animado en cabecera.
  - Botón `#btn-quick-sync` en Top Header con icono de nube y feedback visual.
  - Llamar `triggerAutoSync` al arrancar la aplicación (`startApp`).
  - Llamar `triggerAutoSync` tras guardar transacciones, cuentas, presupuestos, metas y plan de cuentas.
  - Escuchar eventos `visibilitychange` y `focus` en ventana para sincronización al volver a la app.
  - Actualizar Service Worker a versión `v3` en `sw.js`.

- [x] **T5: Verificación Integral de Pruebas**
  - Ejecutar `node --test tests/*.test.js` (72/72 pruebas pasando al 100%).
  - Validar sintaxis con `node -c assets/js/*.js` y `sw.js`.

- [x] **T6: Gobernanza, Memoria y Despliegue**
  - Actualizar `memory.md` (secciones 1, 2 y 3).
  - Completar DoD en `specs/015-sincronizacion-bidireccional-firebase/spec.md`.
  - Git commit convencional y push a `origin main`.

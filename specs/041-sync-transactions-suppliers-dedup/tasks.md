# Tareas — Spec 041

- [x] **Tarea 1:** Crear archivo de pruebas TDD `tests/sync-transactions-suppliers-dedup.test.js` con casos para:
  - RF-1: `canonicalizarNombreProveedor` con tildes, mayúsculas, espacios y sufijos legales.
  - RF-2: `deduplicarProveedores` fusionando duplicados canónicos e IDs idénticos/diferentes.
  - RF-3: `fusionarEstadoContable` deduplicando proveedores por nombre canónico e ID sin crear duplicados.
  - RF-4: `sanearWorkspaceParaNube` protegiendo contra payloads que excedan el límite de 1MB de Firestore.
- [x] **Tarea 2:** Implementar funciones puras en `assets/js/financeCalculations.js`.
- [x] **Tarea 3:** Implementar mejoras en `assets/js/dbAdapter.js` (saneamiento de tamaño y reporte real de estado).
- [x] **Tarea 4:** Implementar mejoras en `assets/js/app.js` (cola `hasPendingSync`, control anti-duplicados en tx y settings, compresión optimizada en cámara).
- [x] **Tarea 5:** Ejecutar pruebas específicas y suite completa `node --test tests/*.test.js` (100% pasando: 201/201).
- [x] **Tarea 6:** Actualizar versión en `sw.js` a `contapersonal-v24`.
- [x] **Tarea 7:** Actualizar `memory.md` (Secciones 1, 2 y 3).
- [x] **Tarea 8:** Commit y push a GitHub.

# Tareas de Implementación — Spec 014 (Integración Firebase Firestore & Hosting)

- [x] **T1: Configuración de Firebase CLI en el proyecto**
  - Crear `.firebaserc` asociando el proyecto `mi-propia-contabilidad`.
  - Crear `firebase.json` configurando Hosting y Firestore.
  - Generar `firestore.rules` con reglas de seguridad declarativas autorizadas por el especialista.

- [x] **T2: TDD Red (Suite de pruebas unitarias para adaptador de Firebase)**
  - Crear archivo `tests/firebase-db.test.js`.
  - Diseñar casos de prueba:
    1. Conversión de objetos JS a campos Firestore (`toFirestoreFields`).
    2. Conversión de campos Firestore a objetos JS (`fromFirestoreFields`).
    3. Detección de configuración válida de Firebase en `isConfigured()`.
    4. Validación de parámetros en `testFirebaseConnection()`.
    5. Empaquetado y serialización de respaldos para Firebase.
  - Ejecutar `node --test tests/firebase-db.test.js` y confirmar fallo controlado (Fase Red).

- [x] **T3: TDD Green (Implementación en `assets/js/dbAdapter.js`)**
  - Implementar serializadores `toFirestoreFields` y `fromFirestoreFields`.
  - Implementar `testFirebaseConnection`, `saveBackupToFirebase`, `fetchBackupFromFirebase` y `syncAll`.
  - Exportar funciones y métodos en `DbAdapter`.
  - Ejecutar `node --test tests/firebase-db.test.js` y verificar paso al 100% en verde.

- [x] **T4: Integración en Interfaz de Usuario (`index.html` y `assets/js/app.js`)**
  - Añadir panel de configuración de Firebase en `#view-settings` con los datos del proyecto `mi-propia-contabilidad`.
  - Botón "Probar Conexión con Firebase".
  - Botón "Guardar Configuración de Firebase".
  - Botón "Subir Copia de Respaldo a Firebase" y "Sincronizar Datos".
  - Mensajes de estado claros y feedback visual interactivo.

- [x] **T5: Verificación Integral de Pruebas y Consistencia**
  - Ejecutar `node --test tests/*.test.js` (67/67 pruebas en verde).
  - Validar sintaxis con `node -c assets/js/dbAdapter.js` y `node -c assets/js/app.js`.

- [x] **T6: Gobernanza y Sincronización en GitHub**
  - Completar DoD en `specs/014-integracion-firebase-firestore/spec.md`.
  - Actualizar `memory.md` (secciones 1, 2 y 3).
  - Commit convencional y push a `origin main`.

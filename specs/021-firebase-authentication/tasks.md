# Tareas — Spec 021: Firebase Authentication (Email y Contraseña)

- [x] **Fase 1: TDD Red (Lógica de Autenticación y Pruebas Unitarias)**
  - [x] Crear `tests/auth.test.js` con las pruebas unitarias para validación de credenciales, traducción de errores, extracción de sesión y chequeo de expiración de tokens.
  - [x] Ejecutar `node --test tests/auth.test.js` y confirmar fallo controlado (Red).

- [x] **Fase 2: TDD Green (Implementación en Lógica Pura y Adaptadores)**
  - [x] Implementar utilidades de autenticación (`validarCredencialesAuth`, `traducirErrorFirebaseAuth`, `construirPayloadAuth`, `extraerSesionAuth`, `esTokenExpirado`) en `assets/js/financeCalculations.js`.
  - [x] Implementar métodos de sesión en `assets/js/storage.js` (`getAuthSession`, `saveAuthSession`, `clearAuthSession`).
  - [x] Implementar métodos asíncronos en `assets/js/dbAdapter.js` (`signUpUser`, `signInUser`, `refreshUserToken`, `getValidAuthToken`).
  - [x] Actualizar `fetchRemoteWorkspace`, `saveRemoteWorkspace` y `syncBidirectional` en `assets/js/dbAdapter.js` para usar `workspaces/{uid}` y enviar token Bearer.
  - [x] Ejecutar `node --test tests/auth.test.js` y confirmar éxito en verde (Green).

- [x] **Fase 3: Reglas de Seguridad en Cloud Firestore (`firestore.rules`)**
  - [x] Actualizar `firestore.rules` con el subagente especialista `firestore-rules-author` para proteger `workspaces/{userId}` con `request.auth.uid == userId`.
  - [x] Validar sintaxis de reglas con dry-run de Firebase CLI (`npx firebase deploy --only firestore:rules --dry-run`).

- [x] **Fase 4: Capa de Interfaz y Experiencia de Usuario**
  - [x] En `index.html`:
    - [x] Agregar widget de estado de sesión en la cabecera superior (`#auth-user-widget`).
    - [x] Agregar modal accesible `#auth-modal` con pestañas para "Iniciar Sesión" y "Crear Cuenta", campos con validación y estados de carga.
  - [x] En `assets/js/app.js`:
    - [x] Inicializar estado reactivo de sesión (`state.authSession`).
    - [x] Renderizar widget de usuario (botón Iniciar Sesión vs Avatar/Email y menú Cerrar Sesión).
    - [x] Conectar manejadores de eventos para abrir modal, conmutar tabs, enviar login, enviar registro y cerrar sesión.
    - [x] Disparar auto-sincronización con el workspace privado del usuario al autenticarse.

- [x] **Fase 5: Verificación Integral y Despliegue**
  - [x] Ejecutar la suite completa de pruebas unitarias (`node --test tests/*.test.js`) — 103/103 tests en verde.
  - [x] Actualizar `memory.md` (Sección 1, Sección 2 y Sección 3).
  - [x] Marcar checklist en `tasks.md`.
  - [x] Realizar commit y push a GitHub (`origin/main`).

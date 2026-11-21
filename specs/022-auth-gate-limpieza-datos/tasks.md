# Tareas — Spec 022: Acceso Obligatorio con Firebase Authentication (Auth Gate) y Limpieza Total de Datos

- [x] **Fase 1: TDD Red (Pruebas Unitarias)**
  - [x] Crear `tests/auth-gate.test.js` con pruebas para `puedeAccederApp`, `crearEstadoInicialLimpio` y verificación de limpieza de datos de prueba.
  - [x] Ejecutar `node --test tests/auth-gate.test.js` y confirmar fallo controlado (Red).

- [x] **Fase 2: TDD Green (Lógica Pura y Semillas de Datos Limpias)**
  - [x] Implementar `puedeAccederApp` y `crearEstadoInicialLimpio` en `assets/js/financeCalculations.js`.
  - [x] Modificar `assets/js/mockData.js` para que `INITIAL_ACCOUNTS`, `INITIAL_TRANSACTIONS`, `INITIAL_BUDGETS` e `INITIAL_GOALS` sean arrays vacíos `[]`.
  - [x] Implementar `purgarDatosDemoLocales` en `assets/js/storage.js` para limpiar cuentas y transacciones demo viejas de `localStorage`.
  - [x] Ejecutar `node --test tests/auth-gate.test.js` y confirmar éxito en verde (Green).

- [x] **Fase 3: Capa de Interfaz y Bloqueo de Acceso (Auth Gate Screen)**
  - [x] En `index.html`:
    - [x] Envolver `#sidebar` y la estructura de vistas dentro de `#app-container` (oculto por defecto con `hidden`).
    - [x] Crear la pantalla completa de acceso `#auth-gate-screen` con tarjeta central de Login/Registro.
  - [x] En `assets/js/app.js`:
    - [x] Implementar `evaluarAccesoAuth()` para alternar visibilidad entre `#auth-gate-screen` y `#app-container`.
    - [x] Conectar eventos de formulario de `#auth-gate-screen` para Login y Registro vía `DbAdapter`.
    - [x] En el cierre de sesión, regresar automáticamente a la pantalla de bloqueo y limpiar el estado de la vista.

- [x] **Fase 4: Verificación Integral**
  - [x] Ejecutar suite completa `node --test tests/*.test.js` (100% pruebas en verde).
  - [x] Verificar que no haya regresiones en ninguno de los módulos contables.

- [x] **Fase 5: Documentación y Despliegue**
  - [x] Actualizar `memory.md` (Sección 1, Sección 2 y Sección 3).
  - [x] Marcar checklist en `tasks.md`.
  - [x] Realizar commit y push a GitHub (`origin/main`).

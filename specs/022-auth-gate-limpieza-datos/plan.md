# Plan Técnico — Spec 022: Auth Gate (Acceso Obligatorio) y Limpieza Total de Datos

## 1. Arquitectura de Control de Acceso (Auth Gate)

Se creará una función pura en `assets/js/financeCalculations.js`:
- `puedeAccederApp(authSession, currentTimestampMs = Date.now())`:
  - Retorna `true` si `authSession` existe, contiene `uid`, `idToken` y no ha expirado su margen de validez (o posee `refreshToken`).
  - Retorna `false` en caso contrario.

Se creará una función pura para el estado inicial limpio:
- `crearEstadoInicialLimpio(uid = null, email = null)`:
  - Retorna un objeto `{ accounts: [], transactions: [], budgets: [], goals: [], planAccounts: [], currencies: CURRENCIES_BASE, deletedAccounts: [], deletedPlanAccounts: [], deletedBudgets: [], deletedGoals: [] }`.

---

## 2. Limpieza de Datos Semilla (`assets/js/mockData.js` y `assets/js/storage.js`)

- En `assets/js/mockData.js`:
  - Modificar `INITIAL_ACCOUNTS` para que sea `[]` (vacío).
  - Modificar `INITIAL_TRANSACTIONS` para que sea `[]` (vacío).
  - Modificar `INITIAL_BUDGETS` para que sea `[]` (vacío).
  - Modificar `INITIAL_GOALS` para que sea `[]` (vacío).
- En `assets/js/storage.js`:
  - Incorporar método `purgarDatosDemoLocales()` que limpie las claves de `localStorage` con los datos viejos de demo (`ACC-001`, `TX-001`, etc.), asegurando un inicio en blanco.
  - Al resetear datos o inicializar (`resetToMockData`), dejar cuentas y transacciones en `[]`.

---

## 3. Capa de Presentación e Interfaz (`index.html` y `assets/js/app.js`)

1. **En `index.html`:**
   - Envolver el diseño de la aplicación (`#sidebar`, `#sidebar-backdrop` y el contenedor flex de cabecera y main) dentro de `<div id="app-container" class="hidden flex h-full w-full">`.
   - Crear una sección a pantalla completa `<section id="auth-gate-screen" class="min-h-full w-full bg-slate-900 text-slate-100 flex items-center justify-center p-4">`:
     - Tarjeta central con estética corporativa (brand de ContaPersonal: degradado esmeralda, icono de billetera y escudo de seguridad).
     - Título: "Bienvenido a ContaPersonal"
     - Subtítulo: "Tu plataforma privada de contabilidad y gestión patrimonial"
     - Conmutador de pestañas: "Iniciar Sesión" y "Crear Cuenta".
     - Formulario directo con inputs de email, contraseña (con botón para mostrar/ocultar), spinner animado y mensajes de error amigables.
2. **En `assets/js/app.js`:**
   - Modificar `startApp()`:
     - Evaluar sesión con `evaluarAccesoAuth()`.
     - Si hay sesión válida: oculta `#auth-gate-screen`, remueve `hidden` de `#app-container`, carga los datos del usuario y renderiza la vista activa.
     - Si no hay sesión válida: oculta `#app-container`, muestra `#auth-gate-screen` y enfoca el input de email.
   - Conectar formulario de `#auth-gate-screen` para autenticar contra `DbAdapter.signInUser` o `DbAdapter.signUpUser`.
   - Al cerrar sesión: limpiar estado en memoria, purgar sesión en `Storage` y llamar a `evaluarAccesoAuth()` para bloquear inmediatamente la pantalla.

---

## 4. Plan de Pruebas Unitarias TDD (`tests/auth-gate.test.js`)
- Test 1: `puedeAccederApp` rechaza sesiones nulas, incompletas o sin `uid`.
- Test 2: `puedeAccederApp` aprueba sesiones vigentes con token y UID.
- Test 3: `crearEstadoInicialLimpio` retorna arrays vacíos para cuentas, transacciones, presupuestos y metas, con monedas base predeterminadas.
- Test 4: `purgarDatosDemoLocales` elimina registros ficticios de cuentas y transacciones.

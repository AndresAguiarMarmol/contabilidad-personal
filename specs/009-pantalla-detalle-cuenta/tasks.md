# Tareas de Implementación — Spec 009 (Pantalla Adicional de Detalle de Cuenta)

- [x] **T1: TDD Red/Green (Pruebas unitarias de soporte)**
  - Verificar que todas las pruebas existentes en `tests/account-details.test.js` y demás suites pasen con `node --test tests/*.test.js`.
  - Agregar pruebas para el filtrado interno de movimientos de cuenta si aplica.

- [x] **T2: Actualización del marcado en `index.html`**
  - Crear la nueva sección `<section id="view-account-detail" class="hidden space-y-5">`.
  - Remover el contenedor `#account-detail-container` residual de `view-accounts` para dejar la cuadrícula limpia.

- [x] **T3: Adaptación del Enrutador y Navegación en `assets/js/app.js`**
  - Agregar `"account-detail"` a `VIEW_METADATA` y en la lista de vistas de `switchView()`.
  - Crear la función `openAccountDetail(accountId)`.
  - Modificar `renderAccounts()` para que el clic en una tarjeta invoque `openAccountDetail(acc.id)`.

- [x] **T4: Implementación de la Pantalla Adicional en `assets/js/app.js`**
  - Desarrollar `renderAccountDetailView()` con:
    - Botón de retorno "← Volver a Cuentas".
    - Cabecera con datos de la cuenta e icono.
    - 3 tarjetas KPI: Abonos, Cargos y Saldo Contable.
    - Filtro por tipo y buscador de conceptos dentro de la cuenta.
    - Tabla responsiva de movimientos con desglose de partidas split.
    - Estado vacío amigable y botón de registro de movimiento para esa cuenta.

- [x] **T5: Verificación en navegador y sincronización de gobernanza**
  - Probar navegación entre "Cuentas & Billeteras" y la pantalla adicional en vivo con Chrome DevTools MCP.
  - Verificar retorno limpio mediante el botón "← Volver a Cuentas".
  - Marcar DoD en `specs/009-pantalla-detalle-cuenta/spec.md`.
  - Actualizar `memory.md` y realizar commit git.

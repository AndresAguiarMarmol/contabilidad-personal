# Plan Técnico — Spec 009 (Pantalla Adicional de Detalle de Cuenta)

## 1. Arquitectura y Módulos Afectados

### Archivos Afectados:
1. `index.html`:
   - Crear una nueva sección SPA: `<section id="view-account-detail" class="hidden space-y-5">`.
   - Limpiar el contenedor anterior `#account-detail-container` dentro de `view-accounts` para que la cuadrícula de cuentas quede limpia y libre.
2. `assets/js/app.js`:
   - Registrar la vista `"account-detail"` en `VIEW_METADATA` y en la lista de vistas administradas por `switchView`.
   - Implementar la función `openAccountDetail(accountId)`:
     - Asignar `state.selectedAccountId = accountId`.
     - Limpiar filtros internos de la cuenta (`state.accountDetailSearch = ""`, `state.accountDetailType = "all"`).
     - Llamar a `switchView("account-detail")`.
     - Renderizar la pantalla adicional llamando a `renderAccountDetailView()`.
   - Implementar `renderAccountDetailView()`:
     - Obtener la cuenta seleccionada.
     - Obtener movimientos con `Calculations.obtenerMovimientosDeCuenta(state.transactions, account.id)`.
     - Obtener resumen financiero con `Calculations.calcularResumenCuenta(state.transactions, account.id)`.
     - Renderizar cabecera con botón de retorno, KPIs, buscador y tabla de movimientos.
     - Vincular eventos de búsqueda y filtro reactivo interno.
     - Vincular botón "← Volver a Cuentas" para llamar a `switchView("accounts")`.
   - Modificar `renderAccounts()`:
     - Cada tarjeta de cuenta al ser clickeada llama a `openAccountDetail(acc.id)`.
3. `tests/account-details.test.js`:
   - Añadir pruebas unitarias adicionales si se agregan helpers de filtrado de cuenta.

---

## 2. Decisiones Técnicas y Alternativas Descartadas

- **Decisión:** Crear una vista de primer nivel dentro del enrutador SPA (`view-account-detail`).
  - *Alternativa descartada:* Reutilizar un modal emergente.
  - *Motivo:* El usuario solicitó explícitamente "en una pantalla adicional". Un modal puede resultar estrecho para tablas extensas con partidas split, mientras que una pantalla completa proporciona ergonomía visual, KPIs amplios y navegación natural con botón de retorno.

---

## 3. Trazabilidad con Requisitos Funcionales (EARS)
- **RF-1:** Navegación a pantalla adicional al hacer clic en tarjeta -> `renderAccounts` + `openAccountDetail` + `switchView`.
- **RF-2:** Retorno a "Cuentas & Billeteras" -> Botón `#btn-back-to-accounts` llamando `switchView("accounts")`.
- **RF-3:** Cabecera, KPIs, filtros y tabla cronológica -> `renderAccountDetailView`.
- **RF-4:** Desglose y efecto relativo de partidas split -> Renderizado condicional en tabla de movimientos.
- **RF-5:** Estado vacío amigable -> Bloque condicional cuando `movements.length === 0`.
- **RF-6:** Funciones puras desacopladas -> `financeCalculations.js` y `tests/account-details.test.js`.

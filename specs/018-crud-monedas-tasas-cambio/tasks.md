# Tareas — Spec 018: Gestión Multidivisa y CRUD de Monedas

- [x] **Fase 1: TDD Red (Pruebas Unitarias)**
  - [x] Crear `tests/currencies.test.js` con casos de prueba para:
    - Validación de moneda (`validarMoneda`).
    - Conversión cambiaria multidivisa (`calcularConversionMoneda`).
    - Acreditación de `toAmount` en `aplicarTransaccionEnCuentas`.
    - Consolidación de patrimonio neto con monedas extranjeras en `calcularPatrimonioNeto`.
    - Fusión de monedas en `fusionarEstadoContable`.
  - [x] Ejecutar `node --test tests/currencies.test.js` y verificar fallo controlado (Red).

- [x] **Fase 2: TDD Green (Lógica Pura de Cálculo)**
  - [x] Implementar `CURRENCIES_BASE`, `validarMoneda`, `calcularConversionMoneda` y `convertirACLP` en `assets/js/financeCalculations.js`.
  - [x] Actualizar `calcularPatrimonioNeto` para soportar conversión a CLP según `currenciesList`.
  - [x] Actualizar `aplicarTransaccionEnCuentas` para usar `toAmount` en transferencias.
  - [x] Actualizar `fusionarEstadoContable` para unir `currencies`.
  - [x] Exportar nuevas funciones en `FinanceCalculationsModule`.
  - [x] Ejecutar `node --test tests/currencies.test.js` y verificar éxito (Green).

- [x] **Fase 3: Persistencia y Sincronización Remota**
  - [x] Añadir clave `CURRENCIES` y métodos `getCurrencies()`, `saveCurrencies()` en `assets/js/storage.js`.
  - [x] Actualizar `exportBackup()` e `importBackup()` en `assets/js/storage.js`.
  - [x] Actualizar `prepareBackupDocument()`, `saveRemoteWorkspace()` y `syncBidirectional()` en `assets/js/dbAdapter.js`.

- [x] **Fase 4: Capa de Interfaz y Lógica de Aplicación**
  - [x] Añadir markup de tabla de monedas en `index.html` (`#settings-currencies-section`).
  - [x] Inicializar `state.currencies` en `loadStateFromStorage()` y sincronización.
  - [x] Implementar `renderCurrenciesTable()` en `renderSettings()` (`assets/js/app.js`).
  - [x] Implementar `openCurrencyModal(code)` para crear y editar monedas.
  - [x] Implementar `solicitarEliminarMoneda(code)` con validación de cuentas activas y protección de CLP.
  - [x] Actualizar `formatMoney(amount, currencyCode)` con formato dinámico por divisa.
  - [x] Actualizar selectores de moneda en creación y edición de cuentas para leer dinámicamente de `state.currencies`.
  - [x] En `openTransactionModal`:
    - Detectar discrepancia de divisas en transferencias.
    - Renderizar panel de tasa editable y monto destino en vivo.
    - Al guardar: persistir `exchangeRate` y `toAmount`, heredar tasa en `state.currencies`, persistir y auto-sincronizar.

- [x] **Fase 5: Verificación y Cierre**
  - [x] Ejecutar suite completa `node --test tests/*.test.js` (100% pruebas en verde: 87/87).
  - [x] Actualizar `memory.md` (Secciones 1, 2 y 3).
  - [x] Realizar commit y push a GitHub (`main`).

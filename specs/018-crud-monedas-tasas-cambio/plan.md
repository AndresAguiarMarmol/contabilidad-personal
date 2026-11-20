# Plan de Implementación — Spec 018: Gestión Multidivisa y CRUD de Monedas

## Arquitectura y Lógica de Conversión

### 1. Fórmulas de Conversión Cambiaria (respecto a CLP)
Cada moneda $M$ tiene una tasa referencial $T_M$ que representa el valor de 1 unidad de $M$ en CLP ($1\,M = T_M\,\text{CLP}$).
Para la moneda base CLP, $T_{\text{CLP}} = 1.0$.

- **De Moneda A a Moneda B:**
  $$\text{monto}_B = \text{monto}_A \times \frac{T_A}{T_B}$$
  - Ejemplo CLP a USD ($T_{\text{CLP}} = 1$, $T_{\text{USD}} = 950$):
    $$\text{monto}_{\text{USD}} = 950.000 \times \frac{1}{950} = 1.000\,\text{USD}$$
  - Ejemplo USD a CLP:
    $$\text{monto}_{\text{CLP}} = 100 \times \frac{950}{1} = 95.000\,\text{CLP}$$
  - Ejemplo USD a EUR ($T_{\text{USD}} = 950$, $T_{\text{EUR}} = 1.020$):
    $$\text{monto}_{\text{EUR}} = 100 \times \frac{950}{1.020} = 93.14\,\text{EUR}$$

- **Herencia de Tasa a la Tabla de Monedas:**
  - Si la transferencia involucra CLP y una moneda extranjera $X$:
    - Si es CLP $\rightarrow X$: $\text{tasa} = \text{monto}_{\text{CLP}} / \text{monto}_X \implies T_X = \text{tasa}$.
    - Si es $X \rightarrow \text{CLP}$: $\text{tasa} = \text{monto}_{\text{CLP}} / \text{monto}_X \implies T_X = \text{tasa}$.
  - Si la transferencia es entre dos extranjeras (ej. USD y EUR), el usuario puede ajustar la tasa de la moneda que esté cotizando directamente o actualizar la tasa de la moneda receptora/emisora proporcionalmente.

---

### 2. Capa de Cálculo Puro (`assets/js/financeCalculations.js`)
- **`CURRENCIES_BASE`**:
  ```javascript
  const CURRENCIES_BASE = [
    { code: "CLP", name: "Peso Chileno", symbol: "$", rateToCLP: 1.0, isBase: true },
    { code: "USD", name: "Dólar Estadounidense", symbol: "US$", rateToCLP: 950.0, isBase: false },
    { code: "EUR", name: "Euro", symbol: "€", rateToCLP: 1020.0, isBase: false },
    { code: "ARS", name: "Peso Argentino", symbol: "AR$", rateToCLP: 0.95, isBase: false }
  ];
  ```
- **`validarMoneda(datos, monedasExistentes, codigoActual)`**:
  - Código obligatorio (2 a 5 letras mayúsculas, único).
  - Nombre obligatorio.
  - Símbolo obligatorio.
  - Tasa numérica $> 0$.
- **`calcularConversionMoneda(amount, fromCode, toCode, currenciesList, customRate)`**:
  - Obtiene tasas y calcula monto resultante y tasa efectiva.
- **`calcularPatrimonioNeto(accounts, currenciesList)`**:
  - Actualizar para valorizar saldos en moneda extranjera a CLP:
    `saldoCLP = saldo * (rateToCLP || 1.0)`.
- **`aplicarTransaccionEnCuentas(accounts, tx)`**:
  - En transferencias, si `tx.toAmount` está definido, debitar `tx.amount` a `tx.accountId` y acreditar `tx.toAmount` a `tx.toAccountId`.
- **`fusionarEstadoContable(localState, remoteState)`**:
  - Fusionar array `currencies` sin duplicados por `code`.

---

### 3. Capa de Persistencia (`assets/js/storage.js`) y Adaptador Remoto (`assets/js/dbAdapter.js`)
- `STORAGE_KEYS.CURRENCIES = "finance_currencies_data"`.
- `Storage.getCurrencies()` y `Storage.saveCurrencies(currencies)`.
- Actualizar `exportBackup` e `importBackup`.
- Serializar `currencies` en `prepareBackupDocument`, `saveRemoteWorkspace` y `syncBidirectional`.

---

### 4. Capa de Interfaz (`index.html` y `assets/js/app.js`)
- En `index.html`: Sección `#settings-currencies-section` en `view-settings` con tabla de monedas, botón "+ Nueva Moneda" y badges visuales.
- En `assets/js/app.js`:
  - `renderSettings()`: renderizar tabla de monedas con botones de editar y eliminar.
  - `openCurrencyModal(currencyCode)`: formulario modal para alta/edición de moneda.
  - `solicitarEliminarMoneda(currencyCode)`: validar restricciones y eliminar.
  - En `openTransactionModal`:
    - Al seleccionar cuentas en transferencia, detectar si tienen monedas distintas.
    - Mostrar panel con tasa editable y monto destino calculado.
    - Al guardar: persistir `toAmount` y `exchangeRate`, heredar tasa a `state.currencies`, guardar en storage y sincronizar.
  - En selectores de cuenta (`openAccountModal`, `openAccountEditModal`), poblar selectores de moneda dinámicamente desde `state.currencies`.
  - Adaptar `formatMoney(amount, currencyCode)` para formatear con símbolo y decimales adecuados (ej. CLP con 0 decimales, USD/EUR con 2 decimales).

# SPEC-042: Sincronización LWW de Divisas, Coherencia de Patrimonio Neto y Pull Periódico Multi-Dispositivo

## 1. Problema y Contexto
1. **Diferencia de Patrimonio Neto entre Dispositivos ($291.234.129$ CLP vs $245.084.129$ CLP):**
   - El usuario posee cuentas en criptomonedas: `Ledger BTC` ($0.45$ BTC) y `Binance BTC` ($0.26$ BTC), sumando $0.71$ BTC.
   - En la PC, la tasa de cambio de BitCoin estaba fijada en $65.000.000$ CLP/BTC ($0.71 \times 65.000.000 = \mathbf{46.150.000}$ CLP).
   - En el teléfono móvil, el patrimonio neto reflejaba exactamente $\$245.084.129$ CLP ($\$291.234.129 - \$46.150.000$).
   - Causa raíz: en `fusionarEstadoContable` (`assets/js/financeCalculations.js`), las monedas locales sobrescribían ciegamente a las monedas remotas sin evaluar `updatedAt` ni comparar tasas, y `hasChangesFromRemote` omitía la verificación de monedas. Como el teléfono tenía la divisa BTC con tasa 0 o demo, sobrescribió la nube o ignoró la tasa de la PC.
2. **Movimientos ingresados en el móvil no reflejados automáticamente en la PC:**
   - En el teléfono se ingresaron 3 movimientos (`Casa Ideas` \$18.160, `METRO DE SANTIAGO - BIP Yaneth` \$5.000, `METRO DE SANTIAGO - Tarjeta BIP AEAM` \$5.000) que sí se subieron a Cloud Firestore.
   - En la PC, mientras la pestaña permanecía abierta en primer plano sin cambiar de foco ni de pestaña, no existía un mecanismo de sondeo periódico (polling) para descargar automáticamente los cambios remotos en vivo.

## 2. Requerimientos del Sistema (EARS)

### Ubicuo (En todo momento)
- **U-1:** El sistema DEBE garantizar que el cálculo de Patrimonio Neto (`Calculations.calcularPatrimonioNeto`) sea determinista y consistente en todos los dispositivos conectados a la misma cuenta/workspace.
- **U-2:** El sistema DEBE aplicar resolución Last-Write-Wins (LWW) en la tabla de divisas (`currencies`), adoptando la versión con el `updatedAt` más reciente o rescatando tasas positivas configuradas frente a tasas por defecto ($0$ o $\le 10^{-6}$).

### Respuestas a Eventos (Cuando ocurra un evento)
- **E-1:** Cuando se ejecute la fusión contable bidireccional (`fusionarEstadoContable`) y existan monedas remotas más recientes o con tasas válidas frente a valores nulos locales, el sistema DEBE actualizar la tabla de divisas y activar `hasCurrenciesUpdated` e incorporar dicha bandera a `hasChangesFromRemote`.
- **E-2:** Cuando `triggerAutoSync` reciba monedas actualizadas desde Firestore (`res.mergedState.currencies`), el sistema DEBE persistirlas de inmediato en `Storage.saveCurrencies` y actualizar el estado reactivo `state.currencies`.
- **E-3:** Cuando la aplicación esté activa y en primer plano (`!document.hidden`), el sistema DEBE realizar una sincronización desatendida en segundo plano cada 20 segundos para reflejar movimientos nuevos creados desde otros dispositivos sin requerir recargar la página.

### De Estado (Mientras una condición se cumpla)
- **S-1:** Mientras se serialize el workspace para Cloud Firestore, el sistema DEBE utilizar un límite de seguridad estricto de 700.000 bytes en `sanearWorkspaceParaNube` para prevenir que el tamaño expandido de Firestore REST exceda la cuota dura de 1,048,576 bytes (1MB).

## 3. Criterios de Aceptación
1. 206/206 pruebas unitarias pasando al 100% sin regresiones.
2. Fusión bidireccional probada para monedas con resolución LWW y tasas de criptomonedas.
3. El documento de workspace en Firestore de la cuenta activa (`KI6tXa4E2WP6o9LBOi7yvuwO9J73`) contiene todas las 23 cuentas, los 8 movimientos y las monedas consolidadas con BTC = $65.000.000$ CLP.

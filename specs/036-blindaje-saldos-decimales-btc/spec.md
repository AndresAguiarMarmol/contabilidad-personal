# Especificación — Spec 036: Blindaje de Saldos Locales contra Sobreescritura en Sincronización y Soporte de Precisión Decimal Cripto (BTC / Ledger)

## Contexto del Problema
Al actualizar el saldo de una cuenta (ej. 0.45 en la billetera Ledger de BTC), el valor se reflejaba inicialmente en pantalla, pero varios segundos después volvía a $0$.

### Causas Raíz Identificadas
1. **Fallback Erróneo al Timestamp del Workspace:** En `fusionarEstadoContable`, cuando una cuenta remota en Firestore no tenía `updatedAt` propio, se le asignaba erróneamente `remote.updatedAt` (la marca de tiempo de sincronización del documento completo), haciendo que cuentas remotas antiguas con saldo $0$ parecieran más recientes que las cuentas locales recién modificadas.
2. **Precedencia Invertida en Empates de Tiempo:** Si `localTime === remoteTime`, cuando los saldos diferían (`a.initialBalance !== existing.initialBalance`), el código adoptaba `{ ...existing, ...a }`, asignando el saldo remoto ($0$) sobre el saldo recién ingresado localmente ($0.45$).
3. **Formateo y Precisión Decimal Cripto (BTC):** `formatMoney` forzaba `maximumFractionDigits: 2`, lo cual trunca o distorsiona importes fraccionarios de criptomonedas (satoshis y BTC) que requieren hasta 8 decimales.

---

## Requisitos Funcionales (Sintaxis EARS)

### RF-1: Protección Absoluta de Modificaciones Locales en Fusión de Cuentas
- **Cuando:** `fusionarEstadoContable` compare una cuenta local (`existing`) y una remota (`a`):
  - El sistema SHALL usar exclusivamente el `updatedAt` individual de la cuenta remota (`a.updatedAt`), sin heredar el timestamp global del workspace.
  - **Si:** `localTime > remoteTime`:
    - El sistema SHALL preservar íntegramente la cuenta local con su saldo modificado (`{ ...a, ...existing }`).
  - **Si:** `localTime === remoteTime` (ambos ausentes o idénticos):
    - El sistema SHALL preservar la cuenta local (`{ ...a, ...existing }`), impidiendo que versiones remotas sin fecha más reciente sobreescriban los cambios locales.
  - **Si:** `remoteTime > localTime` (y `a.updatedAt` es legítimamente posterior a `existing.updatedAt`):
    - El sistema SHALL adoptar la versión remota (`{ ...existing, ...a }`).

### RF-2: Persistencia Inmediata y Timestamp en Edición de Cuenta
- **Cuando:** El usuario guarde la edición de una cuenta en `openAccountEditModal`:
  - El sistema SHALL asignar `account.updatedAt = new Date().toISOString()`.
  - El sistema SHALL preservar el saldo numérico decimal exacto (ej. 0.45) sin redondeos enteros.
  - El sistema SHALL persistir de inmediato en `Storage.saveAccounts` antes de disparar la sincronización en segundo plano.

### RF-3: Soporte de Decimales de Alta Precisión para Criptomonedas en UI (`formatMoney`)
- **Cuando:** Se formatee un saldo o importe en una divisa cripto o con código `BTC`, `ETH`, `SAT` o cualquier moneda que contenga decimales extendidos:
  - El sistema SHALL formatear con hasta 8 decimales de precisión (`maximumFractionDigits: 8`), mostrando los decimales significativos sin redondear prematuramente a 2 decimales ni a cero.

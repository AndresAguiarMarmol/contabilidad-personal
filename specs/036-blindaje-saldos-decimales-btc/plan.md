# Plan de Implementación — Spec 036

## Fase 1: Pruebas Unitarias TDD Red (`tests/crypto-balance-protection.test.js`)
1. Probar que `fusionarEstadoContable` preserva el saldo local modificado (0.45) cuando la versión remota tiene saldo 0 y no tiene `a.updatedAt` individual más reciente.
2. Probar que ante empate de timestamps (`localTime === remoteTime`), la versión local prevalece y no se sobreescribe con 0.
3. Probar que una cuenta con decimales como 0.45 o 0.005 conserva su saldo exacto en `recalcularBalancesCuentas`.
4. Probar que `formatMoney` formatea correctamente cuentas en BTC con decimales significativos sin truncar a cero.

## Fase 2: Implementación en Lógica Pura (`assets/js/financeCalculations.js`)
1. En `fusionarEstadoContable`:
   - Corregir `remoteTime`: usar estrictamente `a.updatedAt ? new Date(a.updatedAt).getTime() : 0`.
   - Ante `localTime >= remoteTime`: preservar `{ ...a, ...existing }`.
   - Sólo si `remoteTime > localTime`: adoptar `{ ...existing, ...a }`.
2. Asegurar que las cuentas conserven `updatedAt` y números decimales en `recalcularBalancesCuentas`.

## Fase 3: Integración en Interfaz (`assets/js/app.js`)
1. Actualizar `formatMoney` para soportar criptomonedas (`BTC`, `ETH`, etc.) con hasta 8 decimales.
2. Asegurar que `openAccountEditModal` guarde `account.updatedAt = new Date().toISOString()` y persista el saldo decimal sin alterar.

## Fase 4: Verificación y Despliegue
1. Ejecutar pruebas unitarias TDD.
2. Ejecutar suite completa (170+ pruebas).
3. Incrementar Service Worker a `contapersonal-v19`.
4. Actualizar `memory.md` y sincronizar con Git.

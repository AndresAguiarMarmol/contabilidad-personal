# Plan Técnico — Spec 001 (Corrección de Arranque Universal)

## 1. Archivos Involucrados y Responsabilidades
- `assets/js/financeCalculations.js`: Módulo de funciones puras de cálculo financiero (patrimonio neto, balances del mes, tasa de ahorro, ejecución presupuestaria). Exportación universal para navegador y `node --test`.
- `assets/js/mockData.js`: Datos semilla de demostración en espacio de nombres universal.
- `assets/js/storage.js`: Persistencia resiliente en `localStorage` con fallback defensivo a memoria.
- `assets/js/dbAdapter.js`: Adaptador para base de datos real remota (Supabase).
- `assets/js/app.js`: Coordinador de vistas y eventos del DOM con inicialización inmediata.
- `index.html`: Carga de scripts en orden de dependencia sin `type="module"` para compatibilidad universal con `file:///` y `http://`.
- `tests/finance.test.js`: Suite de pruebas unitarias automatizadas con `node --test`.

## 2. Lógica Pura y Modelos de Datos (RF-3, RF-4)
```javascript
// Funciones puras desacopladas del DOM:
function calcularPatrimonioNeto(accounts) {
  // Activos menos pasivos
}

function calcularBalanceMes(transactions, fechaReferencia = new Date()) {
  // Ingresos, gastos, balance neto y tasa de ahorro
}

function calcularEjecucionPresupuesto(spentAmount, limitAmount) {
  // Porcentaje y estado de semáforo ('optimal' | 'warning' | 'exceeded')
}
```

## 3. Decisiones Técnicas y Alternativas Descartadas
- **Decisión:** Migrar de ES Modules (`type="module"`) a scripts clásicos ordenados con espacio de nombres universal `window.ContaPersonal` y exportación condicional para Node.js (`typeof module !== 'undefined' ? module.exports = ... : window...`).
  - *Alternativa descartada:* Mantener ES Modules y obligar al usuario a ejecutar siempre un servidor Node o Python local. *Rechazada:* viola el Principio 1 de la Constitución (Portabilidad y Arranque Universal sin fricción).
- **Decisión:** Registrar el Service Worker y el manifiesto PWA únicamente cuando el protocolo comience por `http:` o `https:`.
  - *Alternativa descartada:* Dejar que falle silenciosamente en `file:///`. *Rechazada:* genera errores visibles en la consola de Chromium.
- **Decisión:** Guardas defensivas para llamadas a librerías externas (`window.lucide`).
  - *Alternativa descartada:* Invocación directa no protegida. *Rechazada:* si falla la red CDN, congela el flujo de renderizado.

## 4. Estrategia de Pruebas y Cobertura de RF
- `tests/finance.test.js`:
  - **Test RF-3:** Cálculo exacto de patrimonio neto considerando cuentas de activo y tarjetas de crédito (pasivos).
  - **Test RF-4:** Cálculo correcto de ingresos del mes, gastos del mes, saldo neto y porcentaje de tasa de ahorro.
  - **Test RF-4 (Caso límite):** Cálculo de tasa de ahorro cuando los ingresos son cero o negativos (evitar división por cero).
  - **Test RF-1 / Presupuestos:** Cálculo de semáforo presupuestario: verde ($\le 75\%$), amarillo ($> 75\%$ y $\le 100\%$), rojo ($> 100\%$).

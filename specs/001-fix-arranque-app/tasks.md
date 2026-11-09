# Tareas — Spec 001 (Corrección de Arranque Universal)

- [x] **T1. Módulo de cálculo financiero puro y suite de pruebas unitarias.** RF-3, RF-4
  - Hecho cuando: La suite `tests/finance.test.js` se ejecute con `node --test` y pase al 100% en verde verificando patrimonio neto, balances del mes, tasa de ahorro y semáforos de presupuesto.
- [x] **T2. Universalización de datos, almacenamiento y adaptador de base de datos.** RF-1, RF-2
  - Hecho cuando: `mockData.js`, `storage.js` y `dbAdapter.js` funcionen tanto en el navegador bajo el namespace `window.ContaPersonal` como en Node.js, sin requerir `type="module"`.
- [x] **T3. Inicialización defensiva de interfaz y shell en index.html y app.js.** RF-1, RF-2, RF-5
  - Hecho cuando: `index.html` cargue los scripts ordenadamente, proteja el registro de Service Worker para entornos `http:`, verifique la presencia de `lucide` y renderice el Dashboard instantáneamente al abrir con `file:///`.
- [x] **T4. Validación integral de arranque universal y sincronización de memoria.** RF-1, RF-2, RF-3, RF-4, RF-5
  - Hecho cuando: Chrome DevTools confirme 0 errores en consola bajo `file:///`, todas las vistas respondan a los clics y `memory.md` quede actualizado.

# Spec 001 — Corrección de Arranque Universal y Resiliencia de Inicialización

Estado: implementada

## 1. Contexto y Objetivo
Al abrir la aplicación en el navegador mediante el protocolo local de archivos (`file:///`), la interfaz se congela y no renderiza los datos financieros debido al bloqueo por políticas de CORS sobre módulos ES6 (`<script type="module">`) y llamadas de registro del Service Worker.
El objetivo es garantizar un arranque universal, inmediato e infalible tanto en `file:///` (doble clic en Windows) como en servidores web HTTP (GitHub Pages, localhost, PWA), asegurando que los cálculos financieros y la navegación funcionen sin congelamientos.

## 2. Usuarios y Roles
- **Usuario Particular / Familiar:** Necesita abrir la aplicación con doble clic en su equipo o desde la web y ver inmediatamente sus cuentas, saldos y presupuestos listos para operar.

## 3. Historias de Usuario
- **HU-1:** Como usuario de finanzas personales, quiero abrir la aplicación directamente en mi navegador sin configuraciones complejas para consultar de inmediato mi patrimonio neto y saldo disponible.
- **HU-2:** Como usuario móvil o de escritorio, quiero que la aplicación funcione fluidamente tanto si estoy conectado a internet como si estoy sin conexión.

## 4. Definiciones y Glosario
- **Arranque Universal:** Capacidad de inicializar la interfaz y la lógica de negocio sin depender de si el protocolo es `file://` o `http://`.
- **CORS de Módulos:** Restricción de seguridad del navegador que bloquea `import`/`export` cuando el origen es `null` (`file:///`).

## 5. Requisitos Funcionales (EARS)
- **RF-1 (Evento):** CUANDO el usuario abre la aplicación mediante protocolo `file:///` o protocolo `http://`, EL SISTEMA inicializa la interfaz y renderiza el Dashboard con las métricas financieras en menos de 500 milisegundos.
- **RF-2 (Estado no deseado):** SI el entorno de ejecución bloquea la carga de Service Worker o el manifiesto PWA por restricciones de protocolo, ENTONCES EL SISTEMA maneja la restricción de forma defensiva y ejecuta la aplicación con persistencia local sin interrumpir la experiencia.
- **RF-3 (Comportamiento continuo):** EL SISTEMA calcula el patrimonio neto consolidado sumando los saldos de cuentas de activo (efectivo, bancos, billeteras, ahorros) y restando los pasivos (deudas de tarjetas de crédito).
- **RF-4 (Comportamiento continuo):** EL SISTEMA calcula los ingresos del mes, gastos del mes, balance neto y tasa de ahorro a partir del historial de transacciones.
- **RF-5 (Evento):** CUANDO el usuario pulsa sobre cualquiera de las secciones de navegación (Dashboard, Cuentas, Movimientos, Presupuestos, Ajustes), EL SISTEMA conmuta la vista activa de forma instantánea sin recargar la página.

## 6. Requisitos No Funcionales
- **RNF-1:** Compatibilidad total con apertura directa por doble clic (`file:///`) en navegadores basados en Chromium (Chrome, Edge), Firefox y Safari.
- **RNF-2:** Cero errores no capturados en la consola del navegador.
- **RNF-3:** Suite de pruebas unitarias ejecutadas con `node --test` pasando al 100% en verde.

## 7. Casos Límite y Manejo de Errores
- Apertura en modo incógnito (donde `localStorage` puede ser restringido): el sistema debe recurrir a los datos en memoria sin colapsar.
- Fallo de conexión CDN de iconos: el sistema no debe lanzar excepciones no controladas si `lucide` no está disponible inmediatamente.
- Ausencia de datos en almacenamiento: se inicializa automáticamente con los datos semilla de finanzas personales.

## 8. Fuera de Alcance
- Compilaciones complejas con bundlers (Webpack, Vite).
- Funcionalidades de inventario o catálogos comerciales.

## 9. Criterios de Finalización (DoD)
- [ ] La aplicación arranca sin congelamientos abriendo `index.html` con `file:///`.
- [ ] La consola del navegador no presenta errores bloqueantes de CORS ni fallos no capturados.
- [ ] Las métricas de patrimonio neto, ingresos, gastos y presupuestos se muestran calculadas al cargar.
- [ ] La suite de pruebas unitarias `tests/finance.test.js` pasa al 100% con `node --test`.

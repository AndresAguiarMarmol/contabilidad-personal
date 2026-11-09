# docs/constitution.md — Constitución del Proyecto

Este documento establece la ley suprema y los límites arquitectónicos inviolables de la **App de Contabilidad Personal y Gestión Patrimonial (PWA)**.

---

## Principios Fundamentales

1. **Portabilidad y Arranque Universal:**
   La aplicación debe arrancar y funcionar de forma inmediata tanto al ser abierta mediante doble clic local (`file:///`) como servida por HTTP (`http://localhost`, GitHub Pages, PWA). No debe congelarse ni fallar por políticas de CORS en entornos locales de archivo.

2. **Propósito Exclusivo de Finanzas Personales:**
   El alcance se restringe estrictamente a la contabilidad personal y familiar (cuentas bancarias, efectivo, tarjetas, ingresos, gastos categorizados, presupuestos y metas de ahorro). Queda estrictamente prohibido introducir catálogos comerciales, inventarios de insumos o pedidos de venta.

3. **Lógica Pura y Determinismo Financiero:**
   Toda regla de negocio, cálculo de patrimonio neto, balances e indicadores presupuestarios debe implementarse como funciones puras desacopladas del DOM, testeables con el ejecutor nativo `node --test`.

4. **Persistencia Local Resiliente (Offline-First):**
   La aplicación debe operar de forma autónoma con `localStorage` y datos semilla iniciales. La sincronización con bases de datos remotas (Supabase) es un adaptador desacoplado que nunca debe bloquear la carga ni la experiencia del usuario.

5. **Ergonomía Visual y Accesibilidad:**
   La interfaz debe ser totalmente responsiva (móvil, tablet y escritorio), soportar tema claro y oscuro, utilizar números tabulares para montos monetarios y cumplir contraste accesible WCAG AA.

6. **Desarrollo Guiado por Especificaciones (SDD):**
   Ningún cambio de código de producción se realiza sin una especificación formal (`spec.md` en EARS), plan técnico (`plan.md`), tareas atómicas (`tasks.md`) y pruebas unitarias previas (TDD Red-Green).

# AGENTS.md — Contabilidad Personal y Gestión Patrimonial (PWA)

Guía para agentes de IA que trabajen en este proyecto.

## Memoria del proyecto (`memory.md`) — OBLIGATORIO
`memory.md` guarda todo lo que debe preservarse entre sesiones: la estructura de los datos, las decisiones de diseño/arquitectura vigentes y el historial de cambios.

1. **Al empezar cualquier tarea:** leer `memory.md` completo antes de tocar código.
2. **Durante la tarea:** respetar la arquitectura definida en `SPEC.md` y las decisiones vigentes.
3. **Al terminar cualquier tarea que cambie algo:** actualizar `memory.md`:
   - Sección 1 si cambia la estructura de datos o persistencia.
   - Sección 2 si se toma, cambia o elimina una decisión arquitectónica o de diseño.
   - Sección 3: añadir arriba una entrada con la fecha y un resumen breve del cambio.
4. Si `memory.md` y el código no coinciden, avisar al usuario antes de seguir.

---

## Descripción del proyecto
Aplicación Web Progresiva (PWA) orientada al 100% a la **Contabilidad y Finanzas Personales/Familiares**:
- Gestión de cuentas y billeteras (bancos, efectivo, tarjetas de crédito, ahorros).
- Registro de ingresos y gastos de la vida cotidiana categorizados.
- Presupuestos mensuales con semáforos de alerta de sobregiro.
- Metas de ahorro personal.
- Panel de patrimonio neto consolidado y tasa de ahorro.
- Sincronización opcional con base de datos real (Supabase PostgreSQL) y funcionamiento offline garantizado.
- **Sin inventario, catálogo comercial ni existencias de insumos.**

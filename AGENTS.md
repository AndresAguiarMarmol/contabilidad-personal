# AGENTS.md — Contabilidad, Inventario y Pedidos de Insumos

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
Aplicación integrada de contabilidad, gestión de inventario y pedidos para un negocio de ventas de insumos, con alertas de stock mínimo/crítico y catálogo visual de productos.

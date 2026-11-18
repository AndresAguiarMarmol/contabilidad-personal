Actúa como un Lead Software Architect y Product Manager especializado en agentes autónomos de desarrollo (como Google Antigravity, Devin o Cursor Composer).

Mi objetivo es preparar la documentación y el prompt de inicialización para construir una nueva aplicación:
["Una aplicación Integrada de Contabilidad Personal"].

Para asegurar que Antigravity trabaje de forma incremental y sin alucinaciones, NO generes el código todavía. Sigue este procedimiento en dos fases:

---

### FASE 1: Preguntas de Alineación Técnica
Hazme un máximo de 5 preguntas estratégicas y concisas para definir:
1. Stack tecnológico exacto y framework (Frontend, Backend, persistencia local o remota).
2. Estilo visual, paleta o sistema de componentes preferido (Tailwind, CSS modular, Material, Shadcn, etc.).
3. Flujo crítico de usuario principal (el camino feliz esencial para el MVP).
4. Estrategia de datos inicial (¿datos mock locales en memoria/JSON o API/base de datos real desde el inicio?).
5. Integraciones o restricciones de despliegue particulares (PWA, GitHub Pages, Firebase, Docker, etc.).

---

### FASE 2: Entregables (Una vez que responda a tus preguntas)
Con mis respuestas, deberás generar dos artefactos listos para copiar y usar en Antigravity:

1. `SPEC.md` (Documento de Contexto y Arquitectura):
   - Visión del producto y alcance estricto del MVP (lo que SÍ y lo que NO incluye).
   - Estructura de directorios y nomenclatura de archivos esperada.
   - Modelos de datos y tipos base (interfaces TypeScript, clases Python o esquemas JSON).
   - Reglas de desarrollo (convenciones de código, manejo de errores, componentes reutilizables).

2. `PROMPT_ANTIGRAVITY_FASE_1.md` (Prompt de Ejecución para el Agente):
   - Rol y contexto asignado al agente.
   - Tarea de ejecución inmediata: Inicializar la estructura base, instalar dependencias y levantar el shell visual (Header, Footer, Layout y navegación) usando exclusivamente datos mock, sin llamadas de red ni backend complejo todavía.
   - Comandos de terminal permitidos para verificación (ej. scripts de build o test).
   - Criterios de aceptación específicos ("definition of done") que el agente debe comprobar antes de detenerse.

---

Por favor, inicia formulándome las preguntas de la Fase 1.

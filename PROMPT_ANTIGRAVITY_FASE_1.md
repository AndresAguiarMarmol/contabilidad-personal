# PROMPT_ANTIGRAVITY_FASE_1.md — Prompt de Ejecución para Agente Autónomo

> **Instrucciones para el Agente:** Copia este prompt directamente o ejecútalo como la primera orden de desarrollo en Antigravity.

---

### Contexto y Rol
Actúa como un **Senior Frontend Engineer & UI Specialist**. Tu objetivo en esta primera iteración es levantar la base estructural y el **Shell Visual Completo** de la aplicación:
**"Sistema Integrado de Contabilidad, Inventario y Pedidos para Ventas de Insumos"**.

Debes apegarte estrictamente a las especificaciones descritas en `SPEC.md` y las reglas operativas de `AGENTS.md`. No implementes backend ni llamadas a servicios externos; utiliza arquitectura modular ES6 nativa con datos mock y Tailwind CSS vía CDN.

---

### Tarea Inmediata de Ejecución: Levantamiento del Shell Visual

1. **Estructura de Directorios y Archivos:**
   Crea la estructura de carpetas y archivos base:
   - `index.html`: Contenedor principal con Tailwind CSS CDN (`@tailwindcss/browser@4` o Tailwind CDN v3), Lucide Icons CDN, fuentes modernas (Inter o Sans del sistema) y contenedor semántico responsive.
   - `assets/css/styles.css`: Estilos utilitarios complementarios (transiciones, personalización de scrollbars, badges).
   - `assets/js/mockData.js`: Conjunto de datos mock representativo con:
     - Al menos 8 insumos de diferentes categorías (Telas, Hilos, Empaques, Tintas) con stock óptimo, bajo, crítico y agotado.
     - Al menos 3 pedidos de ejemplo (con detalle de insumos).
     - Al menos 5 asientos contables de ejemplo (ingresos por ventas y egresos por reposición de stock).
   - `assets/js/storage.js`: Módulo de carga inicial que lea de `localStorage` o inicialice con `mockData.js`, con métodos `get()`, `set()`, `reset()` y `exportBackup()`.
   - `assets/js/app.js`: Coordinador principal que gestione:
     - Inicialización de los datos.
     - Navegación entre las 4 vistas principales sin recarga de página:
       1. **Dashboard:** Métricas clave (Total Valor Inventario, Pedidos del Mes, Balance Neto en Caja, Alertas Activas de Stock) y lista de alertas urgentes.
       2. **Catálogo & Inventario:** Cuadrícula visual de insumos con tarjetas, fotos, precio, stock actual y badges de alerta (Verde, Amarillo, Rojo, Negro).
       3. **Pedidos:** Tabla de historial de pedidos recientes con estados, importes y botón "+ Nuevo Pedido".
       4. **Contabilidad:** Resumen de ingresos vs egresos, balance en caja y tabla de movimientos contables.
     - Toggle de Modo Claro / Modo Oscuro funcional.
     - Menú móvil colapsable (hamburguesa).

2. **Componentes y Diseño Visual:**
   - Barra lateral (Sidebar) elegante con logotipo del negocio, indicador de alertas de stock activas (badge numérico con insumos en bajo/crítico) y navegación fluida.
   - Header superior con selector de vista rápida, indicador de fecha/hora, toggle de tema y botón de "Restablecer Datos Demo".
   - Renderizado inicial de datos en las 4 vistas utilizando los datos mock de `storage.js`.

---

### Comandos de Verificación Permitidos
Para validar la integridad del código sin romper el entorno, puedes ejecutar:
- Servir localmente la aplicación para pruebas en navegador:
  ```powershell
  python -m http.server 8000
  # o bien:
  npx serve .
  ```
- Comprobar sintaxis de archivos JavaScript con Node:
  ```powershell
  node --check assets/js/mockData.js
  node --check assets/js/storage.js
  node --check assets/js/app.js
  ```

---

### Criterios de Aceptación ("Definition of Done")
Antes de dar por concluida la Fase 1, debes verificar de forma verificable:
1. [ ] `index.html` carga sin errores de sintaxis ni scripts rotos en la consola del navegador.
2. [ ] La navegación entre las cuatro vistas (Dashboard, Inventario/Catálogo, Pedidos, Contabilidad) funciona de manera instantánea mediante pestañas/vistas SPA.
3. [ ] El Catálogo Visual muestra las tarjetas de insumos con sus respectivos badges de semáforo de stock calculados según sus umbrales (Óptimo, Bajo, Crítico, Agotado).
4. [ ] El Dashboard refleja los totales acumulados (valor del inventario, balance contable y cantidad de alertas de stock) calculados dinámicamente a partir de los datos mock.
5. [ ] El botón de alternancia Modo Claro / Modo Oscuro conmuta correctamente y persiste la preferencia.
6. [ ] Los iconos Lucide se inicializan y renderizan nítidamente.
7. [ ] Se actualiza `memory.md` reflejando la estructura creada y los cambios realizados.

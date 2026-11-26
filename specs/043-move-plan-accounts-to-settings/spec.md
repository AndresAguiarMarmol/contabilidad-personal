# SPEC-043: Mover Acceso de "Plan de Cuentas" del Menú Principal a "Configuración"

## 1. Problema y Contexto
- Actualmente, la barra de navegación lateral principal (`#sidebar`) contiene un enlace directo a "Plan de Cuentas" (`data-nav-view="chart-of-accounts"`).
- Para el uso diario de la aplicación de finanzas personales, los accesos frecuentes requeridos en el menú principal son: Dashboard, Cuentas & Billeteras, Movimientos, Presupuestos & Metas, Reportes y Configuración.
- La gestión y edición del catálogo contable ("Plan de Cuentas") es una actividad de parametrización y configuración estructural, no un flujo operativo recurrente de registro cotidiano.
- El usuario solicita expresamente: *"Mover acceso de 'Plan de Cuentas' del 'Menu Principal' para 'Configuracion'"*.

## 2. Requerimientos del Sistema (EARS)

### Ubicuo (En todo momento)
- **U-1:** El menú de navegación principal (`#sidebar nav`) NO DEBE contener el botón de acceso directo a "Plan de Cuentas" (`data-nav-view="chart-of-accounts"`), manteniendo un menú lateral más limpio y enfocado a las operaciones cotidianas (Dashboard, Cuentas, Movimientos, Presupuestos, Reportes y Configuración).

### Respuestas a Eventos (Cuando ocurra un evento)
- **E-1:** En la vista de Configuración (`#view-settings`), el sistema DEBE incluir una sección/tarjeta dedicada para el "Plan de Cuentas Contable Personal", con su descripción, estado y botón interactivo `data-nav-view="chart-of-accounts"` para abrir y gestionar el catálogo contable.
- **E-2:** Cuando el usuario haga clic en "Abrir Plan de Cuentas" desde Configuración (o cualquier elemento `data-nav-view="chart-of-accounts"`), el sistema DEBE cambiar la vista activa a `chart-of-accounts`, renderizar el catálogo completo y marcar como activo en el menú lateral el ítem "Configuración".
- **E-3:** En la barra de herramientas de la vista `chart-of-accounts`, el sistema DEBE proveer un botón de retorno rápido a Configuración (`data-nav-view="settings"` con icono de flecha hacia atrás y etiqueta "Volver a Configuración").

## 3. Criterios de Aceptación
1. El sidebar de `index.html` no contiene `data-nav-view="chart-of-accounts"`.
2. `#view-settings` en `index.html` cuenta con el contenedor y botón para abrir el Plan de Cuentas.
3. La navegación a `chart-of-accounts` y retorno a `settings` opera con fluidez.
4. Se ejecutan pruebas unitarias automatizadas verificando la ausencia en el menú principal y presencia en Configuración.
5. 100% de la suite de pruebas aprobada sin regresiones.

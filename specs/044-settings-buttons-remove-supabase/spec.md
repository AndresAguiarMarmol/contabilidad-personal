# SPEC-044: Modularización de Configuración (Monedas, Proveedores y Retiro de Supabase)

## 1. Problema y Contexto
- En la pantalla de "Configuración" (`#view-settings`), las tablas completas de "Monedas Soportadas y Tasas de Cambio" y de "Directorio de Proveedores/Beneficiarios" se renderizaban inline dentro del mismo scroll principal, sobrecargando la vista.
- Adicionalmente, figuraba la tarjeta "Conexión a Base de Datos Real (Supabase PostgreSQL)", la cual ya no es utilizada en el flujo de producción (el proyecto opera al 100% sobre Cloud Firestore con Firebase Auth y Local Storage).
- El usuario solicita expresamente:
  1. *"Monedas Soportadas y Tasas de Cambio" debe ser un botón que lleva a la mencionada funcionalidad.*
  2. *"Directorio de Proveedores/Beneficiarios" debe ser un botón que lleva a la mencionada funcionalidad.*
  3. *Eliminar la opción "Conexión a Base de Datos Real...."*

## 2. Requerimientos del Sistema (EARS)

### Ubicuo (En todo momento)
- **U-1:** La vista de Configuración (`#view-settings`) NO DEBE contener el bloque HTML de "Conexión a Base de Datos Real (Supabase PostgreSQL)".
- **U-2:** El menú de navegación lateral (`#sidebar nav`) DEBE mantener su estructura limpia de 6 ítems principales (Dashboard, Cuentas, Movimientos, Presupuestos, Reportes y Configuración), manteniendo "Configuración" activo al visualizar cualquiera de sus sub-vistas (`chart-of-accounts`, `currencies`, `suppliers`).

### Respuestas a Eventos (Cuando ocurra un evento)
- **E-1:** En la vista de Configuración, "Monedas Soportadas y Tasas de Cambio" DEBE presentarse como una tarjeta de acceso con botón interactivo (`data-nav-view="currencies"` / `#btn-settings-open-currencies`) que al pulsarse cambie la vista a `#view-currencies`.
- **E-2:** En la vista de Configuración, "Directorio de Proveedores/Beneficiarios" DEBE presentarse como una tarjeta de acceso con botón interactivo (`data-nav-view="suppliers"` / `#btn-settings-open-suppliers`) que al pulsarse cambie la vista a `#view-suppliers`.
- **E-3:** En las vistas `#view-currencies` y `#view-suppliers`, el sistema DEBE proveer en su cabecera un botón de retorno a Configuración (`data-nav-view="settings"` con etiqueta "Volver a Configuración") para regresar fluidamente.
- **E-4:** Al invocar `switchView("currencies")` o `switchView("suppliers")`, el sistema DEBE activar la vista correspondiente, renderizar sus tablas actualizadas y marcar `settings` como la sección activa en el menú de navegación lateral.

## 3. Criterios de Aceptación
1. No existe la sección de Supabase en `#view-settings`.
2. Existen botones claros en Configuración que dirigen a `#view-currencies` y `#view-suppliers`.
3. `#view-currencies` y `#view-suppliers` cuentan con botón "Volver a Configuración".
4. Todas las operaciones CRUD de monedas y proveedores continúan funcionando con normalidad.
5. 100% de la suite de pruebas unitarias aprobada sin regresiones.

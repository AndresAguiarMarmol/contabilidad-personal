# Especificación — Spec 019: Persistencia y Precedencia en Modificación de Cuentas Originarias del Plan de Cuentas

## Contexto y Alcance
En la aplicación de Contabilidad Personal existen dos tipos de cuentas creadas por defecto que nacieron con la app:
1. Cuentas del catálogo maestro del Plan de Cuentas (`CATALOGO_PLAN_CUENTAS_PERSONAL_BASE`), como `1.1.01`, `1.1.02`, `1.3.01`, `4.1.01`, `5.1.01`, etc.
2. Cuentas financieras de tesorería iniciales (`ACC-001` a `ACC-005`).

Actualmente, cuando el usuario modifica una cuenta originaria desde la interfaz del Plan de Cuentas (por ejemplo cambiando su nombre, código contable o grupo), los cambios se guardan en `state.planAccounts`, pero al generar el catálogo consolidado mediante `Calculations.obtenerCatalogoPlanCuentas()`, la lógica descarta la cuenta personalizada si su ID o código ya existe en el catálogo base estático. Esto provoca que la cuenta se regenere a su versión de fábrica inmediatamente al refrescar la vista.

## Requisitos en Formato EARS

### Requisito 1: Precedencia y Sobrescritura en el Catálogo Consolidado (Ubiquitous)
El sistema **deberá** aplicar precedencia sobre el catálogo base cuando existan cuentas personalizadas con el mismo identificador (`id`) o código contable de origen, reemplazando los atributos base (nombre, código contable, grupo, naturaleza) por los definidos por el usuario en `cuentasPersonalizadas`.

### Requisito 2: Edición Completa de Cuentas Originarias (Event-Driven)
**Cuando** el usuario edite una cuenta originaria del plan de cuentas en el modal de cuenta contable, el sistema **deberá** permitir modificar el Nombre, Rubro/Grupo, Naturaleza y Código Contable, conservando de forma inmutable su identificador interno (`id`, ej. `P-5-1-01`) para garantizar el rastreo contra el catálogo base.

### Requisito 3: Modificación del Código Contable sin Duplicados (State-Driven)
**Mientras** el usuario modifique el código contable de una cuenta originaria (ej. de `5.1.01` a `5.1.01.A` o `5.1.99`), el sistema **deberá** reemplazar la entrada originaria en el catálogo sin generar un duplicado de la cuenta previa.

### Requisito 4: Propagación Inmediata a Categorías, Filtros y Presupuestos (Ubiquitous)
El sistema **deberá** reflejar de forma inmediata los nombres y códigos modificados de las cuentas originarias en los selectores de categorías de movimientos (Gasto, Ingreso, Split), en los filtros del Libro de Movimientos y en los Presupuestos Mensuales.

### Requisito 5: Sincronización Bidireccional de Cuentas Financieras Originarias (Event-Driven)
**Cuando** el usuario modifique una cuenta financiera de tesorería que nació con la app (`ACC-001` a `ACC-005`) desde el Plan de Cuentas, el sistema **deberá** sincronizar bidireccionalmente su nombre, código contable y atributos tanto en el catálogo contable como en las tarjetas del Dashboard y el almacén `accounts`.

### Requisito 6: Persistencia y Fusión Multi-Dispositivo (Ubiquitous)
El sistema **deberá** persistir las modificaciones de cuentas originarias en `localStorage` (`finance_plan_accounts_data`) y en Firestore (`workspaces/main`), garantizando que durante `fusionarEstadoContable` las personalizaciones locales y remotas prevalezcan sobre los valores estáticos originales de la app.

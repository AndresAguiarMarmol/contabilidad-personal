# Spec 017 — Habilitación de CRUD Completo en Cuentas Financieras (Tesorería) y Prevención de Resurrección

## 1. Contexto y Problema
En la versión inicial de la aplicación, las cuentas financieras de tesorería creadas por defecto (`ACC-001` a `ACC-005`: Banco Principal, Efectivo, Billetera Digital, Ahorro e Inversión, Tarjeta de Crédito) o creadas posteriormente presentaban restricciones en la interfaz de usuario:
1. En la vista principal de "Cuentas & Billeteras" (`renderAccounts`), las tarjetas sólo permitían hacer clic para navegar al detalle, careciendo de botones visibles directos para Editar o Eliminar.
2. En la vista de detalle de cuenta (`renderAccountDetailView`), no existían botones para editar o eliminar la cuenta visualizada.
3. En la vista del Plan de Cuentas (`renderChartOfAccounts`), la acción de eliminar estaba expresamente restringida para cuentas financieras (`!acc.financialAccountId`), impidiendo su eliminación desde el catálogo contable.
4. Cuando una cuenta financiera poseía transacciones históricas, no existía una opción limpia y confirmada de purga en cascada (Opción A: confirmación de eliminación de cuenta junto con sus movimientos asociados).
5. No existía salvaguarda para impedir que el usuario elimine la totalidad de las cuentas financieras (el sistema requiere al menos 1 cuenta activa para operar).
6. En entornos sincronizados con la nube (Firestore), al eliminar una cuenta financiera, si no se registraba una lápida persistente (`deletedAccounts`), la cuenta resucitaba al fusionar el estado remoto.

---

## 2. Requerimientos en Formato EARS

### RF-1: Acciones de Edición y Eliminación en Tarjetas de Cuentas
- **Cuando** el usuario visualice la cuadrícula de cuentas en "Cuentas & Billeteras", **el sistema debe** presentar en cada tarjeta botones de acción accesibles para Editar (icono lápiz) y Eliminar (icono papelera), deteniendo la propagación del evento clic para no activar la navegación al detalle.

### RF-2: Acciones de Edición y Eliminación en Vista de Detalle de Cuenta
- **Cuando** el usuario ingrese a la vista de detalle de una cuenta (`view-account-detail`), **el sistema debe** ofrecer en la cabecera botones para "Editar Cuenta" y "Eliminar Cuenta".

### RF-3: Salvaguarda de Mínimo de Cuentas Activas
- **Si** el usuario intenta eliminar una cuenta financiera y la cantidad total de cuentas activas en el sistema es igual a 1 (`state.accounts.length <= 1`), **el sistema debe** bloquear la eliminación y notificar al usuario con un mensaje de advertencia ("No se puede eliminar la única cuenta activa. Debe existir al menos una cuenta.").

### RF-4: Confirmación y Purga en Cascada de Movimientos Asociados (Decisión: Opción A)
- **Cuando** el usuario solicite eliminar una cuenta financiera:
  - **Si** la cuenta no tiene movimientos asociados (`cantidadMovimientos === 0`), **el sistema debe** solicitar confirmación estándar y proceder con la eliminación.
  - **Si** la cuenta tiene movimientos asociados (`cantidadMovimientos > 0`), **el sistema debe** advertir al usuario indicando el número de movimientos afectados y solicitar confirmación explícita para eliminar la cuenta junto con todos sus movimientos asociados en una purga limpia.
  - **Al confirmar**, **el sistema debe** purgar inmutablemente todas las transacciones vinculadas (origen `accountId`, destino `toAccountId`, o en partidas split `targetAccountId`), eliminar la cuenta de `state.accounts`, registrar su identificador en lápidas `deletedAccounts`, recalcular los estados contables y persistir.

### RF-5: Desbloqueo y Gestión Unificada desde el Plan de Cuentas
- **Cuando** el usuario visualice el Plan de Cuentas (`renderChartOfAccounts`), **el sistema debe** habilitar el botón de eliminación en las cuentas financieras vinculadas (`financialAccountId`), reutilizando el mismo flujo unificado de validación, salvaguarda y purga de movimientos.

### RF-6: Prevención de Resurrección en Sincronización Multi-Dispositivo (Lápidas `deletedAccounts`)
- **Mientras** se ejecute la fusión contable en `Calculations.fusionarEstadoContable(localState, remoteState)` o la sincronización con Firestore, **el sistema debe** unificar las lápidas de cuentas eliminadas (`deletedAccounts`), omitir y purgar de los estados locales y remotos cualquier cuenta financiera que figure en dichas lápidas, garantizando que ninguna cuenta eliminada resucite en ningún dispositivo.

### RF-7: Limpieza de Lápida ante Re-creación
- **Si** el usuario crea posteriormente una nueva cuenta financiera con un ID o código limpio, **el sistema debe** asegurar que no colisione con lápidas anteriores.

# spec.md — Especificación Funcional: Eliminación Definitiva de Cuentas Contables y Prevención de Resurrección en la Sincronización

**Versión:** 1.0.0  
**Estado:** aprobada  
**Fecha:** 2026-11-19  
**Autor:** Coordinador SDD & Usuario  

---

## 1. Propósito y Contexto de Negocio

En el entorno multi-dispositivo y offline-first de la aplicación de Contabilidad Personal, cuando un usuario decide eliminar una subcuenta del catálogo contable (ej. `1.1.02.02`), un presupuesto mensual o una meta de ahorro personal desde uno de sus dispositivos, dicha acción debe persistirse y propagarse de forma definitiva. La sincronización automática con la nube (Firebase Firestore) no debe interpretar la ausencia local de la entidad como una discrepancia para restaurarla, sino como una eliminación deliberada que debe replicarse en todos los dispositivos vinculados. Asimismo, las modificaciones a los atributos de las cuentas (nombres, colores) deben tener precedencia local frente a datos remotos antiguos.

---

## 2. Historias de Usuario

- **HU-1: Eliminación definitiva de subcuentas del plan contable**
  - *Como* usuario que organiza su catálogo contable,
  - *Quiero* eliminar una subcuenta personalizada que ya no utilizo (sin movimientos registrados),
  - *Para que* al salir, entrar o sincronizar con la nube, la cuenta no vuelva a aparecer resucitada en mi listado.

- **HU-2: Propagación de eliminaciones entre dispositivos**
  - *Como* usuario con múltiples dispositivos (PC y teléfono móvil),
  - *Quiero* que al borrar una cuenta o entidad en mi computadora, el teléfono móvil también la elimine de forma transparente al sincronizar,
  - *Para que* ambos dispositivos mantengan exactamente el mismo catálogo contable consolidado.

- **HU-3: Recreación voluntaria de cuentas con el mismo código**
  - *Como* usuario que eliminó una cuenta anteriormente,
  - *Quiero* poder volver a crear voluntariamente una nueva cuenta utilizando ese mismo código si así lo decido en el futuro,
  - *Para que* el sistema no bloquee su alta ni la considere permanentemente extinta.

- **HU-4: Precedencia local en atributos modificados**
  - *Como* usuario que personaliza sus cuentas,
  - *Quiero* que al editar el nombre o color de una cuenta, mis cambios locales prevalezcan sobre datos remotos viejos durante la sincronización,
  - *Para que* la app conserve fielmente las modificaciones que realizo en mi dispositivo en uso.

---

## 3. Requisitos Funcionales (EARS)

### RF-1: Registro persistente de entidades eliminadas (Lápidas / Tombstones)
- **EARS (Event-Driven):** *Cuando* el usuario confirme la eliminación de una subcuenta del plan contable, un presupuesto o una meta de ahorro, el sistema *deberá* registrar el identificador o código contable de la entidad en un listado de eliminados (`deletedPlanAccounts`, `deletedBudgets`, `deletedGoals`) y *deberá* persistirlo en el almacenamiento local.

### RF-2: Supresión y descarte en la función de fusión contable
- **EARS (Ubiquitous):** Durante la ejecución de `fusionarEstadoContable(localState, remoteState)`, el sistema *deberá* unificar los listados de eliminados locales y remotos y *deberá* descartar e impedir la reincorporación de cualquier elemento (local o remoto) cuyo identificador o código figure en la lista unificada de eliminados.

### RF-3: Sincronización inmediata de eliminaciones hacia la nube
- **EARS (Event-Driven):** *Cuando* el usuario elimine exitosamente una subcuenta, presupuesto o meta, el sistema *deberá* disparar inmediatamente la sincronización bidireccional en segundo plano, actualizando el documento consolidado en la nube con el catálogo limpio y la lista de eliminados.

### RF-4: Propagación pasiva hacia otros dispositivos
- **EARS (State-Driven):** *Mientras* un segundo dispositivo reciba una sincronización que contenga identificadores en la lista de eliminados unificada, el sistema *deberá* purgar localmente dichas entidades de su almacenamiento y vistas activas.

### RF-5: Reactivación o alta limpia ante recreación voluntaria
- **EARS (Event-Driven):** *Cuando* el usuario cree o guarde una nueva subcuenta utilizando un código contable previamente eliminado, el sistema *deberá* remover dicho código de la lista de eliminados para permitir su persistencia normal.

### RF-6: Precedencia de modificaciones locales en atributos de cuentas
- **EARS (Event-Driven):** *Cuando* el sistema fusione cuentas o subcuentas existentes entre local y remoto, el sistema *deberá* dar prioridad a los atributos modificados en el estado local sobre la versión remota (`{ ...remoto, ...local }`), y *deberá* sincronizar reactivamente el nombre en el catálogo contable.

---

## 4. Criterios de Aceptación y Casos Límite

1. **Sin movimientos contables asociados:** Solo se permite la eliminación de cuentas si no tienen transacciones asociadas (`puedeEliminarCuentaPlan`).
2. **Defensividad:** Si las listas de eliminados son nulas o indefinidas en cualquiera de los estados (local o remoto), la fusión debe operar con un arreglo vacío por defecto sin fallar.
3. **Inmutabilidad:** Las listas y colecciones de entrada no deben mutarse directamente durante el recálculo y la fusión.

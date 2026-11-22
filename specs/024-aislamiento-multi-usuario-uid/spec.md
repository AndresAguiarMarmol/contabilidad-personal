# Especificación Funcional — Spec 024: Aislamiento Estricto Multi-Usuario por UID en Almacenamiento Local y Sincronización en la Nube

**Estado:** Aprobada  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Propósito y Contexto de Negocio
En hogares o familias donde múltiples personas (ej. cónyuges) utilizan la aplicación en el mismo dispositivo o navegador, cada usuario posee sus propias credenciales de acceso privadas en Firebase Authentication. Anteriormente, el almacenamiento local (`localStorage`) utilizaba claves globales fijas sin asociar al identificador único de usuario (UID). Esto provocaba que al cerrar la sesión de un usuario e iniciar la de otro en la misma máquina o navegador, los datos locales del primer usuario permanecieran en memoria y fueran fusionados por el motor de sincronización (`syncBidirectional`) con los datos remotos del segundo usuario en Cloud Firestore, mezclando cuentas bancarias, movimientos y metas patrimoniales de ambas personas.

Se requiere implementar un **aislamiento estricto por UID** tanto en el almacenamiento local como en el ciclo de vida de sesión y sincronización remota, garantizando que los datos de un usuario sean completamente invisibles e inaccesibles para otro usuario en el mismo dispositivo o navegador, y que cada cual pueda limpiar las cuentas que se hayan mezclado sin afectar al otro.

---

## 2. Historias de Usuario

- **HU-1 (Privacidad y Aislamiento Total):** Como usuario de la contabilidad personal, quiero que mis cuentas bancarias, billeteras, transacciones y metas se mantengan 100% privadas y separadas de las de mi cónyuge u otros usuarios que usen el mismo dispositivo.
- **HU-2 (Conmutación Limpia de Sesión):** Como usuario, quiero que al cerrar mi sesión o al ingresar otro usuario con su propia cuenta, la aplicación limpie de inmediato la memoria y cargue exclusivamente los datos correspondientes al usuario activo autenticado.
- **HU-3 (Sincronización Aislada en la Nube):** Como usuario, quiero que el motor de sincronización opere únicamente entre el almacenamiento local específico de mi UID y mi documento privado en Cloud Firestore (`workspaces/{mi_uid}`), sin fusionar jamás datos de sesiones previas de otros usuarios.
- **HU-4 (Purga / Corrección de Datos Mezclados):** Como usuario, quiero poder revisar y eliminar fácilmente de mi espacio de trabajo aquellas cuentas o movimientos que hayan sido mezclados erróneamente, sin que resuciten ni afecten al otro usuario.

---

## 3. Requisitos Funcionales (Sintaxis EARS)

### RF-1: Derivación Pura de Claves Particionadas por UID (Ubicuo)
El sistema debe implementar una función pura `obtenerClaveStorage(claveBase, uid)` que devuelva la clave de almacenamiento local prefijada y particionada por el identificador único del usuario (`finance_${uid}_${claveBase}` o `finance_${uid}_...` normalizado si la clave base ya incluye `finance_`). Si `uid` es nulo o indefinido, debe devolver la clave base sin prefijo de usuario.

### RF-2: Espacio de Nombres Aislado en Storage (Ubicuo)
El módulo `Storage` debe gestionar el `activeUid` de la sesión activa y rutear todas las operaciones de lectura y escritura de entidades contables (`accounts`, `transactions`, `budgets`, `goals`, `planAccounts`, `currencies`, `deletedAccounts`, `deletedPlanAccounts`, `deletedBudgets`, `deletedGoals`) a través de sus respectivas claves particionadas por UID.

### RF-3: Conmutación Limpia de Usuario en Login (Event-driven)
Cuando un usuario inicia sesión (o crea cuenta), el sistema debe establecer el `activeUid` en `Storage` con el UID del usuario autenticado antes de invocar `loadStateFromStorage()`, garantizando que si el usuario no tiene datos previos en este dispositivo, inicie con un espacio limpio o descargue únicamente sus datos desde `workspaces/{uid}` en Cloud Firestore.

### RF-4: Purga de Memoria Activa en Cierre de Sesión (Event-driven)
Cuando el usuario presiona "Cerrar Sesión", el sistema debe:
1. Eliminar la sesión activa (`Storage.clearAuthSession()`).
2. Restablecer el `activeUid` a `null`.
3. Purgar en memoria activa (`state`) todas las cuentas, transacciones, presupuestos, metas, plan de cuentas y lápidas.
4. Bloquear la aplicación activando la pantalla de acceso (`#auth-gate-screen`).

### RF-5: Sincronización Bidireccional Aislada y con Salvaguarda (Event-driven)
Cuando se ejecuta la sincronización con Cloud Firestore (`DbAdapter.syncBidirectional`):
1. El sistema debe comprobar que exista una sesión activa con UID válido. Si no existe, no debe intentar fusionar ni guardar en la nube.
2. El sistema debe leer el estado local estrictamente del espacio del UID activo.
3. El sistema debe leer y escribir únicamente en el documento `workspaces/{session.uid}`.
4. Las lápidas de eliminación generadas por el usuario se guardan exclusivamente en su documento privado, permitiendo eliminar cuentas ajenas mezcladas sin alterar el workspace del otro usuario.

---

## 4. Requisitos No Funcionales y Restricciones

- **RNF-1 (Confidencialidad Absoluta):** Cero fuga de información financiera entre usuarios que comparten dispositivo o navegador.
- **RNF-2 (Determinismo y Testabilidad):** Las funciones de resolución de claves y aislamiento deben ser funciones puras probadas con `node --test`.
- **RNF-3 (Compatibilidad y Cero Regresiones):** No romper ninguna de las 114 pruebas existentes del sistema.
- **RNF-4 (Descontaminación Segura):** Cada usuario puede eliminar cuentas en su perfil usando la funcionalidad de eliminación en cascada con lápidas (Spec 017), garantizando que no se re-sincronicen hacia el otro usuario.

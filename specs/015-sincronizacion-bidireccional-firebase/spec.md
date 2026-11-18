# Spec 015 — Sincronización Bidireccional Multi-Dispositivo con Firebase Firestore

Estado: implementada

## 1. Contexto y Problema
El usuario configuró exitosamente Firebase Cloud Firestore en su proyecto `mi-propia-contabilidad` tanto en su PC como en su iPhone. Sin embargo, al registrar movimientos en un dispositivo, estos no aparecen en el otro.
La causa de raíz identificada es:
1. La aplicación almacena los datos de forma aislada en el `localStorage` de cada navegador/dispositivo.
2. La implementación previa de `DbAdapter` únicamente permitía subir una copia estática JSON a la colección `backups` mediante un botón manual en Configuración, sin descargar ni fusionar transacciones entre dispositivos.
3. No existía sincronización automática al guardar movimientos, al iniciar la aplicación, ni al retomar el foco de la pantalla en dispositivos móviles.

El objetivo de esta especificación es implementar una **Sincronización Bidireccional Multi-Dispositivo Automática y Concurrente**, garantizando que cualquier movimiento, cuenta o presupuesto registrado en la PC se refleje en el iPhone y viceversa, manteniendo al 100% el funcionamiento offline-first.

---

## 2. Historias de Usuario
- **HU-1:** Como usuario, quiero registrar un movimiento en mi iPhone y que al abrir o mirar la app en mi PC aparezca reflejado de inmediato con el saldo de cuenta actualizado.
- **HU-2:** Como usuario, quiero registrar un movimiento en mi PC y que mi iPhone lo sincronice automáticamente al abrir la app o al volver a ella.
- **HU-3:** Como usuario, quiero que la sincronización combine inteligentemente las transacciones de ambos dispositivos sin duplicar registros ni perder información existente.
- **HU-4:** Como usuario, quiero disponer de un botón visible de sincronización con indicador de estado (en la nube) para forzar la actualización manual en cualquier momento.
- **HU-5:** Como usuario, quiero que la app siga funcionando sin conexión (offline) y que suba las transacciones pendientes en cuanto recupere la conectividad.

---

## 3. Requisitos Funcionales (EARS)

- **RF-1 (Fusión Bidireccional Determinista):** EL SISTEMA dispondrá de una función pura `fusionarEstadoContable(localState, remoteState)` que unirá transacciones, cuentas, presupuestos, metas y plan de cuentas sin duplicar identificadores únicos (`id`), preservando las transacciones de ambos dispositivos y recalculando los balances contables de las cuentas de forma matemática e inmutable.
- **RF-2 (Persistencia Central en Firestore):** MIENTRAS Firebase esté configurado como proveedor, EL SISTEMA mantendrá sincronizado el estado contable en el documento `workspace/main` (y colecciones vinculadas) de Cloud Firestore mediante la API REST.
- **RF-3 (Sincronización Automática al Iniciar):** CUANDO la aplicación arranca en cualquier dispositivo (`startApp`), EL SISTEMA ejecutará una sincronización en segundo plano con Firestore, fusionando los datos locales con los remotos y actualizando la interfaz reactivamente si hay cambios.
- **RF-4 (Sincronización Automática tras Mutaciones):** CUANDO el usuario agregue, edite o elimine una transacción, cuenta, presupuesto, meta o subcuenta, EL SISTEMA guardará primero en `localStorage` (respuesta inmediata) y disparará inmediatamente la sincronización en segundo plano hacia Firestore.
- **RF-5 (Sincronización al Volver a la App):** CUANDO el usuario regrese a la pestaña o aplicación en el móvil (evento `visibilitychange` o `focus`), EL SISTEMA verificará si hay nuevos datos en Firestore y actualizará la vista.
- **RF-6 (Control Manual y Feedback Visual):** EL SISTEMA ofrecerá un botón de sincronización accesible con retroalimentación visual (toast e indicador de última sincronización).

---

## 4. Requisitos No Funcionales
- **RNF-1 (Offline-First Resiliente):** Si el dispositivo está sin red o la petición falla, la app opera normalmente sobre `localStorage` sin bloquear la interacción del usuario.
- **RNF-2 (Rendimiento Móvil):** La sincronización utiliza llamadas HTTP consolidadas para minimizar el consumo de datos y batería en dispositivos móviles (iPhone/Android).
- **RNF-3 (Compatibilidad Universal):** Compatible con navegadores móviles (Safari iOS, Chrome Android) y de escritorio, sin bundlers obligatorios.

---

## 5. Criterios de Finalización (DoD)
- [x] Función pura `fusionarEstadoContable` implementada y probada con TDD al 100% (5/5 pruebas específicas, 72/72 totales).
- [x] Métodos `fetchRemoteWorkspace`, `saveRemoteWorkspace` y `syncBidirectional` implementados en `DbAdapter`.
- [x] Auto-sincronización conectada en `app.js` (inicio, guardado de transacciones/cuentas/metas/plan, y cambio de visibilidad).
- [x] Botón interactivo de sincronización `#btn-quick-sync` en la cabecera con feedback en vivo e icono animado.
- [x] 100% de pruebas unitarias existentes y nuevas en verde (`node --test`).
- [x] `memory.md` actualizado con la arquitectura de sincronización multi-dispositivo.
- [x] Commit convencional y push a GitHub (`main`).

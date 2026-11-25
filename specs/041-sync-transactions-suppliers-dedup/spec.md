# Spec 041 — Fiabilidad de Sincronización Multi-Transacción Móvil y Deduplicación Estricta de Proveedores

## 1. Contexto y Problema
El usuario reporta dos anomalías críticas en el flujo de trabajo cotidiano entre dispositivos (teléfono móvil y PC):
1. **Pérdida/Omisión de transacciones en sincronización móvil a PC:**
   El usuario cargó 4 movimientos en el celular, pero al abrir la aplicación en el PC únicamente se reflejó 1 movimiento.
   - *Causa raíz A (Límite 1MB Firestore y comprobantes PDF):* Los comprobantes adjuntos a las transacciones (`invoicePdf`) se almacenaban en Base64 de alta resolución o sin límite de tamaño en el documento consolidado `workspaces/{uid}`. Al acumularse 4 movimientos con comprobantes, el documento excedía el límite estricto de 1.048.576 bytes (1 MiB) de Cloud Firestore REST API, produciendo rechazo `HTTP 400 (Document too large)`. El primer movimiento cupo, pero al sobrepasar la cuota los siguientes fueron rechazados por la nube, quedando aislados en el teléfono.
   - *Causa raíz B (Carrera de sincronización en ráfaga `isSyncing`):* Al cargar transacciones de forma consecutiva en el celular, la primera activaba `triggerAutoSync` bloqueando `isSyncing = true`. Las cargas subsiguientes encontraban `isSyncing === true` y salían de inmediato con `return`, sin una cola que ejecutara la sincronización pendiente al terminar la anterior.
2. **Duplicación de Proveedores al Cargar Múltiples Facturas/Boletas:**
   Al escanear o cargar 2 facturas/boletas del mismo proveedor (ej. "Líder" / "Lider", "Enel" / "Enel Distribución"), la aplicación genera proveedores duplicados en la base de datos.
   - *Causa raíz A (Falta de normalización canónica):* La comparación se realizaba únicamente con `toLowerCase()` estricto sin eliminar tildes/diacríticos (`Líder` vs `Lider`), sufijos legales (`S.A.`, `SpA`, `Ltda.`), o espacios redundantes.
   - *Causa raíz B (Fusión en la nube indexada solo por ID):* En `fusionarEstadoContable`, el mapa de proveedores indexaba exclusivamente por `s.id`. Si el teléfono y el PC o dos formularios generaban IDs distintos (`SUP-1...` y `SUP-2...`) para el mismo comercio, la fusión mantenía ambos.
   - *Causa raíz C (Creación en Configuración sin validación de unicidad):* El modal de nuevo proveedor en Configuración no validaba si ya existía un proveedor con nombre equivalente.

---

## 2. Requerimientos Funcionales (EARS)

- **RF-1 (Normalización Canónica de Proveedores):**
  - La función pura `Calculations.canonicalizarNombreProveedor(name)` DEBE transformar cualquier nombre de proveedor a su forma canónica: minúsculas, sin tildes/diacríticos (NFD), sin signos de puntuación, sin sufijos empresariales comunes (`s.a.`, `spa`, `ltda`, `limitada`, `eirl`, `sa`, `inc`, `corp`, `llc`) y con espacios normalizados.
  - Ejemplos: `"Supermercados Líder S.A."` $\rightarrow$ `"supermercados lider"`, `"LÍDER"` $\rightarrow$ `"lider"`, `"Lider"` $\rightarrow$ `"lider"`.

- **RF-2 (Deduplicación Inmutable de Proveedores):**
  - La función pura `Calculations.deduplicarProveedores(suppliersList)` DEBE recibir una lista de proveedores (potencialmente con duplicados históricos) y retornar una lista limpia sin duplicados canónicos ni duplicados de ID.
  - Ante registros duplicados, DEBE fusionar los datos preservando el registro con mejor información (categoría, método de pago, notas) y la marca `updatedAt` más reciente.

- **RF-3 (Fusión Bidireccional Determinista de Proveedores por ID y Nombre Canónico):**
  - En `Calculations.fusionarEstadoContable(localState, remoteState)`, la sección de proveedores DEBE unificar tanto por `s.id` como por clave canónica `canonicalizarNombreProveedor(s.name)`.
  - Si un proveedor remoto tiene diferente ID pero mismo nombre canónico que uno local, DEBEN fusionarse en un único registro sin crear duplicados.

- **RF-4 (Control Anti-Duplicados en Formulario de Transacciones y Configuración):**
  - Al guardar un movimiento (`form-new-tx`), si el proveedor ingresado coincide canónicamente con uno existente en `state.suppliers`, NO DEBE crearse un nuevo proveedor. Si el existente no tiene categoría y la transacción actual sí, se enriquece el proveedor existente.
  - Al crear un proveedor manualmente en Configuración (`openSupplierModal`), DEBE validarse contra la clave canónica. Si ya existe, DEBE alertar al usuario e impedir el duplicado.
  - Al iniciar la aplicación (`startApp` / `loadStateFromStorage`), DEBE ejecutarse `deduplicarProveedores` para sanear inmediatamente cualquier duplicado histórico preexistente.

- **RF-5 (Cola de Sincronización Desatendida `hasPendingSync`):**
  - En `triggerAutoSync`, si `isSyncing === true` al invocar una nueva sincronización, el sistema DEBE activar la bandera `hasPendingSync = true`.
  - Al finalizar la sincronización en curso (bloque `finally`), si `hasPendingSync === true`, DEBE disparar de inmediato una nueva sincronización para garantizar que ninguna transacción cargada en ráfaga quede sin subir a la nube.

- **RF-6 (Protección y Optimización de Carga Útil contra Límite 1MB de Firestore):**
  - En la captura y conversión de comprobantes (`convertirFotoAPdf`), se optimiza la compresión JPEG (dimensión máxima 800px, calidad 0.55-0.6) para generar PDFs livianos de 30-60KB con total legibilidad.
  - En `DbAdapter.saveRemoteWorkspace`, se implementa una función pura `sanearWorkspaceParaNube(workspaceData, maxBytes = 900000)`: si el tamaño del payload serializado excede el umbral seguro de Firestore (~900KB), comprime o purga los PDFs adjuntos de transacciones antiguas (preservando siempre el nombre del archivo `invoiceName`, la fecha, proveedor y metadatos contables), asegurando que el documento jamás sea rechazado por la nube.
  - Si `saveRemoteWorkspace` recibe un error de Firestore, DEBE retornar `success: false` con mensaje claro y `syncBidirectional` NO DEBE reportar falsamente éxito.

---

## 3. Criterios de Aceptación
1. 100% de las pruebas unitarias existentes (195) pasan sin regresión.
2. Nuevas pruebas unitarias TDD en `tests/sync-transactions-suppliers-dedup.test.js` cubren RF-1 a RF-6.
3. Al escanear dos boletas o facturas con el mismo proveedor ("Líder" y "Lider"), la BD solo almacena 1 proveedor único.
4. Al cargar múltiples transacciones en rápida sucesión en el celular, la cola `hasPendingSync` asegura que todas se repliquen en Firestore y aparezcan en el PC.
5. Service Worker actualizado a `contapersonal-v24` en `sw.js`.
6. `memory.md` actualizado en secciones 1, 2 y 3.

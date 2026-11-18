# Spec 014 — Integración de Base de Datos y Alojamiento con Firebase (Cloud Firestore & Hosting)

Estado: implementada

## 1. Contexto y Objetivo
La aplicación de Contabilidad Personal operaba por defecto en modo local offline (`localStorage`) con un adaptador preparado para bases de datos remotas. El usuario solicita utilizar **Firebase** como base de datos en la nube para alojar y respaldar sus datos y archivos contables de forma segura y accesible.

El usuario ya cuenta con el proyecto activo de Firebase:
- **Project ID:** `mi-propia-contabilidad`
- **App ID (Web):** `1:439451384787:web:a3aba20323ba6edb058d26`
- **Web API Key:** `AIzaSyCjcppkAHLLNTZRomuGqz_Q96nMdnEnqtU`
- **Auth Domain:** `mi-propia-contabilidad.firebaseapp.com`
- **Storage Bucket:** `mi-propia-contabilidad.firebasestorage.app`

El objetivo de esta especificación es:
1. Configurar la integración con **Firebase** en el proyecto (`.firebaserc`, `firebase.json` y `firestore.rules`).
2. Implementar en `assets/js/dbAdapter.js` el soporte completo para **Cloud Firestore** mediante API REST y adaptador universal (compatible con navegador y Node.js, sin dependencias complejas ni necesidad de bundlers).
3. Permitir operaciones de:
   - Probar conexión en vivo contra Firebase.
   - Sincronizar entidades (cuentas, transacciones, presupuestos, metas, plan de cuentas).
   - Guardar y restaurar copias de respaldo JSON directamente en la colección `backups` de Firebase.
4. Actualizar la vista de Configuración (`#view-settings`) para seleccionar Firebase como proveedor de base de datos en la nube y gestionar la sincronización.
5. Dejar listo el despliegue a **Firebase Hosting** para acceder a la PWA en `https://mi-propia-contabilidad.web.app`.

---

## 2. Historias de Usuario
- **HU-1:** Como usuario, quiero conectar mi aplicación de Contabilidad Personal a mi base de datos en Firebase (`mi-propia-contabilidad`) para respaldar y sincronizar mis movimientos y cuentas en la nube.
- **HU-2:** Como usuario, quiero un botón para probar la conexión con Firebase y verificar si la base de datos está activa y accesible.
- **HU-3:** Como usuario, quiero poder sincronizar mis datos actuales hacia Firebase y recuperarlos cuando inicie sesión en otro equipo o navegador.
- **HU-4:** Como usuario, quiero poder guardar un archivo de respaldo JSON completo en la base de datos de Firebase con fecha y hora.
- **HU-5:** Como usuario, quiero que la aplicación funcione fluidamente tanto offline en `localStorage` como sincronizada con Firebase.

---

## 3. Requisitos Funcionales (EARS)

- **RF-1 (Detección y configuración de proveedor):** MIENTRAS la aplicación inicia, EL SISTEMA lee la configuración de base de datos remota (`finance_remote_db_config`), soportando `"firebase"` como proveedor activo con sus credenciales correspondientes.
- **RF-2 (Prueba de conexión con Firebase):** CUANDO el usuario hace clic en "Probar Conexión", EL SISTEMA realiza una solicitud de verificación a la API de Firestore y reporta el estado exacto (éxito o mensaje de instrucción en caso de requerir activación en consola).
- **RF-3 (Sincronización hacia la nube):** CUANDO el usuario pulsa "Sincronizar con Firebase", EL SISTEMA envía los datos actuales (cuentas, transacciones, presupuestos, metas, plan de cuentas) hacia las colecciones correspondientes de Firestore preservando integridad y tipos.
- **RF-4 (Copia de respaldo en la nube):** CUANDO el usuario solicita alojar un respaldo en Firebase, EL SISTEMA genera el documento de respaldo con metadata (fecha, versión, conteos) y lo persiste en la colección `backups` de Firestore.
- **RF-5 (Reglas de seguridad declarativas):** EL SISTEMA define `firestore.rules` protegiendo los documentos contables contra accesos no autorizados y validando la estructura de las colecciones.
- **RF-6 (Lógica desacoplada y probada):** EL SISTEMA implementa los métodos de conexión, formateo y transformación de documentos Firestore en `assets/js/dbAdapter.js` con pruebas unitarias ejecutadas mediante `node --test`.

---

## 4. Requisitos No Funcionales
- **RNF-1:** Compatibilidad total con ejecución local (`file:///`), servidores locales y despliegue en Firebase Hosting.
- **RNF-2:** Sin dependencias externas pesadas de compilación (cero bundlers obligatorios).
- **RNF-3:** Resiliencia offline garantizada; si no hay red, la aplicación sigue funcionando 100% sobre `localStorage`.

---

## 5. Criterios de Finalización (DoD)
- [x] Archivos `.firebaserc` y `firebase.json` configurados para el proyecto `mi-propia-contabilidad`.
- [x] Reglas `firestore.rules` generadas y validadas mediante dry-run del CLI.
- [x] `assets/js/dbAdapter.js` ampliado con soporte completo para Firebase Firestore (conexión, serialización, sincronización y respaldos).
- [x] Interfaz de Configuración (`#view-settings`) actualizada con panel interactivo de Firebase y feedback en tiempo real.
- [x] 100% de pruebas unitarias en verde (`node --test`, 67/67 pasando).
- [x] Actualización de `memory.md` (secciones 1, 2 y 3).
- [x] Sincronización y commit en GitHub (`main`).

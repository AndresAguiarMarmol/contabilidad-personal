# Plan de Arquitectura y Diseño Técnico — Spec 014 (Firebase Firestore & Hosting)

## 1. Arquitectura de Integración con Firebase

La integración se basa en la API REST v1 de Cloud Firestore (`https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents`):
- Ventajas principales:
  1. **Sin dependencias pesadas:** No requiere descargar megabytes de paquetes de npm en el cliente ni herramientas de bundling (Vite, Webpack).
  2. **Universalidad absoluta:** Funciona de forma idéntica en el navegador (vía `fetch` nativo) y en Node.js (con pruebas automatizadas).
  3. **Compatibilidad Offline / Local:** Si no hay conexión o no está configurado Firebase, el sistema se mantiene en `localStorage` sin errores.

### Mapeo de Documentos Firestore
La API REST de Firestore requiere envolver los valores en tipos primitivos:
- String: `{ stringValue: "..." }`
- Número: `{ doubleValue: 123.45 }` o `{ integerValue: "123" }`
- Booleano: `{ booleanValue: true }`
- Array: `{ arrayValue: { values: [...] } }`
- Mapa / Objeto: `{ mapValue: { fields: { ... } } }`

Implementaremos los métodos auxiliares puros en `dbAdapter.js`:
- `toFirestoreFields(obj)`: convierte un objeto JavaScript estándar a la estructura de campos requerida por Firestore REST API.
- `fromFirestoreFields(fields)`: desempaqueta los campos de Firestore REST API hacia un objeto JavaScript limpio.

---

## 2. Configuración del Proyecto Firebase

1. **`.firebaserc`**:
   ```json
   {
     "projects": {
       "default": "mi-propia-contabilidad"
     }
   }
   ```
2. **`firebase.json`**:
   Configura Hosting para servir los archivos de la PWA estática y enlazar las reglas de Firestore.
3. **`firestore.rules`**:
   Reglas de seguridad para las colecciones `accounts`, `transactions`, `budgets`, `goals`, `planAccounts` y `backups`.

---

## 3. Ampliación de `assets/js/dbAdapter.js`

El objeto `DbAdapter` soportará los métodos:
- `isConfigured()`: retorna verdadero si el proveedor es `"firebase"` o `"supabase"` con credenciales válidas.
- `getProvider()`: `"firebase" | "supabase" | "none"`.
- `testFirebaseConnection(config)`: realiza un GET a la raíz de documentos de Firestore para comprobar credenciales y conectividad.
- `saveBackupToFirebase(backupData, config)`: guarda un documento en la colección `backups` de Firestore con metadata.
- `syncAll(config)`: envía todas las entidades locales hacia Firestore.
- `fetchBackupFromFirebase(backupId, config)`: recupera un respaldo desde Firestore.

---

## 4. Estrategia de Pruebas (TDD)
- Archivo: `tests/firebase-db.test.js`.
- Casos de prueba:
  1. `toFirestoreFields` serializa correctamente strings, números, booleanos, arrays y objetos anidados.
  2. `fromFirestoreFields` deserializa correctamente campos Firestore a objetos JavaScript.
  3. `isConfigured` detecta configuración válida de Firebase (`provider: 'firebase'`, `projectId`, `apiKey`).
  4. `testFirebaseConnection` maneja validación de credenciales vacías y errores de endpoint.
  5. Sincronización y empaquetado de copias de respaldo para Firestore.

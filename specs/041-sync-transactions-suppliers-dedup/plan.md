# Plan de Implementación — Spec 041

## Arquitectura y Componentes Afectados
1. **`assets/js/financeCalculations.js`:**
   - Implementar `canonicalizarNombreProveedor(name)`.
   - Implementar `deduplicarProveedores(suppliersList)`.
   - Actualizar `extraerProveedoresDesdeTransacciones` para usar `canonicalizarNombreProveedor`.
   - Actualizar `fusionarEstadoContable` para deduplicar proveedores por ID y clave canónica con resolución LWW.
   - Implementar `sanearWorkspaceParaNube(workspaceData, maxBytes)`.

2. **`assets/js/dbAdapter.js`:**
   - En `saveRemoteWorkspace`: aplicar `sanearWorkspaceParaNube` antes de serializar `toFirestoreFields`.
   - Validar la respuesta de `saveRemoteWorkspace` en `syncBidirectional`: si falla, retornar fallo con descripción clara en vez de dar falso positivo de éxito.

3. **`assets/js/app.js`:**
   - En `triggerAutoSync`: implementar la cola `hasPendingSync` y manejo seguro en `finally`.
   - En `form-new-tx` submit: usar `canonicalizarNombreProveedor` para evitar crear proveedores duplicados y enriquecer categoría si aplica.
   - En `openSupplierModal` (Configuración): validar contra duplicados canónicos antes de agregar.
   - En `loadStateFromStorage` / inicio: sanear `state.suppliers` con `deduplicarProveedores`.
   - En `convertirFotoAPdf`: ajustar resolución a 800px y calidad 0.55-0.60 para generar PDFs de 30-50KB.

4. **`sw.js`:**
   - Incrementar versión de caché a `contapersonal-v24`.

5. **`memory.md`:**
   - Registrar la arquitectura y decisiones de la Spec 041.

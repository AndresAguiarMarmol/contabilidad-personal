# Especificación — Spec 022: Acceso Obligatorio con Firebase Authentication (Auth Gate) y Limpieza Total de Datos

## 1. Visión y Propósito
El objetivo de esta especificación es transformar la aplicación en una plataforma estrictamente autenticada y privada. Para acceder a cualquier funcionalidad contable (cuentas, transacciones, presupuestos, metas, plan contable, reportes y configuración), el usuario debe estar **obligatoriamente validado por Firebase Authentication**.

Adicionalmente, se elimina toda la información ficticia o de demostración previa (cuentas bancarias demo, movimientos simulados, presupuestos y metas de ejemplo), dejando la base de datos limpia para que cada usuario comience con sus datos reales desde cero.

---

## 2. Requisitos del Sistema (Formato EARS)

### Requisitos Funcionales (RF)

#### RF-1: Puerta de Enlace Obligatoria (Auth Gate)
- **Mientras** no exista una sesión válida y activa de Firebase Authentication (`authSession` nula o token expirado no renovable), **el sistema deberá** bloquear completamente el acceso a la aplicación, ocultando la barra de navegación, la cabecera y todas las vistas contables.
- **Mientras** el acceso esté bloqueado, **el sistema deberá** desplegar de forma exclusiva la pantalla a pantalla completa de autenticación (`#auth-gate-screen`), presentando el formulario para "Iniciar Sesión" o "Crear Cuenta".

#### RF-2: Desbloqueo Inmediato tras Autenticación Válida
- **Cuando** el usuario inicie sesión exitosamente o cree una nueva cuenta con sus credenciales (correo y contraseña), **el sistema deberá** ocultar la pantalla de bloqueo `#auth-gate-screen`, mostrar el contenedor principal de la aplicación (`#app-container`), cargar sus datos del workspace privado (`workspaces/{uid}`) y renderizar el Dashboard patrimonial.

#### RF-3: Retorno Inmediato a Bloqueo al Cerrar Sesión
- **Cuando** el usuario presione el botón "Cerrar Sesión", **el sistema deberá** purgar los tokens de sesión de `localStorage`, limpiar el estado en memoria, ocultar la interfaz principal y desplegar de inmediato la pantalla de bloqueo `#auth-gate-screen`.

#### RF-4: Limpieza Total de Datos de Demostración (Clean Slate)
- **El sistema deberá** eliminar las semillas de demostración predeterminadas (`INITIAL_ACCOUNTS`, `INITIAL_TRANSACTIONS`, `INITIAL_BUDGETS`, `INITIAL_GOALS` con datos ficticios), de modo que un nuevo usuario o un almacén reiniciado parta con:
  - Cuentas financieras (bancos, tarjetas, efectivo): lista vacía (0 cuentas).
  - Transacciones: lista vacía (0 movimientos).
  - Presupuestos mensuales: lista vacía (0 presupuestos).
  - Metas de ahorro: lista vacía (0 metas).
  - Plan de Cuentas Contable: Plantilla base completa (Clase 1 a 5 según IFRS Pymes Chile) con saldos contables en **$0**.
  - Monedas: Catálogo base con CLP como moneda de referencia y tasas vigentes para USD, EUR y ARS.

#### RF-5: Aislamiento por Usuario en Persistencia Local
- **Cuando** un usuario autenticado trabaje en la aplicación, **el sistema deberá** asociar sus datos locales en `localStorage` a su identificador de usuario (`uid`), evitando contaminación entre diferentes cuentas en el mismo navegador.

---

### Requisitos No Funcionales (RNF)

- **RNF-1: Seguridad Visual y UX Fluida:** La pantalla de autenticación no debe mostrar destellos (*flash of unauthenticated content - FOUC*) de las pantallas contables durante la carga inicial.
- **RNF-2: Resiliencia en Validación de Sesión:** Si la sesión persistida contiene un token expirado, el sistema intentará renovarlo en segundo plano antes de decidir si bloquea o permite el paso.
- **RNF-3: Cobertura de Pruebas Unitarias:** Toda la lógica de control de acceso y limpieza de estado debe contar con pruebas unitarias automatizadas con `node --test`.

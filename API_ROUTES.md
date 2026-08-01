# Documentación de Rutas y APIs (Maranatha Control)

Esta documentación lista todas las rutas de páginas, endpoints API REST y Next.js Server Actions (que actúan como mutaciones de datos) utilizadas en la aplicación web. Este listado te será útil para estructurar la comunicación de red (por ejemplo, usando Retrofit u OkHttp) en tu aplicación Android nativa.

> [!NOTE]
> En Next.js, los "Server Actions" se llaman desde el cliente simulando llamadas a funciones asíncronas, pero por debajo realizan peticiones HTTP POST (generalmente enviando `FormData`). Al migrar a Android, necesitarás crear un backend RESTful o GraphQL equivalente que exponga estos Actions, o analizar cómo Next.js enruta estas llamadas para emularlas.

## 1. Endpoints API REST (Rutas Tradicionales)

Estos son los endpoints expuestos directamente mediante manejadores de ruta (Route Handlers) en `src/app/api/`:

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Autentica al usuario en el sistema y maneja la sesión. |
| **POST** | `/api/auth/logout` | Cierra la sesión activa del usuario. |
| **POST** | `/api/search-church` | Búsqueda de iglesias. |

## 2. Server Actions (Mutaciones de Datos)

Las siguientes funciones se utilizan a lo largo del proyecto para realizar operaciones CRUD y lógicas de negocio (típicamente reciben parámetros `FormData` y retornan promesas). En Android, cada uno de estos debería corresponder a un endpoint API (ej. `POST /api/distritos/crear`).

### Autenticación y Usuarios (`usuarios/actions.ts`)
- `listarUsuarios()`: Obtiene el listado de usuarios del sistema.
- `crearUsuario(formData: FormData)`: Registra un nuevo usuario.
- `actualizarRol(formData: FormData)`: Modifica los permisos/roles de un usuario existente.
- `eliminarUsuario(formData: FormData)`: Borra a un usuario.

### Asociaciones y Distritos
- **Asociaciones** (`asociaciones/actions.ts`):
  - `crearAsociacion(formData)`
  - `eliminarAsociacion(formData)`
- **Distritos** (`distritos/actions.ts`):
  - `crearDistrito(formData)`
  - `eliminarDistrito(formData)`

### Iglesias y Unidades (GP)
- **Iglesias** (`iglesias/actions.ts`):
  - `crearIglesia(formData)`
  - `eliminarIglesia(formData)`
- **Unidades** (`unidades/actions.ts`):
  - `crearUnidad(formData)`
  - `eliminarUnidad(formData)`

### Participantes y Asistencia
- **Participantes** (`participantes/actions.ts`):
  - `crearParticipante(formData)`
  - `editarParticipante(formData)`
  - `eliminarParticipante(formData)`
- **Asistencia** (`asistencia/actions.ts` & `unidades/[unidadId]/registro/actions.ts`):
  - `guardarAsistencia(formData)`: Guarda el estado de la grilla de asistencia.
  - `registrarAsistenciaAction(...)`: Acción detallada de registro para una unidad específica.

### Estudios Bíblicos (`estudios-biblicos/actions.ts`)
- `crearInstructorBiblico(formData)`
- `eliminarInstructorBiblico(formData)`
- `actualizarMiembrosInstructor(formData)`
- `crearEstudianteBiblico(formData)`
- `editarEstudianteBiblico(formData)`
- `eliminarEstudianteBiblico(formData)`
- `guardarAvanceEstudio(formData)`
- `marcarCandidatoBautismo(formData)`

## 3. Rutas de Interfaz (Páginas Web)

Estas son las vistas (pantallas) que existen en el proyecto web. Te servirán como referencia para saber qué **Activities** o **Fragments** (o pantallas de Jetpack Compose) necesitarás diseñar en Android.

### Rutas Públicas
- `/` - Landing Page o entrada principal.
- `/login` - Pantalla de inicio de sesión.

### Rutas Protegidas (Requieren Sesión)
- `/dashboard` - Panel principal de métricas y resumen.
- `/asistencia` - Toma de asistencia y estudio diario general.
- `/unidades` - Gestión de unidades (GP).
- `/unidades/[unidadId]/registro` - Registro específico para una unidad.
- `/participantes` - Gestión y lista de participantes/alumnos.
- `/estudios-biblicos` - Módulo de estudios bíblicos, instructores y estudiantes.
- `/iglesias` - Gestión de Iglesias.
- `/distritos` - Gestión de Distritos.
- `/asociaciones` - Gestión de Asociaciones.
- `/usuarios` - Administración de usuarios del sistema.
- `/panel-alumno` - Vista de progreso específica para el estudiante.
- `/cumpleanos` - Módulo o listado de cumpleaños.
- `/registros` - Histórico y reportes de registros.
- `/auditoria` - Registro de actividad (Logs de auditoría del sistema).

> [!TIP]
> Al momento de migrar a Android, en vez de usar Server Actions (que consumen datos tipo `FormData`), te sugiero crear una capa de Controladores de API (`/api/v1/...`) en este proyecto de Next.js. De esta forma, Next.js actuará como Backend proporcionando JSON a tu App de Android, utilizando `fetch()` (en Next) y Retrofit (en Android) de forma muy limpia.

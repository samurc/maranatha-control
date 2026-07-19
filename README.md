This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Configuración del entorno de Firebase

Maranatha Control se conecta a Firebase (Firestore, Auth) tanto desde el SDK cliente como desde `firebase-admin` en el servidor. Ambos lados fallan explícitamente (con un mensaje que indica el nombre exacto de la variable faltante) si el entorno no está configurado por completo — nunca se inicializan de forma parcial.

Copia `.env.example` a `.env.local` en la raíz del proyecto y completa cada variable con el valor real de tu propio proyecto de Firebase:

```bash
cp .env.example .env.local
```

### Variables del SDK cliente (`NEXT_PUBLIC_FIREBASE_*`)

Estas variables se incluyen en el bundle del navegador (Next.js expone cualquier variable con el prefijo `NEXT_PUBLIC_` al cliente), por lo que **no deben contener secretos**. Se obtienen desde la [consola de Firebase](https://console.firebase.google.com/): abre tu proyecto → ⚙️ **Configuración del proyecto** → pestaña **General** → sección **Tus apps** → selecciona (o crea) una app web → **Configuración del SDK** → **Config**.

| Variable | Propósito | Origen |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Clave de API del proyecto de Firebase, usada por el SDK cliente para identificar el proyecto ante los servicios de Firebase. | Campo `apiKey` del objeto de configuración del SDK web. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de autenticación usado por Firebase Auth para flujos como el inicio de sesión. | Campo `authDomain` del objeto de configuración del SDK web. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Identificador único de tu proyecto de Firebase/Firestore. | Campo `projectId` del objeto de configuración del SDK web (coincide con el ID del proyecto en Configuración del proyecto → General). |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de Cloud Storage asociado al proyecto. | Campo `storageBucket` del objeto de configuración del SDK web. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Identificador del remitente usado por Firebase Cloud Messaging. | Campo `messagingSenderId` del objeto de configuración del SDK web. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Identificador único de la app web dentro del proyecto de Firebase. | Campo `appId` del objeto de configuración del SDK web. |

### Variables de credenciales de servicio (`FIREBASE_ADMIN_*`)

Estas variables **nunca** deben llevar el prefijo `NEXT_PUBLIC_` ni exponerse al navegador: contienen credenciales privilegiadas usadas exclusivamente por `firebase-admin` en código de servidor (Route Handlers, casos de uso). Se obtienen generando una clave de cuenta de servicio nueva: consola de Firebase → ⚙️ **Configuración del proyecto** → pestaña **Cuentas de servicio** → **Generar nueva clave privada**, que descarga un archivo JSON con estos mismos campos.

| Variable | Propósito | Origen |
| --- | --- | --- |
| `FIREBASE_ADMIN_PROJECT_ID` | Identificador del proyecto de Firebase que `firebase-admin` administra desde el servidor (verificación de ID tokens, gestión de Custom_Claims). | Campo `project_id` del JSON de la cuenta de servicio descargada. |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Correo de la cuenta de servicio usada para autenticar las llamadas de `firebase-admin`. | Campo `client_email` del JSON de la cuenta de servicio descargada. |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Clave privada de la cuenta de servicio, usada para firmar las credenciales de `firebase-admin`. Incluye los saltos de línea como la secuencia literal `\n` dentro de las comillas (así se restauran los saltos reales en `firebase-admin.ts`). | Campo `private_key` del JSON de la cuenta de servicio descargada. |

### Pasos para el entorno de desarrollo local

1. Crea (o reutiliza) un proyecto de Firebase en la [consola de Firebase](https://console.firebase.google.com/) con Firestore y Authentication (proveedor de correo/contraseña) habilitados.
2. Registra una app web en ese proyecto y copia los 6 valores de configuración del SDK web a las variables `NEXT_PUBLIC_FIREBASE_*` de `.env.local`.
3. Genera una clave de cuenta de servicio nueva (Cuentas de servicio → Generar nueva clave privada) y copia `project_id`, `client_email` y `private_key` del JSON descargado a las variables `FIREBASE_ADMIN_*` de `.env.local`.
4. Ejecuta `npm run dev` y verifica que la aplicación arranca sin errores de "Falta la variable de entorno requerida: ...".
5. Nunca subas `.env.local` (ni ningún archivo `.env*` con credenciales reales) al control de versiones; solo `.env.example` (con valores de marcador de posición) se versiona.

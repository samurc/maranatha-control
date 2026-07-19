/**
 * `firebase-client.ts` (Requerimiento 24.1, 24.5, tarea 39.1).
 *
 * Inicialización del SDK cliente de Firebase, únicamente a partir de las
 * variables de entorno con prefijo `NEXT_PUBLIC_FIREBASE_` (Requirement
 * 24.1). Este módulo se importa desde Client Components
 * (`app/login/page.tsx`).
 *
 * `leerConfigClienteOLanzar()` valida explícitamente cada una de las
 * variables requeridas y lanza un `Error` con el nombre EXACTO de la
 * primera variable faltante encontrada, en vez de continuar con una
 * inicialización parcial (Requirement 24.5).
 *
 * Nota de diseño (inicialización diferida): a diferencia del extracto de
 * design.md (que invoca `initializeApp(...)` incondicionalmente en el
 * nivel superior del módulo), aquí la construcción de `firebaseAuthClient`
 * se envuelve en un `try/catch` en tiempo de carga del módulo. Un Client
 * Component como `app/login/page.tsx` todavía se renderiza en el servidor
 * durante `next build` (para producir el HTML inicial antes de la
 * hidratación), por lo que una `initializeApp()` incondicional a nivel de
 * módulo haría fallar el build completo en cualquier entorno sin un
 * proyecto de Firebase real configurado (como este entorno de desarrollo/
 * pruebas). Si la inicialización falla por falta de variables de entorno,
 * `firebaseAuthClient` queda como un `Proxy` que re-lanza el mismo `Error`
 * descriptivo (Requirement 24.5) en el momento en que el código realmente
 * intente USARLO (p. ej. al invocar `signInWithEmailAndPassword`), en vez
 * de al momento de importar el módulo. Cuando las variables de entorno SÍ
 * están presentes, `firebaseAuthClient` es la instancia real y sin
 * envoltorio de `Auth` devuelta por `getAuth()`.
 */
import {
  initializeApp,
  getApps,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Valida cada una de `VARIABLES_CLIENTE` contra `process.env` y retorna la
 * configuración de Firebase ya construida. Lanza `Error` con el nombre
 * exacto de la primera variable faltante/vacía encontrada (Requirement
 * 24.5): nunca retorna una configuración parcialmente construida.
 *
 * NOTA: Next.js solo reemplaza accesos DIRECTOS a `process.env.NEXT_PUBLIC_*`
 * en el bundle del cliente — accesos dinámicos (`process.env[variable]`) NO
 * se inlinean. Por eso cada variable se lee de forma literal aquí.
 */
function leerConfigClienteOLanzar(): FirebaseOptions {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  const entries: [string, string | undefined][] = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", apiKey],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", authDomain],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", projectId],
    ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", storageBucket],
    ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", messagingSenderId],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", appId],
  ];

  for (const [nombre, valor] of entries) {
    if (valor === undefined || valor.length === 0) {
      throw new Error(`Falta la variable de entorno requerida: ${nombre}`);
    }
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  } as FirebaseOptions;
}

/**
 * Retorna la instancia singleton de `FirebaseApp` del SDK cliente,
 * inicializándola en el primer acceso. Exportada además de
 * `firebaseAuthClient` porque otros módulos de infraestructura del lado
 * del cliente (p. ej. `firestore-client.ts`, usado por las páginas de
 * Presentación para resolver repositorios Firestore) necesitan la MISMA
 * instancia de app en vez de inicializarla por su cuenta.
 */
export function obtenerFirebaseAppCliente(): FirebaseApp {
  return getApps()[0] ?? initializeApp(leerConfigClienteOLanzar());
}

/** Construye un `Auth` que re-lanza `error` en cualquier acceso, para diferir la falla de inicialización hasta el momento de uso real. */
function crearAuthQueLanza(error: unknown): Auth {
  return new Proxy({} as Auth, {
    get(): never {
      throw error;
    },
  });
}

function inicializarAuthClient(): Auth {
  try {
    return getAuth(obtenerFirebaseAppCliente());
  } catch (error) {
    return crearAuthQueLanza(error);
  }
}

export const firebaseAuthClient: Auth = inicializarAuthClient();

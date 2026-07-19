/**
 * `firebase-admin.ts` (Requerimiento 24.2, 24.3, 24.5, tarea 39.2).
 *
 * Inicialización de `firebase-admin`, exclusivamente a partir de las
 * variables de credencial de servicio `FIREBASE_ADMIN_*` (Requirement
 * 24.2). Importa `server-only` para que Next.js falle el build si algún
 * componente de cliente llega a importar este módulo por error
 * (Requirement 24.3) — refuerzo adicional a que `firebase-admin`, como
 * paquete de Node.js, de todas formas nunca podría empaquetarse en el
 * bundle del navegador.
 *
 * `leerCredencialServidorOLanzar()` valida explícitamente cada una de las
 * variables requeridas y lanza un `Error` con el nombre EXACTO de la
 * primera variable faltante encontrada (Requirement 24.5), nunca
 * continuando con una inicialización parcial.
 *
 * Nota de diseño (inicialización diferida): igual que en
 * `firebase-client.ts`, la construcción de `firebaseAdminAuth` se envuelve
 * en un `try/catch` en tiempo de carga del módulo, en vez de dejar que
 * `initializeApp()`/`cert()` lancen incondicionalmente al importar este
 * archivo. Esto evita que la sola importación del módulo (p. ej. desde
 * `app/api/auth/login/route.ts`) rompa `next build` o la suite de pruebas
 * en un entorno sin credenciales reales de Firebase configuradas; el error
 * descriptivo de la variable faltante (Requirement 24.5) se sigue
 * lanzando, pero recién cuando `verificarIdToken` se invoca de verdad.
 */
import "server-only";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import type { CustomClaims } from "../domain/value-objects/custom-claims.vo";

const VARIABLES_SERVIDOR = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
] as const;

interface CredencialServidor {
  readonly projectId: string;
  readonly clientEmail: string;
  readonly privateKey: string;
}

/**
 * Valida cada una de `VARIABLES_SERVIDOR` contra `process.env` y retorna
 * la credencial de servicio ya construida. Lanza `Error` con el nombre
 * exacto de la primera variable faltante/vacía encontrada (Requirement
 * 24.5): nunca retorna una credencial parcialmente construida.
 */
function leerCredencialServidorOLanzar(): CredencialServidor {
  const valores: Partial<Record<(typeof VARIABLES_SERVIDOR)[number], string>> =
    {};
  for (const nombre of VARIABLES_SERVIDOR) {
    const valor = process.env[nombre];
    if (valor === undefined || valor.length === 0) {
      throw new Error(`Falta la variable de entorno requerida: ${nombre}`);
    }
    valores[nombre] = valor;
  }
  return {
    projectId: valores.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: valores.FIREBASE_ADMIN_CLIENT_EMAIL!,
    // Las claves privadas provistas vía variables de entorno suelen
    // escapar los saltos de línea reales como la secuencia literal
    // `\n`; se restauran a saltos de línea reales antes de pasarla a
    // `cert()`.
    privateKey: valores.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  };
}

/** Construye un `Auth` que re-lanza `error` en cualquier acceso, para diferir la falla de inicialización hasta el momento de uso real. */
function crearAuthQueLanza(error: unknown): Auth {
  return new Proxy({} as Auth, {
    get(): never {
      throw error;
    },
  });
}

function inicializarAdminAuth(): Auth {
  try {
    const credencial = leerCredencialServidorOLanzar();
    const app =
      getApps()[0] ?? initializeApp({ credential: cert(credencial) });
    return getAuth(app);
  } catch (error) {
    return crearAuthQueLanza(error);
  }
}

export const firebaseAdminAuth: Auth = inicializarAdminAuth();

/**
 * `verificarIdToken(idToken)` (Requirement 22.1, usado por
 * `app/api/auth/login/route.ts`).
 *
 * Función delgada sobre `firebaseAdminAuth.verifyIdToken(idToken)` que
 * traduce el token decodificado al Value Object de dominio `CustomClaims`
 * (mismo tipo consumido por `AuthAdminPort`). Propaga cualquier excepción
 * de `verifyIdToken` (firma inválida, token expirado, variable de entorno
 * faltante) sin envolverla: el Route Handler invocante es responsable de
 * traducirla a una respuesta 401.
 */
export async function verificarIdToken(idToken: string): Promise<CustomClaims> {
  const decodedToken = await firebaseAdminAuth.verifyIdToken(idToken);
  return {
    uid: decodedToken.uid,
    role: decodedToken.role as CustomClaims["role"],
    iglesiaId:
      typeof decodedToken.iglesiaId === "string"
        ? decodedToken.iglesiaId
        : undefined,
    distritoId:
      typeof decodedToken.distritoId === "string"
        ? decodedToken.distritoId
        : undefined,
    asociacionId:
      typeof decodedToken.asociacionId === "string"
        ? decodedToken.asociacionId
        : undefined,
  };
}

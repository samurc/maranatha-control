/**
 * Utilidades de sesión de la capa de Presentación (Requerimiento 15.1,
 * tarea 34.1).
 *
 * Firebase Auth (cliente) emite un ID token JWT tras el login; este
 * módulo NO reimplementa la verificación criptográfica completa del
 * token (eso requiere `firebase-admin`, que no debe ejecutarse en el
 * runtime de `proxy.ts` por su costo — ver comentario de
 * `src/proxy.ts`). En su lugar, sigue el patrón de "verificación
 * optimista" documentado por Next.js para Proxy/Middleware: solo
 * decodifica el JWT (sin verificar la firma) para leer el `role` y
 * demás Custom_Claims y decidir si redirigir, dejando la verificación
 * criptográfica real a cada Route Handler/Server Action que
 * efectivamente lea o escriba datos (vía `firebase-admin`, tarea 27.1),
 * tal como recomienda la guía de autenticación de Next.js: "Proxy... no
 * debe ser tu única línea de defensa".
 *
 * Nombre de la cookie de sesión, establecida por el cliente tras un login
 * exitoso de Firebase Auth (`onAuthStateChanged` -> Route Handler que la
 * fija con `httpOnly`, ver tarea de login fuera de alcance de esta spec).
 */
import { cookies } from "next/headers";
import type { CustomClaims } from "../domain/value-objects/custom-claims.vo";

export const COOKIE_SESION = "__session";

/**
 * Decodifica (sin verificar la firma) el payload de un ID token JWT de
 * Firebase Auth para extraer los Custom_Claims. Retorna `null` si el
 * token está ausente, malformado, o no contiene los campos mínimos
 * esperados (`uid` vía `sub`, `role`).
 *
 * Verificación optimista únicamente (ver comentario de módulo): NO
 * confirma que la firma del token sea válida ni que no haya expirado más
 * allá de una comprobación básica de `exp`. Las operaciones de
 * lectura/escritura reales verifican la sesión de forma criptográfica en
 * el servidor (`firebase-admin`).
 */
export function decodificarClaimsOptimista(
  tokenJwt: string | undefined
): CustomClaims | null {
  if (tokenJwt === undefined || tokenJwt.length === 0) {
    return null;
  }

  const partes = tokenJwt.split(".");
  if (partes.length !== 3) {
    return null;
  }

  try {
    const payloadJson = base64UrlDecode(partes[1] as string);
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;

    const uid = typeof payload.sub === "string" ? payload.sub : undefined;
    const role = payload.role;
    const exp = typeof payload.exp === "number" ? payload.exp : undefined;

    if (uid === undefined || typeof role !== "string") {
      return null;
    }
    if (exp !== undefined && exp * 1000 < Date.now()) {
      return null; // token expirado.
    }

    return {
      uid,
      role: role as CustomClaims["role"],
      iglesiaId:
        typeof payload.iglesiaId === "string" ? payload.iglesiaId : undefined,
      distritoId:
        typeof payload.distritoId === "string" ? payload.distritoId : undefined,
      asociacionId:
        typeof payload.asociacionId === "string"
          ? payload.asociacionId
          : undefined,
      unidadId:
        typeof payload.unidadId === "string" ? payload.unidadId : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Decodifica un segmento base64url. Proxy usa por defecto el runtime de
 * Node.js en esta versión de Next.js (ver `node_modules/next/dist/docs`,
 * "proxy.md": "Proxy defaults to using the Node.js runtime"), por lo que
 * `Buffer` está siempre disponible aquí sin necesidad de un polyfill de
 * Web APIs (`atob`).
 */
function base64UrlDecode(segmento: string): string {
  const base64 = segmento.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * `obtenerClaimsDeSesion()` (Data Access Layer, Requerimiento 15.2, 15.3,
 * 15.4, tarea 34.3/34.4).
 *
 * Lee la cookie de sesión de la request actual (`next/headers`) y
 * decodifica los Custom_Claims de forma optimista (ver comentario de
 * módulo más arriba). Consumida por los layouts de sección (tarea 34.3)
 * y por la construcción del menú de navegación (tarea 34.4). Retorna
 * `null` si no hay sesión — en ese caso, `proxy.ts` ya debería haber
 * redirigido a `/login` antes de que el layout se renderice, pero esta
 * función NO asume eso: siempre revalida por su cuenta, ya que Proxy no
 * es la única línea de defensa (ver comentario de módulo).
 */
export async function obtenerClaimsDeSesion(): Promise<CustomClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESION)?.value;
  return decodificarClaimsOptimista(token);
}

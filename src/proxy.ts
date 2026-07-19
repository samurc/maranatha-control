/**
 * `proxy.ts` (Requerimiento 15.1, tarea 34.1).
 *
 * Reemplaza al histórico `middleware.ts`: en la versión de Next.js
 * instalada en este proyecto (16.2.10), el archivo de convención
 * `middleware.ts` está deprecado a favor de `proxy.ts` con la función
 * exportada `proxy` (ver `node_modules/next/dist/docs/.../proxy.md`:
 * "The `middleware` file convention is deprecated and has been renamed to
 * `proxy`"). La funcionalidad es idéntica a la que describía la tarea
 * 34.1 original.
 *
 * Verifica de forma OPTIMISTA (Requirement 15.1: solo decodifica la
 * cookie de sesión, sin round-trip a Firebase Admin) que exista una
 * sesión de Firebase Auth válida en cada request a una ruta del segmento
 * `(protected)`; si no la hay, redirige a `/login`. La verificación
 * criptográfica completa del token ocurre en cada Route Handler/Server
 * Action que efectivamente lee o escribe datos (vía `firebase-admin`,
 * `FirebaseAdminAuthAdapter`, tarea 27.1) — Proxy nunca es la única línea
 * de defensa (ver comentario de `session.ts`).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESION, decodificarClaimsOptimista } from "./presentation/session";

const RUTA_LOGIN = "/login";

/** Prefijos de ruta que pertenecen al segmento `(protected)` (Requirement 15.1). */
const PREFIJOS_PROTEGIDOS = [
  "/dashboard",
  "/iglesias",
  "/asociaciones",
  "/distritos",
  "/unidades",
  "/participantes",
  "/registros",
  "/auditoria",
  "/usuarios",
  "/mi-progreso",
  "/panel-alumno",
];

function esRutaProtegida(pathname: string): boolean {
  return PREFIJOS_PROTEGIDOS.some(
    (prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`)
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (!esRutaProtegida(pathname)) {
    return NextResponse.next();
  }

  const tokenSesion = request.cookies.get(COOKIE_SESION)?.value;
  const claims = decodificarClaimsOptimista(tokenSesion);

  if (claims === null) {
    const destino = new URL(RUTA_LOGIN, request.url);
    destino.searchParams.set("from", pathname);
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};

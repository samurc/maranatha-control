/**
 * Route Handler `POST /api/auth/login` (Requerimiento 22.1, 22.7, tarea
 * 41.1).
 *
 * Valida el body con `LoginRequestSchema` (Requirement 17.1), verifica el
 * `idToken` recibido mediante `verificarIdToken` (`firebase-admin.ts`,
 * tarea 39.2) y, si es válido, fija la `Cookie_Sesion` (`__session`) como
 * `httpOnly`/`secure`/`sameSite=lax` (Requirement 22.1). Si la
 * verificación del token falla, responde 401 (credenciales/token
 * inválido). Si la fijación de la cookie falla (p. ej. excepción al
 * escribir el header `Set-Cookie`), responde 500 SIN dejar ninguna cookie
 * fijada (Requirement 22.7).
 *
 * La decisión de a dónde redirigir tras un login exitoso (`from` vs. `/`)
 * NO se procesa aquí: ocurre enteramente en el cliente
 * (`app/login/page.tsx`), que ya recibió `from` como `searchParams` de su
 * propia navegación — este Route Handler solo verifica el token y fija la
 * cookie (ver design.md, "Flujo de login").
 */
import { cookies } from "next/headers";
import { LoginRequestSchema } from "../../../../application/dto/auth.schema";
import { verificarIdToken } from "../../../../infrastructure/firebase-admin";
import { COOKIE_SESION } from "../../../../presentation/session";

const SESION_MAX_AGE_SEGUNDOS = 60 * 60; // 1 hora: se alinea con la vigencia de un ID token de Firebase Auth.

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const dto = LoginRequestSchema.safeParse(body);
  if (!dto.success) {
    return new Response(JSON.stringify({ error: "Cuerpo de solicitud inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  let claims;
  try {
    claims = await verificarIdToken(dto.data.idToken);
  } catch (err) {
    console.error("[login] verificarIdToken falló:", err);
    return new Response(JSON.stringify({ error: "El token de sesión no es válido.", detail: String(err) }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  let cookieValue = `${COOKIE_SESION}=${dto.data.idToken}; Path=/; Max-Age=${SESION_MAX_AGE_SEGUNDOS}; SameSite=Lax; HttpOnly`;
  if (process.env.NODE_ENV === "production") {
    cookieValue += "; Secure";
  }

  return new Response(JSON.stringify({ ok: true, uid: claims.uid }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Set-Cookie": cookieValue },
  });
}

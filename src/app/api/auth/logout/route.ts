/**
 * Route Handler `POST /api/auth/logout` (Requerimiento 22.3, tarea 41.2).
 *
 * Elimina la `Cookie_Sesion` (`__session`) del lado del servidor. El
 * botón de logout de la UI invoca este endpoint y luego, del lado del
 * cliente, `signOut(firebaseAuthClient)` para limpiar también el estado
 * del SDK cliente (ver design.md, "Logout").
 */
import { cookies } from "next/headers";
import { COOKIE_SESION } from "../../../../presentation/session";

export async function POST(): Promise<Response> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_SESION);
  return Response.json({ ok: true });
}

/**
 * `app/page.tsx` (Requerimiento 23.4-23.7, tarea 43.7).
 *
 * Ruta raíz "/": resuelve los Custom_Claims de la sesión actual y
 * redirige al destino que determina `resolverDestinoRaiz` (función pura,
 * `presentation/root-redirect.ts`). Reemplaza el scaffold de
 * `create-next-app`.
 */
import { redirect } from "next/navigation";
import { obtenerClaimsDeSesion } from "../presentation/session";
import { resolverDestinoRaiz } from "../presentation/root-redirect";

export default async function RootPage(): Promise<never> {
  const claims = await obtenerClaimsDeSesion();
  redirect(resolverDestinoRaiz(claims));
}

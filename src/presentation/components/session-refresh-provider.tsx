"use client";

import { useEffect, type ReactNode } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { firebaseAuthClient } from "../../infrastructure/firebase-client";

/**
 * Reemite la Cookie_Sesion (`__session`) reenviando el ID token vigente a
 * `POST /api/auth/login`, que la fija de nuevo con un `Max-Age` fresco. La
 * cookie es `HttpOnly`, así que el refresco DEBE pasar por el servidor.
 */
async function reemitirCookie(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    // Evita que una respuesta cacheada impida el Set-Cookie.
    cache: "no-store",
  });
}

/**
 * Intervalo del refresco proactivo. Debe quedar por debajo de la vigencia de
 * la cookie/ID token (1 hora) para renovarla antes de que expire. 30 min deja
 * margen suficiente.
 */
const INTERVALO_REFRESCO_MS = 30 * 60 * 1000;

/**
 * `SessionRefreshProvider` — mantiene viva la Cookie_Sesion mientras el usuario
 * esté activo.
 *
 * Estrategia:
 * 1. `onIdTokenChanged`: Firebase Auth (cliente) refresca el ID token en memoria
 *    automáticamente (al expirar, al cambiar claims, etc.). Cada vez que emite un
 *    token nuevo para un usuario autenticado, reemitimos la cookie con ese token.
 * 2. Refresco proactivo periódico: cada 30 min, si la pestaña está visible y hay
 *    usuario, forzamos `getIdToken(true)` para renovar el token y, vía el listener
 *    (o directamente), la cookie. Condicionarlo a la visibilidad respeta el
 *    criterio "mientras el usuario esté activo" y evita mantener sesiones vivas en
 *    pestañas olvidadas en segundo plano indefinidamente.
 *
 * Tras un `signOut` el listener emite `user === null`: en ese caso no hacemos nada
 * (no re-creamos la cookie); el logout ya la borró en el servidor.
 */
export function SessionRefreshProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  useEffect(() => {
    // `firebaseAuthClient` puede ser un proxy que lanza si faltan las variables
    // NEXT_PUBLIC_FIREBASE_*; toleramos ese caso sin romper el render.
    let cancelarListener: (() => void) | undefined;
    let intervalo: ReturnType<typeof setInterval> | undefined;

    try {
      cancelarListener = onIdTokenChanged(firebaseAuthClient, (user) => {
        if (user === null) return;
        // No propagamos errores de red: un fallo puntual se reintenta en el
        // próximo tick del intervalo o en el siguiente cambio de token.
        void reemitirCookie(user).catch(() => {});
      });

      intervalo = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        const user = firebaseAuthClient.currentUser;
        if (user === null) return;
        // `getIdToken(true)` fuerza la renovación; dispara `onIdTokenChanged`,
        // que reemite la cookie. También la reemitimos aquí por robustez.
        void user
          .getIdToken(true)
          .then(() => reemitirCookie(user))
          .catch(() => {});
      }, INTERVALO_REFRESCO_MS);
    } catch {
      // Entorno sin Firebase configurado: no montamos el refresco.
    }

    return () => {
      cancelarListener?.();
      if (intervalo !== undefined) clearInterval(intervalo);
    };
  }, []);

  return <>{children}</>;
}

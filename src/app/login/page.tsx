/**
 * `app/login/page.tsx` (Requerimiento 22.1, 22.2, 22.4, 22.5, 22.7, tarea
 * 41.3).
 *
 * Componente de cliente con formulario de correo/contraseña. Usa el SDK
 * cliente de Firebase Auth directamente (`signInWithEmailAndPassword`,
 * `firebase-client.ts`) porque Firebase Auth gestiona el estado de sesión
 * del cliente exclusivamente a través del SDK cliente (design.md, "Flujo
 * de login") — no un Server Action. Tras obtener el `idToken`, lo envía a
 * `POST /api/auth/login` para que el servidor lo verifique y fije la
 * `Cookie_Sesion`.
 *
 * `from` se lee de `searchParams` (el mismo parámetro que `proxy.ts` fija
 * al redirigir desde una ruta protegida sin sesión); tras un login
 * exitoso, redirige a `from` si está presente, o a `/` en caso contrario
 * (Requirement 22.4, 22.5). `useSearchParams` es un hook de Client
 * Component que exige un límite `<Suspense>` en producción (ver
 * `node_modules/next/dist/docs/.../use-search-params.md`): el formulario
 * en sí se extrae a un componente interno envuelto en `<Suspense>`.
 */
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseAuthClient } from "../../infrastructure/firebase-client";

function mensajeDeErrorLegible(error: unknown): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      return "Correo o contraseña incorrectos.";
    }
    return `Error de autenticación (${code}).`;
  }
  if (error instanceof Error) {
    return `No se pudo iniciar sesión: ${error.message}`;
  }
  return "No se pudo iniciar sesión. Intente nuevamente.";
}

function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarSubmit(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      // Requirement 22.1: autenticación contra Firebase Auth (SDK cliente).
      const credencial = await signInWithEmailAndPassword(
        firebaseAuthClient,
        email,
        password
      );
      // Forzar refresh del token para incluir custom claims actualizados.
      const idToken = await credencial.user.getIdToken(true);

      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!respuesta.ok) {
        // Requirement 22.7: revertir la sesión de cliente si el servidor
        // no pudo fijar la Cookie_Sesion.
        await signOut(firebaseAuthClient);
        setError("No se pudo completar el inicio de sesión.");
        return;
      }

      // Requirement 22.4 (from) / 22.5 (raíz).
      router.push(from ?? "/");
    } catch (err) {
      // Requirement 22.2: credenciales rechazadas por Firebase Auth, sin
      // fijar ninguna Cookie_Sesion.
      setError(mensajeDeErrorLegible(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main
      aria-label="Iniciar sesión"
      className="flex min-h-screen items-center justify-center px-4"
    >
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Maranatha Control
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Inicia sesión para continuar
          </p>
        </div>

        <form
          onSubmit={(evento) => void manejarSubmit(evento)}
          className="space-y-5"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground/80"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="usuario@ejemplo.com"
              className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground/80"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
            />
          </div>

          {error !== null ? (
            <p
              role="alert"
              aria-live="assertive"
              className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {enviando ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={<main aria-label="Iniciar sesión" />}>
      <LoginForm />
    </Suspense>
  );
}

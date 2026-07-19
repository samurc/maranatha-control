/**
 * `(protected)/layout.tsx` (Requerimiento 23.3, tarea 43.1).
 *
 * Route Group `(protected)` (Next.js: una carpeta entre paréntesis no se
 * incluye en la URL): único punto donde se invoca
 * `obtenerClaimsDeSesion()` + `construirMenuNavegacion(claims)` para
 * construir la navegación de TODAS las rutas protegidas una sola vez
 * (design.md, "Árbol de rutas del App Router"). La responsabilidad de
 * "ocultar del menú" (aquí) y "denegar el contenido" (cada `page.tsx`
 * individual vía `SectionGuard`, Requirement 23.2) permanecen
 * deliberadamente separadas, igual que en el Requerimiento 15.
 *
 * Si no hay sesión, redirige a `/login` — el mismo criterio que
 * `SectionGuard` (esta capa tampoco asume que `proxy.ts` ya verificó la
 * sesión: Proxy nunca es la única línea de defensa, ver `session.ts`).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerClaimsDeSesion } from "../../presentation/session";
import { construirMenuNavegacion } from "../../presentation/nav-sections";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  if (claims === null) {
    redirect("/login");
  }

  const menu = construirMenuNavegacion(claims);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-foreground/10 bg-foreground/[0.02] p-4">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground">Maranatha</h2>
          <p className="text-xs text-foreground/50">Control de Escuela Sabática</p>
        </div>
        <nav aria-label="Navegación principal">
          <ul className="space-y-1">
            {menu.map((item) => (
              <li key={item.resource}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  {item.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto pt-6 border-t border-foreground/10 mt-8">
          <p className="text-xs text-foreground/40 truncate">{claims.role.replace("_", " ")}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}

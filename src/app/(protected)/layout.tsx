/**
 * `(protected)/layout.tsx` (Requerimiento 23.3, tarea 43.1).
 */
import { redirect } from "next/navigation";
import { obtenerClaimsDeSesion } from "../../presentation/session";
import { construirMenuNavegacion } from "../../presentation/nav-sections";
import { SidebarNav } from "../../presentation/components/sidebar-nav";

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
      <aside className="w-64 shrink-0 border-r border-foreground/10 bg-foreground/[0.02] p-4 flex flex-col">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground">Maranatha</h2>
          <p className="text-xs text-foreground/50">Control de Escuela Sabática</p>
        </div>
        <SidebarNav menu={menu} />
        <div className="mt-auto pt-6 border-t border-foreground/10">
          <p className="text-xs text-foreground/40 truncate capitalize">{claims.role.replace(/_/g, " ")}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}

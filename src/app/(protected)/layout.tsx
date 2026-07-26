/**
 * `(protected)/layout.tsx` (Requerimiento 23.3, tarea 43.1).
 */
import { redirect } from "next/navigation";
import { obtenerClaimsDeSesion } from "../../presentation/session";
import { construirMenuNavegacion } from "../../presentation/nav-sections";
import { SidebarNav } from "../../presentation/components/sidebar-nav";
import { LogoutButton } from "../../presentation/components/logout-button";
import { MobileNav } from "../../presentation/components/mobile-nav";

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
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileNav menu={menu} role={claims.role} />

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-foreground/10 bg-foreground/[0.02] p-4 flex-col">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground">Maranatha</h2>
          <p className="text-xs text-foreground/50">Control de Escuela Sabática</p>
        </div>
        <SidebarNav menu={menu} />
        <div className="mt-auto pt-6 border-t border-foreground/10">
          <p className="text-xs text-foreground/40 truncate capitalize mb-2">{claims.role.replace(/_/g, " ")}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}

import { SectionGuard } from "../../../presentation/components/section-guard";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";

export default async function RegistrosPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  let contenido: React.JSX.Element;
  if (claims === null) {
    contenido = <></>;
  } else {
    const db = obtenerFirestoreAdmin();
    const snap = await db.collection("registros_sabaticos").orderBy("creadoEn", "desc").limit(20).get();
    const registros = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    contenido = (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registros Sabáticos</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Registros de asistencia y estudio por sábado
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Total registros</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{registros.length}</p>
          </div>
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Borradores</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">
              {registros.filter((r: Record<string, unknown>) => r.estado === "borrador").length}
            </p>
          </div>
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Cerrados</p>
            <p className="mt-1 text-2xl font-bold text-green-500">
              {registros.filter((r: Record<string, unknown>) => r.estado === "cerrado").length}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Sábado</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Unidad</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Estado</th>
                <th className="px-4 py-3 text-right font-medium text-foreground/70">Presentes</th>
                <th className="px-4 py-3 text-right font-medium text-foreground/70">Ausentes</th>
                <th className="px-4 py-3 text-right font-medium text-foreground/70">Visitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {registros.map((r: Record<string, unknown>) => {
                const totales = r.totalesRapidos as { presentes: number; ausentes: number; visitas: number } | undefined;
                const sabado = r.sabadoEclesiastico as { fechaISO?: string; numeroSabado?: number; numeroTrimestre?: number } | undefined;
                return (
                  <tr key={r.id as string} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium">
                      {sabado?.fechaISO ?? "—"}
                      <span className="ml-2 text-xs text-foreground/50">
                        T{sabado?.numeroTrimestre} S{sabado?.numeroSabado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/70 font-mono text-xs">{r.unidadId as string}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.estado === "borrador" ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-500"
                      }`}>
                        {r.estado as string}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-500 font-medium">{totales?.presentes ?? 0}</td>
                    <td className="px-4 py-3 text-right text-red-400 font-medium">{totales?.ausentes ?? 0}</td>
                    <td className="px-4 py-3 text-right text-blue-400 font-medium">{totales?.visitas ?? 0}</td>
                  </tr>
                );
              })}
              {registros.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-foreground/50">Sin registros sabáticos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <SectionGuard resource="registro_sabatico">{contenido}</SectionGuard>;
}

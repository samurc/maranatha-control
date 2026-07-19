import { SectionGuard } from "../../../presentation/components/section-guard";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";

export default async function AuditoriaPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  let contenido: React.JSX.Element;
  if (claims === null) {
    contenido = <></>;
  } else {
    const db = obtenerFirestoreAdmin();
    const snap = await db.collection("auditoria").orderBy("timestamp", "desc").limit(50).get();
    const eventos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    contenido = (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoría</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Historial inmutable de acciones del sistema
          </p>
        </div>

        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Total eventos registrados</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{eventos.length}</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Acción</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Recurso afectado</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Actor (UID)</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Iglesia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {eventos.map((e: Record<string, unknown>) => {
                const ts = e.timestamp as { toDate?: () => Date } | undefined;
                const fecha = ts?.toDate?.() ?? null;
                return (
                  <tr key={e.id as string} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3 text-foreground/60 text-xs whitespace-nowrap">
                      {fecha ? fecha.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "medium" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-foreground/5 px-2 py-0.5 text-xs font-medium text-foreground/80">
                        {e.accion as string}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/70 font-mono text-xs">{e.recursoAfectado as string}</td>
                    <td className="px-4 py-3 text-foreground/50 font-mono text-xs">{(e.uid as string)?.slice(0, 16)}...</td>
                    <td className="px-4 py-3 text-foreground/50 font-mono text-xs">{(e.iglesiaId as string) ?? "—"}</td>
                  </tr>
                );
              })}
              {eventos.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-foreground/50">Sin eventos de auditoría</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <SectionGuard resource="auditoria">{contenido}</SectionGuard>;
}

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

    // Determinar filtro según rol
    const esRolOperativo = claims.role === "secretario" || claims.role === "maestro";
    const registrosQuery = esRolOperativo && claims.unidadId
      ? db.collection("registros_sabaticos").where("unidadId", "==", claims.unidadId)
      : esRolOperativo && claims.iglesiaId
        ? db.collection("registros_sabaticos").where("iglesiaId", "==", claims.iglesiaId)
        : db.collection("registros_sabaticos").orderBy("creadoEn", "desc").limit(20);

    const snap = await registrosQuery.get();
    const registros = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const sabA = (a as Record<string, unknown>).sabadoEclesiastico as { anio?: number; numeroTrimestre?: number; numeroSabado?: number } | undefined;
        const sabB = (b as Record<string, unknown>).sabadoEclesiastico as { anio?: number; numeroTrimestre?: number; numeroSabado?: number } | undefined;
        const keyA = ((sabA?.anio ?? 0) * 10000) + ((sabA?.numeroTrimestre ?? 0) * 100) + (sabA?.numeroSabado ?? 0);
        const keyB = ((sabB?.anio ?? 0) * 10000) + ((sabB?.numeroTrimestre ?? 0) * 100) + (sabB?.numeroSabado ?? 0);
        return keyB - keyA;
      });

    // Cargar indicadores semanales
    let indicadores: Record<string, string> = {};
    if (esRolOperativo && claims.iglesiaId && claims.unidadId) {
      const ahora = new Date();
      const trimestre = Math.ceil((ahora.getMonth() + 1) / 3);
      const anio = ahora.getFullYear();
      const indicadorDocId = `${claims.iglesiaId}_${claims.unidadId}_${anio}_T${trimestre}_indicadores`;
      const indicadorDoc = await db.collection("indicadores_semanales").doc(indicadorDocId).get();
      if (indicadorDoc.exists) {
        const data = indicadorDoc.data()!;
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === "string" && !["iglesiaId", "unidadId", "actualizadoEn"].includes(k)) {
            indicadores[k] = v;
          }
        }
      }
    }

    // Obtener nombre de unidad
    let nombreUnidad = "";
    if (claims.unidadId) {
      const unidadDoc = await db.collection("unidades_accion").doc(claims.unidadId).get();
      nombreUnidad = unidadDoc.exists ? (unidadDoc.data()?.nombre as string) : "";
    }

    const INDICADORES_LABELS = [
      { prefijo: "eb", label: "N° dando estudios bíblicos" },
      { prefijo: "re", label: "N° personas que recibieron estudios" },
      { prefijo: "of", label: "Ofrenda" },
      { prefijo: "vi", label: "N° visitas" },
    ];

    contenido = (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registros Sabáticos</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {nombreUnidad ? `Registros de ${nombreUnidad}` : "Registros de asistencia y estudio por sábado"}
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

        {/* Tabla de registros (Desktop) */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Sábado</th>
                <th className="px-4 py-3 text-right font-medium text-foreground/70">Presentes</th>
                <th className="px-4 py-3 text-right font-medium text-foreground/70">Ausentes</th>
                {esRolOperativo && Object.keys(indicadores).length > 0 && INDICADORES_LABELS.map(({ prefijo, label }) => (
                  <th key={prefijo} className="px-3 py-3 text-right font-medium text-foreground/70 text-xs whitespace-nowrap">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {registros.map((r: Record<string, unknown>) => {
                const totales = r.totalesRapidos as { presentes: number; ausentes: number; visitas: number } | undefined;
                const sabado = r.sabadoEclesiastico as { fechaISO?: string; numeroSabado?: number; numeroTrimestre?: number } | undefined;
                const numSabado = sabado?.numeroSabado;
                return (
                  <tr key={r.id as string} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium">
                      {sabado?.fechaISO ?? "—"}
                      <span className="ml-2 text-xs text-foreground/50">
                        T{sabado?.numeroTrimestre} S{numSabado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-500 font-medium">{totales?.presentes ?? 0}</td>
                    <td className="px-4 py-3 text-right text-red-400 font-medium">{totales?.ausentes ?? 0}</td>
                    {esRolOperativo && Object.keys(indicadores).length > 0 && INDICADORES_LABELS.map(({ prefijo }) => {
                      const val = numSabado != null ? (indicadores[`${prefijo}-${numSabado}`] ?? "—") : "—";
                      return (
                        <td key={prefijo} className="px-3 py-3 text-right text-foreground/60 text-xs">{val}</td>
                      );
                    })}
                  </tr>
                );
              })}
              {registros.length === 0 && (
                <tr>
                  <td
                    colSpan={3 + (esRolOperativo && Object.keys(indicadores).length > 0 ? INDICADORES_LABELS.length : 0)}
                    className="px-4 py-8 text-center text-foreground/50"
                  >
                    Sin registros sabáticos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Tarjetas de registros (Mobile) */}
        <div className="md:hidden space-y-4">
          {registros.map((r: Record<string, unknown>) => {
            const totales = r.totalesRapidos as { presentes: number; ausentes: number; visitas: number } | undefined;
            const sabado = r.sabadoEclesiastico as { fechaISO?: string; numeroSabado?: number; numeroTrimestre?: number } | undefined;
            const numSabado = sabado?.numeroSabado;
            
            return (
              <div key={r.id as string} className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-foreground/5 pb-2">
                  <div className="font-medium text-foreground text-sm">
                    {sabado?.fechaISO ?? "—"}
                  </div>
                  <div className="text-xs font-medium text-foreground/50 bg-foreground/5 px-2 py-0.5 rounded-full">
                    T{sabado?.numeroTrimestre} S{numSabado}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-500/5 rounded p-2 text-center">
                    <p className="text-[10px] uppercase text-green-500/70 font-semibold mb-0.5">Presentes</p>
                    <p className="text-lg font-bold text-green-500">{totales?.presentes ?? 0}</p>
                  </div>
                  <div className="bg-red-500/5 rounded p-2 text-center">
                    <p className="text-[10px] uppercase text-red-500/70 font-semibold mb-0.5">Ausentes</p>
                    <p className="text-lg font-bold text-red-400">{totales?.ausentes ?? 0}</p>
                  </div>
                </div>

                {esRolOperativo && Object.keys(indicadores).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-foreground/5">
                    <p className="text-[10px] font-semibold text-foreground/40 uppercase mb-2">Indicadores</p>
                    <div className="grid grid-cols-2 gap-2">
                      {INDICADORES_LABELS.map(({ prefijo, label }) => {
                        const val = numSabado != null ? (indicadores[`${prefijo}-${numSabado}`] ?? "—") : "—";
                        return (
                          <div key={prefijo} className="flex justify-between text-xs">
                            <span className="text-foreground/60 truncate mr-2" title={label}>{label.substring(0, 15)}...</span>
                            <span className="font-medium text-foreground">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {registros.length === 0 && (
            <div className="p-8 text-center text-sm text-foreground/50 border border-foreground/10 rounded-lg">
              Sin registros sabáticos
            </div>
          )}
        </div>
      </div>
    );
  }

  return <SectionGuard resource="registro_sabatico">{contenido}</SectionGuard>;
}

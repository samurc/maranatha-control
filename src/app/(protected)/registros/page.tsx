import { SectionGuard } from "../../../presentation/components/section-guard";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { AusentesCell, type AusenteVista, type ParticipanteOpcion } from "./registros-client";
import { PresentesCell, type PresenteVista } from "./presentes-client";
import { asignarResponsableAusente, justificarAusente, marcarContactoAusente, guardarVisitasTraidas } from "./actions";
import { Top10Button, type TopItem } from "../../../presentation/components/top10-presencia-button";
import { IndicadorChartHeader, type PuntoSerie } from "./indicador-chart-header";

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

    // Cargar participantes del ámbito para: (a) resolver nombres de ausentes,
    // (b) ofrecer la lista de participantes activos como posibles responsables.
    const participantesQuery = esRolOperativo && claims.unidadId
      ? db.collection("participantes").where("unidadId", "==", claims.unidadId).limit(500)
      : esRolOperativo && claims.iglesiaId
        ? db.collection("participantes").where("iglesiaId", "==", claims.iglesiaId).limit(500)
        : db.collection("participantes").limit(500);
    const participantesSnap = await participantesQuery.get();

    const nombrePorId = new Map<string, string>();
    const fotoPorId = new Map<string, string>();
    const generoPorId = new Map<string, string>();
    const celularPorId = new Map<string, string>();
    const participantesActivos: ParticipanteOpcion[] = [];
    for (const doc of participantesSnap.docs) {
      const p = doc.data() as { nombre?: string; apellido?: string; estado?: string; fotoUrl?: string; genero?: string; celular?: string };
      const nombreCompleto = `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || doc.id;
      nombrePorId.set(doc.id, nombreCompleto);
      if (typeof p.fotoUrl === "string" && p.fotoUrl.length > 0) {
        fotoPorId.set(doc.id, p.fotoUrl);
      }
      if (typeof p.celular === "string" && p.celular.length > 0) {
        celularPorId.set(doc.id, p.celular);
      }
      const genero = p.genero === "hombre" || p.genero === "mujer" ? p.genero : null;
      if (genero) generoPorId.set(doc.id, genero);
      if (p.estado === "activo") {
        participantesActivos.push({ id: doc.id, nombre: nombreCompleto, genero });
      }
    }
    participantesActivos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    // Derivar la lista de ausentes por registro a partir del mapa `asistencia`
    // (presente === false), resolviendo el nombre desde `nombrePorId`.
    const ausentesPorRegistro = new Map<string, AusenteVista[]>();
    const presentesPorRegistro = new Map<string, PresenteVista[]>();
    for (const r of registros) {
      const asistencia = ((r as Record<string, unknown>).asistencia ?? {}) as Record<
        string,
        { presente?: boolean; responsableId?: string | null; justificado?: boolean; contactado?: boolean; visitasTraidas?: number }
      >;
      const lista: AusenteVista[] = [];
      const presentesLista: PresenteVista[] = [];
      for (const [pid, entrada] of Object.entries(asistencia)) {
        if (entrada?.presente === false) {
          lista.push({
            participanteId: pid,
            nombre: nombrePorId.get(pid) ?? pid,
            fotoUrl: fotoPorId.get(pid) ?? null,
            responsableId: entrada.responsableId ?? null,
            justificado: entrada.justificado ?? false,
            contactado: typeof entrada.contactado === "boolean" ? entrada.contactado : null,
            genero: generoPorId.get(pid) ?? null,
            celular: celularPorId.get(pid) ?? null,
          });
        } else if (entrada?.presente === true) {
          presentesLista.push({
            participanteId: pid,
            nombre: nombrePorId.get(pid) ?? pid,
            fotoUrl: fotoPorId.get(pid) ?? null,
            visitasTraidas: typeof entrada.visitasTraidas === "number" && entrada.visitasTraidas > 0
              ? Math.floor(entrada.visitasTraidas)
              : 0,
          });
        }
      }
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      presentesLista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      ausentesPorRegistro.set(r.id as string, lista);
      presentesPorRegistro.set(r.id as string, presentesLista);
    }

    // Acumular por participante a través de todos los registros:
    // - presencias (asistencia[pid].presente === true)
    // - visitas traídas (suma de asistencia[pid].visitasTraidas)
    const presenciasPorId = new Map<string, number>();
    const visitasPorId = new Map<string, number>();
    // Top contactadores: cuántos ausentes efectivamente contactados
    // (contactado === true) tiene a su cargo cada responsable asignado.
    const contactadosPorResponsableId = new Map<string, number>();
    for (const r of registros) {
      const asistencia = ((r as Record<string, unknown>).asistencia ?? {}) as Record<
        string,
        { presente?: boolean; visitasTraidas?: number; responsableId?: string | null; contactado?: boolean }
      >;
      for (const [pid, entrada] of Object.entries(asistencia)) {
        if (entrada?.presente === true) {
          presenciasPorId.set(pid, (presenciasPorId.get(pid) ?? 0) + 1);
        }
        if (typeof entrada?.visitasTraidas === "number" && entrada.visitasTraidas > 0) {
          visitasPorId.set(pid, (visitasPorId.get(pid) ?? 0) + Math.floor(entrada.visitasTraidas));
        }
        // Solo cuenta si hay responsable Y el ausente fue contactado.
        if (entrada?.responsableId && entrada.contactado === true) {
          const rid = entrada.responsableId;
          contactadosPorResponsableId.set(rid, (contactadosPorResponsableId.get(rid) ?? 0) + 1);
        }
      }
    }

    const construirTop = (mapa: Map<string, number>): TopItem[] =>
      Array.from(mapa.entries())
        .map(([pid, valor]) => ({
          participanteId: pid,
          nombre: nombrePorId.get(pid) ?? pid,
          fotoUrl: fotoPorId.get(pid) ?? null,
          valor,
        }))
        .filter((x) => x.valor > 0)
        .sort((a, b) => b.valor - a.valor || a.nombre.localeCompare(b.nombre, "es"))
        .slice(0, 10);

    const top10Presencia = construirTop(presenciasPorId);
    const top10Visitas = construirTop(visitasPorId);
    const top10Contactadores = construirTop(contactadosPorResponsableId);

    // Cargar indicadores semanales
    const indicadores: Record<string, string> = {};
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

    // Series cronológicas (más antiguo primero) para los gráficos de evolución.
    const registrosCronologicos = [...registros].reverse();
    const parseNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number.parseFloat(v.replace(/[^0-9.,-]/g, "").replace(",", "."));
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };
    const construirPunto = (r: Record<string, unknown>): { label: string; labelLargo: string } => {
      const sab = r.sabadoEclesiastico as { fechaISO?: string; numeroSabado?: number; numeroTrimestre?: number } | undefined;
      return {
        label: `S${sab?.numeroSabado ?? "?"}`,
        labelLargo: `${sab?.fechaISO ?? "—"} (T${sab?.numeroTrimestre} S${sab?.numeroSabado})`,
      };
    };

    const seriePresentes: PuntoSerie[] = registrosCronologicos.map((r) => {
      const t = (r as Record<string, unknown>).totalesRapidos as { presentes?: number } | undefined;
      return { ...construirPunto(r as Record<string, unknown>), valor: t?.presentes ?? 0 };
    });
    const serieAusentes: PuntoSerie[] = registrosCronologicos.map((r) => {
      const t = (r as Record<string, unknown>).totalesRapidos as { ausentes?: number } | undefined;
      return { ...construirPunto(r as Record<string, unknown>), valor: t?.ausentes ?? 0 };
    });
    const seriesIndicadores: Record<string, PuntoSerie[]> = {};
    for (const { prefijo } of INDICADORES_LABELS) {
      seriesIndicadores[prefijo] = registrosCronologicos.map((r) => {
        const sab = (r as Record<string, unknown>).sabadoEclesiastico as { numeroSabado?: number } | undefined;
        const clave = sab?.numeroSabado != null ? `${prefijo}-${sab.numeroSabado}` : "";
        return { ...construirPunto(r as Record<string, unknown>), valor: parseNum(indicadores[clave]) };
      });
    }

    contenido = (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Registros Sabáticos</h1>
            <p className="mt-1 text-sm text-foreground/60">
              {nombreUnidad ? `Registros de ${nombreUnidad}` : "Registros de asistencia y estudio por sábado"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Top10Button
              top={top10Presencia}
              color="amber"
              botonLabel="🏆 Top 10 asistencia"
              titulo="Top 10 asistencia"
              descripcion="Participantes con más presencias registradas."
              vacioLabel="Aún no hay presencias registradas."
            />
            <Top10Button
              top={top10Visitas}
              color="sky"
              botonLabel="👥 Top 10 visitas"
              titulo="Top 10 visitas"
              descripcion="Participantes que más visitas trajeron a la clase."
              vacioLabel="Aún no hay visitas registradas."
            />
            <Top10Button
              top={top10Contactadores}
              color="sky"
              botonLabel="📞 Top 10 contactadores"
              titulo="Top 10 contactadores"
              descripcion="Responsables que efectivamente contactaron a sus ausentes asignados."
              vacioLabel="Aún no hay ausentes contactados."
            />
          </div>
        </div>

        {/* Disclaimer de interacción */}
        <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-xs text-foreground/70">
          <span className="shrink-0 text-blue-400" aria-hidden>ℹ️</span>
          <p>
            Presiona la cifra de{" "}
            <span className="font-semibold text-green-500">Presentes</span> para registrar la cantidad
            de visitas que trajo cada participante, o la de{" "}
            <span className="font-semibold text-red-400">Ausentes</span> para dar seguimiento a los
            ausentes (asignar responsable, justificar y marcar el contacto).
          </p>
        </div>

        {/* Tabla de registros (Desktop) */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Sábado</th>
                <th className="px-4 py-3 text-right font-medium">
                  <IndicadorChartHeader titulo="Presentes" serie={seriePresentes} colorHex="#22c55e" labelClassName="text-green-500" />
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  <IndicadorChartHeader titulo="Ausentes" serie={serieAusentes} colorHex="#f87171" labelClassName="text-red-400" />
                </th>
                {esRolOperativo && Object.keys(indicadores).length > 0 && INDICADORES_LABELS.map(({ prefijo, label }) => (
                  <th key={prefijo} className="px-3 py-3 text-right font-medium text-xs whitespace-nowrap">
                    <IndicadorChartHeader
                      titulo={label}
                      serie={seriesIndicadores[prefijo] ?? []}
                      colorHex="#0ea5e9"
                      formato={prefijo === "of" ? "decimal" : "numero"}
                      labelClassName="text-foreground/70"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {registros.map((r: Record<string, unknown>) => {
                const totales = r.totalesRapidos as { presentes: number; ausentes: number; visitas: number } | undefined;
                const sabado = r.sabadoEclesiastico as { fechaISO?: string; numeroSabado?: number; numeroTrimestre?: number } | undefined;
                const numSabado = sabado?.numeroSabado;
                const ausentesLista = ausentesPorRegistro.get(r.id as string) ?? [];
                const presentesLista = presentesPorRegistro.get(r.id as string) ?? [];
                const fechaLabel = `${sabado?.fechaISO ?? "—"} (T${sabado?.numeroTrimestre} S${numSabado})`;
                return (
                  <tr key={r.id as string} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium">
                      {sabado?.fechaISO ?? "—"}
                      <span className="ml-2 text-xs text-foreground/50">
                        T{sabado?.numeroTrimestre} S{numSabado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PresentesCell
                        variant="table"
                        registroId={r.id as string}
                        fechaLabel={fechaLabel}
                        totalPresentes={totales?.presentes ?? presentesLista.length}
                        presentes={presentesLista}
                        guardarVisitas={guardarVisitasTraidas}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AusentesCell
                        variant="table"
                        registroId={r.id as string}
                        fechaLabel={fechaLabel}
                        totalAusentes={totales?.ausentes ?? ausentesLista.length}
                        ausentes={ausentesLista}
                        participantesActivos={participantesActivos}
                        asignarResponsable={asignarResponsableAusente}
                        justificarAusente={justificarAusente}
                        marcarContacto={marcarContactoAusente}
                      />
                    </td>
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
            const ausentesLista = ausentesPorRegistro.get(r.id as string) ?? [];
            const presentesLista = presentesPorRegistro.get(r.id as string) ?? [];
            const fechaLabel = `${sabado?.fechaISO ?? "—"} (T${sabado?.numeroTrimestre} S${numSabado})`;

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
                  <PresentesCell
                    variant="card"
                    registroId={r.id as string}
                    fechaLabel={fechaLabel}
                    totalPresentes={totales?.presentes ?? presentesLista.length}
                    presentes={presentesLista}
                    guardarVisitas={guardarVisitasTraidas}
                  />
                  <AusentesCell
                    variant="card"
                    registroId={r.id as string}
                    fechaLabel={fechaLabel}
                    totalAusentes={totales?.ausentes ?? ausentesLista.length}
                    ausentes={ausentesLista}
                    participantesActivos={participantesActivos}
                    asignarResponsable={asignarResponsableAusente}
                    justificarAusente={justificarAusente}
                    marcarContacto={marcarContactoAusente}
                  />
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

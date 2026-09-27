"use client";

import { useState, useTransition } from "react";
import { exportarOracionImagen } from "./exportar-oracion-imagen";

export interface PresenteOracion {
  readonly id: string;
  readonly nombre: string;
  /** "hombre" | "mujer" | null (sin definir). */
  readonly genero: string | null;
}

export interface SabadoOpcion {
  readonly registroId: string;
  readonly label: string;
}

interface OracionClientProps {
  readonly sabados: readonly SabadoOpcion[];
  /** Presentes por registroId. */
  readonly presentesPorRegistro: Record<string, PresenteOracion[]>;
  /** Participantes con estado "activo" del ámbito (fuente alternativa). */
  readonly activos: readonly PresenteOracion[];
  /** Grupos guardados por registroId (ids por género o mixtos). */
  readonly gruposPorRegistro: Record<string, { hombres: string[][]; mujeres: string[][]; mixtos: string[][]; mixto: boolean }>;
  readonly guardarGrupos: (formData: FormData) => Promise<void>;
}

/** Un grupo es una lista de ids de participantes (normalmente 2, pero puede crecer). */
type Grupo = string[];

const MIME_ORIGEN = "application/x-oracion-mov";

function barajar<T>(lista: readonly T[]): T[] {
  const arr = [...lista];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Arma grupos del tamaño indicado a partir de una lista de ids barajada. */
function armarGrupos(ids: readonly string[], tamano: number): Grupo[] {
  const paso = Math.max(2, tamano);
  const barajado = barajar(ids);
  const grupos: Grupo[] = [];
  for (let i = 0; i < barajado.length; i += paso) {
    grupos.push(barajado.slice(i, i + paso));
  }
  return grupos;
}

const TAMANOS = [2, 3, 4, 5] as const;

/**
 * Vista de Oración Intercesora: agrupa a los presentes de un sábado en parejas
 * del mismo género. El emparejamiento es aleatorio, se puede rebarajar y, por
 * arrastre, se puede mover un participante a otro grupo ya formado.
 */
export function OracionClient({
  sabados,
  presentesPorRegistro,
  activos,
  gruposPorRegistro,
  guardarGrupos,
}: OracionClientProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [exportando, setExportando] = useState(false);
  // Si está activo, la fuente son los presentes del sábado; si no, los activos.
  const [soloPresentes, setSoloPresentes] = useState<boolean>(true);

  // Sábado seleccionado en estado local (por defecto, el primero disponible).
  const [registroSeleccionado, setRegistroSeleccionado] = useState<string | null>(
    sabados[0]?.registroId ?? null
  );

  // Personas a agrupar: presentes del sábado o participantes activos del ámbito.
  const presentes = soloPresentes
    ? (registroSeleccionado ? (presentesPorRegistro[registroSeleccionado] ?? []) : [])
    : activos;
  const gruposGuardados = registroSeleccionado ? (gruposPorRegistro[registroSeleccionado] ?? null) : null;

  const porId = new Map(presentes.map((p) => [p.id, p]));

  // Grupos por género en estado local (editable por arrastre).
  const [gruposHombres, setGruposHombres] = useState<Grupo[]>([]);
  const [gruposMujeres, setGruposMujeres] = useState<Grupo[]>([]);
  // Grupos mixtos (cuando se mezclan géneros).
  const [gruposMixtos, setGruposMixtos] = useState<Grupo[]>([]);
  const [grupoActivo, setGrupoActivo] = useState<string | null>(null);
  // Tamaño de grupo elegido antes de generar.
  const [tamanoGrupo, setTamanoGrupo] = useState<number>(2);
  // Mezclar géneros (solo aplica para tamaños 3, 4, 5).
  const [mezclarGeneros, setMezclarGeneros] = useState<boolean>(false);
  // Modo actualmente generado (true si los grupos mostrados son mixtos).
  const [modoMixto, setModoMixto] = useState<boolean>(false);
  // `generado` controla si ya se muestran los grupos. Al elegir/cambiar sábado
  // se vuelve a false para pedir primero el tamaño (salvo que haya guardados).
  const [generado, setGenerado] = useState<boolean>(false);

  /** Reconcilia grupos guardados con un conjunto de ids presentes. */
  function reconciliarLista(guardados: string[][], idsPresentes: string[], tamano: number): Grupo[] {
    const setPresentes = new Set(idsPresentes);
    const enGrupos = new Set<string>();
    const grupos = guardados
      .map((g) => g.filter((id) => setPresentes.has(id)))
      .filter((g) => g.length > 0);
    for (const g of grupos) for (const id of g) enGrupos.add(id);
    const faltantes = idsPresentes.filter((id) => !enGrupos.has(id));
    return [...grupos, ...armarGrupos(faltantes, tamano)];
  }

  const idsPorGenero = (genero: "hombre" | "mujer") =>
    presentes.filter((p) => p.genero === genero).map((p) => p.id);
  const idsConGenero = () =>
    presentes.filter((p) => p.genero === "hombre" || p.genero === "mujer").map((p) => p.id);

  // Reset al cambiar de sábado o de fuente de personas (patrón React "ajustar
  // estado al cambiar una clave", sin efecto). Los grupos guardados solo se
  // reutilizan cuando la fuente son los presentes del sábado; con la fuente
  // "activos" siempre se parte del paso de generar.
  const clave = `${registroSeleccionado ?? ""}|${soloPresentes ? "presentes" : "activos"}`;
  const [claveActual, setClaveActual] = useState<string>(clave);
  if (claveActual !== clave) {
    setClaveActual(clave);
    setGrupoActivo(null);
    if (soloPresentes && gruposGuardados) {
      const esMixto = gruposGuardados.mixto === true;
      setModoMixto(esMixto);
      if (esMixto) {
        setGruposMixtos(reconciliarLista(gruposGuardados.mixtos, idsConGenero(), tamanoGrupo));
        setGruposHombres([]);
        setGruposMujeres([]);
      } else {
        setGruposHombres(reconciliarLista(gruposGuardados.hombres, idsPorGenero("hombre"), tamanoGrupo));
        setGruposMujeres(reconciliarLista(gruposGuardados.mujeres, idsPorGenero("mujer"), tamanoGrupo));
        setGruposMixtos([]);
      }
      setGenerado(true);
    } else {
      setGruposHombres([]);
      setGruposMujeres([]);
      setGruposMixtos([]);
      setGenerado(false);
    }
  }

  /**
   * Persiste los grupos actuales para el registro seleccionado. Solo aplica
   * cuando la fuente son los presentes del sábado; con la fuente "activos" los
   * grupos son efímeros y no deben sobrescribir lo guardado por asistencia.
   */
  function persistir(payload: { hombres: Grupo[]; mujeres: Grupo[]; mixtos: Grupo[]; mixto: boolean }) {
    if (!registroSeleccionado || !soloPresentes) return;
    const fd = new FormData();
    fd.set("registroId", registroSeleccionado);
    fd.set("grupos", JSON.stringify(payload));
    startTransition(async () => {
      await guardarGrupos(fd);
    });
  }

  /** Genera (o regenera) los grupos con el tamaño y el modo (mixto o por género) elegidos. */
  function generar() {
    // Con tamaño 2 nunca se mezcla; solo 3/4/5 pueden mezclar.
    const mixto = tamanoGrupo >= 3 && mezclarGeneros;
    setModoMixto(mixto);
    if (mixto) {
      const mixtos = armarGrupos(idsConGenero(), tamanoGrupo);
      setGruposMixtos(mixtos);
      setGruposHombres([]);
      setGruposMujeres([]);
      setGenerado(true);
      persistir({ hombres: [], mujeres: [], mixtos, mixto: true });
    } else {
      const h = armarGrupos(idsPorGenero("hombre"), tamanoGrupo);
      const m = armarGrupos(idsPorGenero("mujer"), tamanoGrupo);
      setGruposHombres(h);
      setGruposMujeres(m);
      setGruposMixtos([]);
      setGenerado(true);
      persistir({ hombres: h, mujeres: m, mixtos: [], mixto: false });
    }
  }

  const sinGenero = presentes.filter((p) => p.genero !== "hombre" && p.genero !== "mujer");

  function cambiarSabado(registroId: string) {
    setRegistroSeleccionado(registroId || null);
  }

  /**
   * Mueve un participante a un grupo destino dentro de la misma columna
   * ("hombre" | "mujer" | "mixto"). Lo quita de su grupo actual, lo agrega al
   * destino y elimina grupos que queden vacíos.
   */
  function moverA(columna: "hombre" | "mujer" | "mixto", participanteId: string, destinoIdx: number) {
    const base = columna === "hombre" ? gruposHombres : columna === "mujer" ? gruposMujeres : gruposMixtos;
    const setter = columna === "hombre" ? setGruposHombres : columna === "mujer" ? setGruposMujeres : setGruposMixtos;

    const sinParticipante = base.map((g) => g.filter((id) => id !== participanteId));
    const destino = sinParticipante[destinoIdx];
    if (!destino || destino.includes(participanteId)) return;
    destino.push(participanteId);
    const resultado = sinParticipante.filter((g) => g.length > 0);

    setter(resultado);
    if (columna === "hombre") persistir({ hombres: resultado, mujeres: gruposMujeres, mixtos: [], mixto: false });
    else if (columna === "mujer") persistir({ hombres: gruposHombres, mujeres: resultado, mixtos: [], mixto: false });
    else persistir({ hombres: [], mujeres: [], mixtos: resultado, mixto: true });
  }

  async function exportar() {
    const aExport = (grupos: Grupo[]) =>
      grupos.map((g) => ({
        nombres: g.map((id) => porId.get(id)?.nombre ?? id),
      }));
    const label = sabados.find((s) => s.registroId === registroSeleccionado)?.label ?? "";
    setExportando(true);
    try {
      await exportarOracionImagen(
        modoMixto
          ? { titulo: label, mixtos: aExport(gruposMixtos) }
          : { titulo: label, hombres: aExport(gruposHombres), mujeres: aExport(gruposMujeres) }
      );
    } catch (err) {
      console.error("Error al exportar la imagen:", err);
    } finally {
      setExportando(false);
    }
  }

  function claveGrupo(genero: string, idx: number): string {
    return `${genero}-${idx}`;
  }

  function renderColumna(columna: "hombre" | "mujer" | "mixto", grupos: Grupo[], color: string): React.JSX.Element {
    const chipStyle = { borderColor: `${color}55`, backgroundColor: `${color}14`, color };
    return (
      <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3 space-y-2">
        {grupos.map((grupo, idx) => {
          const clave = claveGrupo(columna, idx);
          const activo = grupoActivo === clave;
          return (
            <div
              key={clave}
              onDragOver={(e) => {
                e.preventDefault();
                setGrupoActivo(clave);
              }}
              onDragLeave={() => setGrupoActivo((prev) => (prev === clave ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                setGrupoActivo(null);
                const pid = e.dataTransfer.getData(MIME_ORIGEN) || e.dataTransfer.getData("text/plain");
                if (pid) moverA(columna, pid, idx);
              }}
              className={`rounded-lg border px-3 py-2 transition-colors ${activo ? "border-foreground/40 bg-foreground/[0.06] ring-2 ring-foreground/20" : "border-foreground/10 bg-background"
                }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${color}1f`, color }}
                >
                  {idx + 1}
                </span>
                <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
                  {grupo.map((id) => {
                    const p = porId.get(id);
                    if (!p) return null;
                    return (
                      <span
                        key={id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(MIME_ORIGEN, id);
                          e.dataTransfer.setData("text/plain", id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        style={chipStyle}
                        className="group inline-flex max-w-full cursor-grab items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium transition-shadow hover:shadow-sm active:cursor-grabbing active:opacity-70"
                        title="Arrastra a otro grupo"
                      >
                        <span aria-hidden className="opacity-40 group-hover:opacity-70">⠿</span>
                        <span className="truncate">{p.nombre}</span>
                      </span>
                    );
                  })}
                  {grupo.length === 1 && (
                    <span className="text-xs italic text-amber-400/80">Arrástralo a un grupo</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {grupos.length === 0 && (
          <p className="text-xs text-foreground/40 py-2 text-center">Sin participantes.</p>
        )}
        {/* Color de acento del género (barra superior sutil) */}
        <div className="h-0.5 rounded-full" style={{ backgroundColor: color, opacity: 0.4 }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Oración Intercesora</h1>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/40">Sábado</span>
            <select
              value={registroSeleccionado ?? ""}
              onChange={(e) => cambiarSabado(e.target.value)}
              className="rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
            >
              <option value="">Seleccionar…</option>
              {sabados.map((s) => (
                <option key={s.registroId} value={s.registroId}>{s.label}</option>
              ))}
            </select>
          </label>
          {generado && (
            <>
              <button
                type="button"
                onClick={generar}
                disabled={presentes.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Volver a generar los grupos aleatoriamente"
              >
                🔀 Rebarajar
              </button>
              <button
                type="button"
                onClick={exportar}
                disabled={exportando || presentes.length === 0}
                className="rounded-lg border border-foreground/15 bg-foreground/[0.03] px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/[0.08] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar los grupos como imagen"
              >
                {exportando ? "Generando…" : "🖼️ Imagen"}
              </button>
            </>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={soloPresentes}
          onChange={(e) => setSoloPresentes(e.target.checked)}
          className="h-4 w-4 rounded border-foreground/30 text-blue-600 focus:ring-blue-500/30"
        />
        Considerar solo los presentes del sábado
        <span className="text-xs text-foreground/40">
          {soloPresentes ? "" : `(usando ${activos.length} participante${activos.length !== 1 ? "s" : ""} activo${activos.length !== 1 ? "s" : ""})`}
        </span>
      </label>

      {isPending && (
        <p className="text-xs text-foreground/40">Guardando…</p>
      )}

      {soloPresentes && registroSeleccionado === null ? (
        <p className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-8 text-center text-sm text-foreground/50">
          Selecciona un sábado para generar las parejas.
        </p>
      ) : presentes.length === 0 ? (
        <p className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-8 text-center text-sm text-foreground/50">
          {soloPresentes
            ? "No hay alumnos presentes registrados para este sábado."
            : "No hay participantes activos en tu ámbito."}
        </p>
      ) : !generado ? (
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-8 flex flex-col items-center gap-4 text-center">
          <div>
            <p className="text-sm font-medium text-foreground">¿Cuántos integrantes por grupo?</p>
            <p className="mt-1 text-xs text-foreground/50">
              {presentes.length}{" "}
              {soloPresentes
                ? `presente${presentes.length !== 1 ? "s" : ""}`
                : `participante${presentes.length !== 1 ? "s" : ""} activo${presentes.length !== 1 ? "s" : ""}`}
              . Elige el tamaño y genera los grupos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {TAMANOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTamanoGrupo(t);
                  if (t < 3) setMezclarGeneros(false);
                }}
                aria-pressed={tamanoGrupo === t}
                className={`h-11 w-11 rounded-lg border text-sm font-semibold transition-colors ${tamanoGrupo === t
                  ? "border-blue-500 bg-blue-500/15 text-blue-400"
                  : "border-foreground/15 text-foreground/60 hover:bg-foreground/[0.04]"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
          {tamanoGrupo >= 3 && (
            <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
              <input
                type="checkbox"
                checked={mezclarGeneros}
                onChange={(e) => setMezclarGeneros(e.target.checked)}
                className="h-4 w-4 rounded border-foreground/30 text-blue-600 focus:ring-blue-500/30"
              />
              Mezclar géneros (hombres y mujeres en el mismo grupo)
            </label>
          )}
          <button
            type="button"
            onClick={generar}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Generar grupos
          </button>
        </div>
      ) : modoMixto ? (
        <div className="space-y-4">
          {renderColumna("mixto", gruposMixtos, "#6b7280")}
          {sinGenero.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">
                Sin género definido ({sinGenero.length})
              </p>
              <p className="mb-2 text-xs text-foreground/50">
                Estos presentes no se agruparon porque no tienen género asignado. Complétalo en Participantes.
              </p>
              <div className="flex flex-wrap gap-2">
                {sinGenero.map((p) => (
                  <span key={p.id} className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500">
                    {p.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderColumna("hombre", gruposHombres, "#64748b")}
          {renderColumna("mujer", gruposMujeres, "#78716c")}
          {sinGenero.length > 0 && (
            <div className="md:col-span-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">
                Sin género definido ({sinGenero.length})
              </p>
              <p className="mb-2 text-xs text-foreground/50">
                Estos presentes no se emparejaron porque no tienen género asignado. Complétalo en Participantes.
              </p>
              <div className="flex flex-wrap gap-2">
                {sinGenero.map((p) => (
                  <span key={p.id} className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500">
                    {p.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

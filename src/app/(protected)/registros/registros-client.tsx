"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { exportarAsignacionesImagen } from "./exportar-asignaciones-imagen";

export interface AusenteVista {
  readonly participanteId: string;
  readonly nombre: string;
  readonly fotoUrl: string | null;
  readonly responsableId: string | null;
  readonly justificado: boolean;
  /** null = sin definir, true = contactado, false = sin contactar. */
  readonly contactado: boolean | null;
  /** "hombre" | "mujer" | null (sin definir). */
  readonly genero: string | null;
  /** Celular del ausente para contactarlo (o null). */
  readonly celular: string | null;
}

export interface ParticipanteOpcion {
  readonly id: string;
  readonly nombre: string;
  /** "hombre" | "mujer" | null (sin definir). */
  readonly genero: string | null;
}

interface AusentesCellProps {
  readonly registroId: string;
  readonly fechaLabel: string;
  readonly totalAusentes: number;
  readonly ausentes: readonly AusenteVista[];
  readonly participantesActivos: readonly ParticipanteOpcion[];
  readonly asignarResponsable: (formData: FormData) => Promise<void>;
  readonly justificarAusente: (formData: FormData) => Promise<void>;
  readonly marcarContacto: (formData: FormData) => Promise<void>;
  /** Variante de disparador: número en tabla (desktop) o bloque en tarjeta (mobile). */
  readonly variant: "table" | "card";
}

interface FilaEstado {
  readonly responsableId: string | null;
  readonly justificado: boolean;
  readonly contactado: boolean | null;
}

const DRAG_MIME = "application/x-participante-id";

/**
 * Celda de "Ausentes" clickeable que abre un modal con la lista de personas
 * ausentes de un registro. El responsable se asigna arrastrando un participante
 * activo desde el panel lateral sobre la fila del ausente. Cada fila tiene además
 * un botón "Justificable" que exonera al ausente de la asignación de responsable.
 */
export function AusentesCell({
  registroId,
  fechaLabel,
  totalAusentes,
  ausentes,
  participantesActivos,
  asignarResponsable,
  justificarAusente,
  marcarContacto,
  variant,
}: AusentesCellProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();

  const [estado, setEstado] = useState<Record<string, FilaEstado>>(() => {
    const inicial: Record<string, FilaEstado> = {};
    for (const a of ausentes) {
      inicial[a.participanteId] = {
        responsableId: a.responsableId ?? null,
        justificado: a.justificado,
        contactado: a.contactado,
      };
    }
    return inicial;
  });
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [generandoImagen, setGenerandoImagen] = useState(false);

  const nombrePorId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of participantesActivos) m.set(p.id, p.nombre);
    return m;
  }, [participantesActivos]);

  const idsAusentes = useMemo(
    () => new Set(ausentes.map((a) => a.participanteId)),
    [ausentes]
  );

  const activosFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    // Excluir a quienes ya están ausentes en este registro.
    const base = participantesActivos.filter((p) => !idsAusentes.has(p.id));
    if (q === "") return base;
    return base.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [participantesActivos, filtro, idsAusentes]);

  const abrir = () => dialogRef.current?.showModal();
  const cerrar = () => dialogRef.current?.close();

  function asignar(participanteId: string, responsableId: string | null) {
    setEstado((prev) => ({
      ...prev,
      [participanteId]: {
        responsableId,
        justificado: responsableId !== null ? false : (prev[participanteId]?.justificado ?? false),
        contactado: prev[participanteId]?.contactado ?? null,
      },
    }));
    setGuardandoId(participanteId);
    const fd = new FormData();
    fd.set("registroId", registroId);
    fd.set("participanteId", participanteId);
    fd.set("responsableId", responsableId ?? "");
    startTransition(async () => {
      await asignarResponsable(fd);
      setGuardandoId(null);
    });
  }

  function toggleJustificado(participanteId: string) {
    const nuevo = !(estado[participanteId]?.justificado ?? false);
    setEstado((prev) => ({
      ...prev,
      [participanteId]: {
        justificado: nuevo,
        responsableId: nuevo ? null : (prev[participanteId]?.responsableId ?? null),
        contactado: prev[participanteId]?.contactado ?? null,
      },
    }));
    setGuardandoId(participanteId);
    const fd = new FormData();
    fd.set("registroId", registroId);
    fd.set("participanteId", participanteId);
    fd.set("justificado", String(nuevo));
    startTransition(async () => {
      await justificarAusente(fd);
      setGuardandoId(null);
    });
  }

  function marcarContactado(participanteId: string, contactado: boolean) {
    setEstado((prev) => ({
      ...prev,
      [participanteId]: {
        responsableId: prev[participanteId]?.responsableId ?? null,
        justificado: prev[participanteId]?.justificado ?? false,
        contactado,
      },
    }));
    setGuardandoId(participanteId);
    const fd = new FormData();
    fd.set("registroId", registroId);
    fd.set("participanteId", participanteId);
    fd.set("contactado", String(contactado));
    startTransition(async () => {
      await marcarContacto(fd);
      setGuardandoId(null);
    });
  }

  /**
   * Asigna responsables de forma aleatoria a los ausentes no justificados que
   * aún no tienen responsable, usando participantes activos disponibles (no
   * ausentes y no ya asignados) sin repetir.
   */
  function asignarAleatorio() {
    // Objetivos: ausentes no justificados y sin responsable.
    const objetivos = ausentes.filter((a) => {
      const f = estado[a.participanteId];
      return !(f?.justificado ?? false) && !(f?.responsableId ?? null);
    });
    if (objetivos.length === 0) return;

    // Disponibles: activos no ausentes y no ya asignados como responsable,
    // agrupados por género para emparejar hombre→hombre y mujer→mujer.
    const yaAsignados = new Set(
      Object.values(estado)
        .map((f) => f.responsableId)
        .filter((r): r is string => r != null)
    );
    const disponiblesPorGenero = new Map<string, string[]>();
    for (const p of participantesActivos) {
      if (idsAusentes.has(p.id) || yaAsignados.has(p.id)) continue;
      if (p.genero !== "hombre" && p.genero !== "mujer") continue; // sin género => no se empareja
      const lista = disponiblesPorGenero.get(p.genero) ?? [];
      lista.push(p.id);
      disponiblesPorGenero.set(p.genero, lista);
    }

    // Barajar cada grupo (Fisher–Yates).
    for (const lista of disponiblesPorGenero.values()) {
      for (let i = lista.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lista[i], lista[j]] = [lista[j]!, lista[i]!];
      }
    }

    // Emparejar cada objetivo con un disponible de su MISMO género.
    const asignaciones: { participanteId: string; responsableId: string }[] = [];
    for (const objetivo of objetivos) {
      if (objetivo.genero !== "hombre" && objetivo.genero !== "mujer") continue; // ausente sin género => se omite
      const pool = disponiblesPorGenero.get(objetivo.genero);
      const responsableId = pool?.shift();
      if (!responsableId) continue; // no hay disponibles de ese género
      asignaciones.push({ participanteId: objetivo.participanteId, responsableId });
    }
    if (asignaciones.length === 0) return;

    // Actualizar estado local en batch.
    setEstado((prev) => {
      const next = { ...prev };
      for (const { participanteId, responsableId } of asignaciones) {
        next[participanteId] = {
          responsableId,
          justificado: false,
          contactado: prev[participanteId]?.contactado ?? null,
        };
      }
      return next;
    });

    // Persistir todas las asignaciones.
    startTransition(async () => {
      for (const { participanteId, responsableId } of asignaciones) {
        const fd = new FormData();
        fd.set("registroId", registroId);
        fd.set("participanteId", participanteId);
        fd.set("responsableId", responsableId);
        await asignarResponsable(fd);
      }
    });
  }

  /**
   * Genera una imagen PNG con los ausentes que tienen responsable asignado,
   * incluyendo el celular del ausente.
   */
  async function generarImagen() {
    const filas = ausentes
      .filter((a) => {
        const f = estado[a.participanteId];
        return !(f?.justificado ?? false) && (f?.responsableId ?? null) != null;
      })
      .map((a) => {
        const responsableId = estado[a.participanteId]!.responsableId!;
        return {
          ausente: a.nombre,
          celular: a.celular ?? "",
          responsable: nombrePorId.get(responsableId) ?? responsableId,
        };
      });
    if (filas.length === 0) return;
    setGenerandoImagen(true);
    try {
      await exportarAsignacionesImagen({ titulo: fechaLabel, filas });
    } catch (err) {
      console.error("Error al generar la imagen:", err);
    } finally {
      setGenerandoImagen(false);
    }
  }

  // Partición reactiva según el estado local: los justificados salen de la lista
  // de ausentes y pasan al listado inferior "Justificados".
  const noJustificados = ausentes.filter((a) => !(estado[a.participanteId]?.justificado ?? false));
  const justificados = ausentes.filter((a) => estado[a.participanteId]?.justificado ?? false);

  function renderFila(a: AusenteVista): React.JSX.Element {
    const fila: FilaEstado =
      estado[a.participanteId] ?? { responsableId: null, justificado: false, contactado: null };
    const guardando = isPending && guardandoId === a.participanteId;
    const esDropActivo = dragOverId === a.participanteId && !fila.justificado;
    const responsableNombre =
      fila.responsableId != null ? nombrePorId.get(fila.responsableId) ?? fila.responsableId : null;
    return (
      <div
        key={a.participanteId}
        onDragOver={(e) => {
          if (fila.justificado) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          if (dragOverId !== a.participanteId) setDragOverId(a.participanteId);
        }}
        onDragLeave={() => {
          if (dragOverId === a.participanteId) setDragOverId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverId(null);
          if (fila.justificado) return;
          const pid = e.dataTransfer.getData(DRAG_MIME);
          if (pid) asignar(a.participanteId, pid);
        }}
        className={`rounded-lg border px-3 py-2 transition-colors ${esDropActivo
          ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30"
          : fila.justificado
            ? "border-green-500/30 bg-green-500/5"
            : "border-dashed border-foreground/20 bg-background"
          }`}
      >
        <div className="flex items-center gap-2">
          {a.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.fotoUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover bg-foreground/5"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-xs font-bold text-blue-500">
              {a.nombre.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="flex-1 text-sm text-foreground/90 truncate" title={a.nombre}>
            {a.nombre}
          </span>
          {guardando && (
            <svg className="animate-spin h-4 w-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <button
            type="button"
            onClick={() => toggleJustificado(a.participanteId)}
            disabled={guardando}
            className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${fila.justificado
              ? "bg-green-500/20 text-green-300 hover:bg-green-500/30"
              : "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
              }`}
            title={
              fila.justificado
                ? "Ausencia justificada (clic para devolver a ausentes)"
                : "Exonerar ausencia (queda justificada, sin responsable)"
            }
          >
            {fila.justificado ? "✓ Justificado" : "Exonerar"}
          </button>
        </div>

        {/* Estado de asignación (solo para no justificados) */}
        {!fila.justificado && (
          <div className="mt-1.5 text-xs">
            {responsableNombre != null ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-300">
                Responsable: {responsableNombre}
                <button
                  type="button"
                  onClick={() => asignar(a.participanteId, null)}
                  disabled={guardando}
                  className="text-blue-300/70 hover:text-blue-200 disabled:opacity-50"
                  aria-label="Quitar responsable"
                  title="Quitar responsable"
                >
                  ×
                </button>
              </span>
            ) : (
              <span className="text-foreground/40">Suelta aquí un participante para asignarlo</span>
            )}
          </div>
        )}

        {/* Estado de contacto (solo para no justificados) */}
        {!fila.justificado && (
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => marcarContactado(a.participanteId, true)}
              disabled={guardando}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${fila.contactado === true
                ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
                }`}
              title="Marcar como contactado"
            >
              {fila.contactado === true ? "✓ Contactado" : "Contactado"}
            </button>
            <button
              type="button"
              onClick={() => marcarContactado(a.participanteId, false)}
              disabled={guardando}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${fila.contactado === false
                ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
                }`}
              title="Marcar como sin contactar"
            >
              {fila.contactado === false ? "✓ Sin contactar" : "Sin contactar"}
            </button>
          </div>
        )}
      </div>
    );
  }

  const trigger =
    variant === "table" ? (
      <button
        type="button"
        onClick={abrir}
        className="font-medium text-red-400 hover:text-red-300 hover:underline transition-colors"
        title="Ver ausentes y asignar responsable"
      >
        {totalAusentes}
      </button>
    ) : (
      <button
        type="button"
        onClick={abrir}
        className="w-full bg-red-500/5 hover:bg-red-500/10 rounded p-2 text-center transition-colors"
        title="Ver ausentes y asignar responsable"
      >
        <p className="text-[10px] uppercase text-red-500/70 font-semibold mb-0.5">Ausentes</p>
        <p className="text-lg font-bold text-red-400">{totalAusentes}</p>
      </button>
    );

  return (
    <>
      {trigger}
      <dialog
        ref={dialogRef}
        className={`backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 ${justificados.length > 0 ? "max-w-5xl" : "max-w-3xl"
          }`}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Ausentes — {fechaLabel}</h2>
              <p className="text-xs text-foreground/50 mt-0.5">
                Arrastra un participante activo sobre un ausente para asignarle un responsable de
                contacto, o justifica la ausencia.
              </p>
            </div>
            <button
              type="button"
              onClick={cerrar}
              className="text-foreground/40 hover:text-foreground text-xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div
            className={`grid grid-cols-1 gap-4 ${justificados.length > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"
              }`}
          >
            {/* Listado de justificados — a la izquierda de los ausentes (si existe) */}
            {justificados.length > 0 && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/[0.04] p-3 flex flex-col min-h-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-green-400/70 mb-2">
                  Justificados ({justificados.length})
                </p>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {justificados.map((a) => renderFila(a))}
                </div>
              </div>
            )}

            {/* Lista de ausentes (zonas de drop) */}
            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
                  Ausentes ({noJustificados.length})
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={asignarAleatorio}
                    disabled={isPending || noJustificados.every((a) => estado[a.participanteId]?.responsableId != null)}
                    className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-1 text-[11px] font-medium text-purple-300 hover:bg-purple-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Asignar responsables aleatoriamente a los ausentes sin responsable"
                  >
                    🎲 Aleatorio
                  </button>
                  <button
                    type="button"
                    onClick={generarImagen}
                    disabled={generandoImagen || noJustificados.every((a) => (estado[a.participanteId]?.responsableId ?? null) == null)}
                    className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Generar imagen con ausentes, responsables y celular"
                  >
                    {generandoImagen ? "Generando…" : "🖼️ Imagen"}
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {noJustificados.map((a) => renderFila(a))}
                {noJustificados.length === 0 && (
                  <p className="text-sm text-foreground/40 text-center py-6">
                    {ausentes.length === 0
                      ? "No hay personas ausentes en este registro."
                      : "Todos los ausentes están justificados."}
                  </p>
                )}
              </div>
            </div>

            {/* Panel de participantes activos arrastrables — derecha */}
            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3 flex flex-col min-h-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">
                Participantes activos
              </p>
              <input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar..."
                className="w-full mb-2 rounded-lg border border-foreground/20 bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
              />
              <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {activosFiltrados.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_MIME, p.id);
                      e.dataTransfer.setData("text/plain", p.nombre);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="cursor-grab active:cursor-grabbing select-none rounded-md border border-foreground/10 bg-background px-2.5 py-1.5 text-xs text-foreground/80 hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors flex items-center gap-1.5"
                    title="Arrastra sobre un ausente"
                  >
                    <span className="text-foreground/30">⠿</span>
                    <span className="truncate">{p.nombre}</span>
                  </div>
                ))}
                {activosFiltrados.length === 0 && (
                  <p className="text-xs text-foreground/40 py-4 text-center">
                    Sin participantes activos disponibles.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-foreground/10">
            <button
              type="button"
              onClick={cerrar}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Listo
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

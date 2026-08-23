"use client";

import { useState, useTransition } from "react";
import {
  asignarEncargado,
  establecerEstadoSabado,
  exportarRolExcel,
  moverEncargado,
  quitarEncargado,
} from "./actions";
import {
  ETIQUETAS_CASILLERO,
  type EstadoSabado,
  type SabadoDisponible,
} from "./sabados";

export type { EstadoSabado, SabadoDisponible };

export interface ParticipanteActivo {
  id: string;
  nombre: string;
  apellido: string;
  fotoUrl?: string;
  comentario?: string;
}

interface EncargadosClientProps {
  participantes: ParticipanteActivo[];
  sabados: SabadoDisponible[];
  nombreUnidad: string;
  nombreIglesia: string;
  /** Asignaciones existentes: `${fechaISO}_slot${n}` -> participanteId. */
  asignacionesIniciales: Record<string, string>;
  /** Estados existentes por sábado: `${fechaISO}` -> estado. */
  estadosIniciales: Record<string, EstadoSabado>;
}

/** Referencia a un casillero concreto (sábado + posición). */
interface Casillero {
  fechaISO: string;
  slot: number;
}

/** Origen de un arrastre en curso. */
type Origen =
  | { tipo: "lista"; participanteId: string }
  | { tipo: "casillero"; origen: Casillero; participanteId: string };

const SLOTS = [0, 1, 2] as const;

function claveCasillero(fechaISO: string, slot: number): string {
  return `${fechaISO}_slot${slot}`;
}

/** Tipo MIME propio para transportar el origen del arrastre de forma fiable. */
const MIME_ORIGEN = "application/x-encargado-origen";

/** Serializa el origen del arrastre en el `DataTransfer`. */
function escribirOrigenDataTransfer(dt: DataTransfer, origen: Origen): void {
  try {
    dt.setData(MIME_ORIGEN, JSON.stringify(origen));
  } catch {
    // Algunos navegadores restringen tipos personalizados; se ignora y se
    // usa el respaldo `text/plain` + el estado `arrastrando`.
  }
}

/** Lee el origen del arrastre del `DataTransfer`, o null si no está presente. */
function leerOrigenDataTransfer(dt: DataTransfer): Origen | null {
  const crudo = dt.getData(MIME_ORIGEN);
  if (crudo) {
    try {
      const parseado = JSON.parse(crudo) as Origen;
      if (parseado && (parseado.tipo === "lista" || parseado.tipo === "casillero")) {
        return parseado;
      }
    } catch {
      // cae al respaldo.
    }
  }
  // Respaldo: un `text/plain` con solo el id de participante = arrastre de lista.
  const pid = dt.getData("text/plain");
  return pid ? { tipo: "lista", participanteId: pid } : null;
}

function iniciales(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

export function EncargadosClient({
  participantes,
  sabados,
  nombreUnidad,
  nombreIglesia,
  asignacionesIniciales,
  estadosIniciales,
}: EncargadosClientProps) {
  // Estado local optimista de las asignaciones (clave -> participanteId).
  const [asignaciones, setAsignaciones] =
    useState<Record<string, string>>(asignacionesIniciales);
  // Estado local optimista del estado por sábado (fechaISO -> estado).
  const [estados, setEstados] =
    useState<Record<string, EstadoSabado>>(estadosIniciales);
  const [guardando, startTransition] = useTransition();
  // Se pone en true tras la primera operación; permite mostrar "Guardado"
  // solo cuando ya hubo al menos un cambio (no al cargar la página).
  const [huboCambios, setHuboCambios] = useState(false);

  // Origen del arrastre en curso (para HTML5 DnD):
  //  - { tipo: "lista", participanteId }        -> desde el aside derecho.
  //  - { tipo: "casillero", origen, participanteId } -> arrastre interno.
  const [arrastrando, setArrastrando] = useState<Origen | null>(null);
  // Casillero resaltado mientras se arrastra encima.
  const [casilleroActivo, setCasilleroActivo] = useState<string | null>(null);

  const participantePorId = new Map(participantes.map((p) => [p.id, p]));

  /** Persiste una asignación (o borrado si `participanteId` es null). */
  function persistir(fechaISO: string, slot: number, participanteId: string | null) {
    const formData = new FormData();
    formData.set("fechaISO", fechaISO);
    formData.set("slot", String(slot));
    if (participanteId === null) {
      startTransition(async () => {
        await quitarEncargado(formData);
      });
      return;
    }
    formData.set("participanteId", participanteId);
    startTransition(async () => {
      await asignarEncargado(formData);
    });
  }

  function asignar(fechaISO: string, slot: number, participanteId: string) {
    const clave = claveCasillero(fechaISO, slot);
    setAsignaciones((prev) => ({ ...prev, [clave]: participanteId }));
    setHuboCambios(true);
    persistir(fechaISO, slot, participanteId);
  }

  /** Establece el estado de un sábado ("por_confirmar" | "confirmado"). */
  function cambiarEstado(fechaISO: string, estado: EstadoSabado) {
    setEstados((prev) => ({ ...prev, [fechaISO]: estado }));
    setHuboCambios(true);
    const formData = new FormData();
    formData.set("fechaISO", fechaISO);
    formData.set("estado", estado);
    startTransition(async () => {
      await establecerEstadoSabado(formData);
    });
  }

  /**
   * Exporta el rol de Encargados a un archivo `.xlsx` real. La generación
   * ocurre en el servidor (Server Action `exportarRolExcel`, que lee los
   * datos autoritativos desde Firestore); aquí solo se descarga el binario.
   */
  function exportarExcel() {
    startTransition(async () => {
      const base64 = await exportarRolExcel();
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `rol-encargados-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
    });
  }

  /**
   * Mueve la asignación de un casillero de origen a uno de destino. Si el
   * destino ya está ocupado, intercambia (swap) ambos participantes.
   *
   * IMPORTANTE: los IDs se leen de forma SÍNCRONA desde `asignaciones`
   * (el estado del render actual), NO dentro del updater de
   * `setAsignaciones`. Leerlos dentro del updater no garantiza que estén
   * disponibles cuando se llama a `persistir` justo después (el updater
   * puede ejecutarse de forma diferida o dos veces en StrictMode), lo que
   * provocaba que a veces NO se guardara el arrastre/intercambio.
   */
  function mover(origen: Casillero, destino: Casillero) {
    if (origen.fechaISO === destino.fechaISO && origen.slot === destino.slot) {
      return; // mismo casillero, nada que hacer.
    }
    const claveOrigen = claveCasillero(origen.fechaISO, origen.slot);
    const claveDestino = claveCasillero(destino.fechaISO, destino.slot);

    const idOrigen = asignaciones[claveOrigen];
    if (!idOrigen) return; // el origen quedó vacío; nada que mover.
    const idDestino = asignaciones[claveDestino];

    // Actualización optimista de la UI en un solo paso.
    setAsignaciones((prev) => {
      const siguiente = { ...prev };
      siguiente[claveDestino] = idOrigen;
      if (idDestino) {
        siguiente[claveOrigen] = idDestino; // swap
      } else {
        delete siguiente[claveOrigen]; // move
      }
      return siguiente;
    });

    setHuboCambios(true);
    // Persistir el movimiento/intercambio en UNA sola Server Action atómica
    // (batch + una única revalidación), evitando la carrera que dejaba una
    // de las dos escrituras sin guardar.
    const formData = new FormData();
    formData.set("fechaOrigen", origen.fechaISO);
    formData.set("slotOrigen", String(origen.slot));
    formData.set("fechaDestino", destino.fechaISO);
    formData.set("slotDestino", String(destino.slot));
    startTransition(async () => {
      await moverEncargado(formData);
    });
  }

  function quitar(fechaISO: string, slot: number) {
    const clave = claveCasillero(fechaISO, slot);
    setAsignaciones((prev) => {
      const siguiente = { ...prev };
      delete siguiente[clave];
      return siguiente;
    });
    setHuboCambios(true);

    const formData = new FormData();
    formData.set("fechaISO", fechaISO);
    formData.set("slot", String(slot));
    startTransition(async () => {
      await quitarEncargado(formData);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Encargados</h1>
          <button
            type="button"
            onClick={exportarExcel}
            className="shrink-0 rounded-lg border border-green-600/40 bg-green-600/10 px-3.5 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-600/20"
          >
            Exportar a Excel
          </button>
          <IndicadorGuardado guardando={guardando} huboCambios={huboCambios} />
        </div>
        <p className="mt-1 text-sm text-foreground/60">
          {nombreIglesia}
          {nombreUnidad ? ` — ${nombreUnidad}` : ""}
        </p>
        <p className="mt-1 text-xs text-foreground/40">
          Arrastra a un participante desde la lista de la derecha hacia un
          casillero del sábado correspondiente. Cada sábado admite 3 encargados.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-6 md:block md:pr-80">
        {/* Main: zona de arrastre con filas de sábados */}
        <section className="flex-1 space-y-3">
          {sabados.length === 0 ? (
            <p className="text-sm text-foreground/50">
              No hay sábados disponibles próximamente.
            </p>
          ) : (
            sabados.map((sabado) => (
              <div
                key={sabado.fechaISO}
                className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground capitalize">
                      {sabado.etiqueta}
                    </span>
                    <span className="text-xs text-foreground/40">{sabado.fechaISO}</span>
                  </div>
                  {(() => {
                    const estado = estados[sabado.fechaISO] ?? "por_confirmar";
                    return (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-pressed={estado === "por_confirmar"}
                          onClick={() => cambiarEstado(sabado.fechaISO, "por_confirmar")}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                            estado === "por_confirmar"
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                              : "border-foreground/15 text-foreground/40 hover:bg-foreground/[0.04]"
                          }`}
                        >
                          Por confirmar
                        </button>
                        <button
                          type="button"
                          aria-pressed={estado === "confirmado"}
                          onClick={() => cambiarEstado(sabado.fechaISO, "confirmado")}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                            estado === "confirmado"
                              ? "border-green-500/40 bg-green-500/15 text-green-400"
                              : "border-foreground/15 text-foreground/40 hover:bg-foreground/[0.04]"
                          }`}
                        >
                          Confirmado
                        </button>
                      </div>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {SLOTS.map((slot) => {
                    const clave = claveCasillero(sabado.fechaISO, slot);
                    const asignadoId = asignaciones[clave];
                    const asignado = asignadoId
                      ? participantePorId.get(asignadoId)
                      : undefined;
                    const activo = casilleroActivo === clave;
                    const destino: Casillero = { fechaISO: sabado.fechaISO, slot };
                    return (
                      <div
                        key={slot}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setCasilleroActivo(clave);
                        }}
                        onDragLeave={() => {
                          setCasilleroActivo((prev) => (prev === clave ? null : prev));
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setCasilleroActivo(null);
                          // Fuente de verdad: `dataTransfer` (robusto ante el
                          // orden de eventos dragEnd/drop). `arrastrando` es
                          // solo respaldo.
                          const origen =
                            leerOrigenDataTransfer(e.dataTransfer) ?? arrastrando;
                          setArrastrando(null);
                          if (!origen) return;
                          if (origen.tipo === "lista") {
                            asignar(sabado.fechaISO, slot, origen.participanteId);
                          } else {
                            mover(origen.origen, destino);
                          }
                        }}
                        className={`flex min-h-[68px] flex-col gap-1 rounded-md border border-dashed px-3 py-2 transition-colors ${
                          activo
                            ? "border-blue-500/50 bg-blue-500/10"
                            : asignado
                              ? "border-foreground/20 bg-background"
                              : "border-foreground/15 bg-foreground/[0.02]"
                        }`}
                      >
                        <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/40">
                          {ETIQUETAS_CASILLERO[slot]}
                        </span>
                        {asignado ? (
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <div
                              draggable
                              onDragStart={(e) => {
                                const origen: Origen = {
                                  tipo: "casillero",
                                  origen: destino,
                                  participanteId: asignado.id,
                                };
                                e.dataTransfer.setData("text/plain", asignado.id);
                                escribirOrigenDataTransfer(e.dataTransfer, origen);
                                e.dataTransfer.effectAllowed = "move";
                                setArrastrando(origen);
                              }}
                              onDragEnd={() => setArrastrando(null)}
                              className="flex min-w-0 flex-1 cursor-grab items-center gap-2 active:cursor-grabbing"
                            >
                              <Avatar participante={asignado} />
                              <span className="truncate text-sm text-foreground">
                                {asignado.nombre} {asignado.apellido}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => quitar(sabado.fechaISO, slot)}
                              aria-label={`Quitar a ${asignado.nombre} ${asignado.apellido}`}
                              className="shrink-0 rounded px-1.5 text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-foreground/25">
                            Arrastra un participante aquí
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Aside derecho: listado de participantes activos.
            En escritorio (md+) queda fijo al viewport para acompañar el
            scroll; en móvil se apila arriba del contenido. */}
        <aside className="w-full shrink-0 md:fixed md:right-4 md:top-4 md:bottom-4 md:z-20 md:w-72">
          <div className="flex flex-col rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3 md:h-full">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              Participantes activos
              <span className="ml-1 text-foreground/40">({participantes.length})</span>
            </h2>
            {participantes.length === 0 ? (
              <p className="text-xs text-foreground/50">
                No hay participantes activos.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                {participantes.map((p) => (
                  <li
                    key={p.id}
                    draggable
                    onDragStart={(e) => {
                      const origen: Origen = { tipo: "lista", participanteId: p.id };
                      e.dataTransfer.setData("text/plain", p.id);
                      escribirOrigenDataTransfer(e.dataTransfer, origen);
                      e.dataTransfer.effectAllowed = "copy";
                      setArrastrando(origen);
                    }}
                    onDragEnd={() => setArrastrando(null)}
                    className={`flex cursor-grab items-center gap-2 rounded-md border border-foreground/10 bg-background px-2 py-1.5 transition-colors hover:bg-foreground/[0.04] active:cursor-grabbing ${
                      arrastrando?.tipo === "lista" &&
                      arrastrando.participanteId === p.id
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    <Avatar participante={p} />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">
                        {p.nombre} {p.apellido}
                      </span>
                      {p.comentario ? (
                        <span
                          className="block truncate text-[11px] leading-tight text-foreground/40"
                          title={p.comentario}
                        >
                          {p.comentario}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] leading-tight text-foreground/30">
              Un participante puede asignarse a varios sábados. Usa el botón ×
              para liberar un casillero.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Indicador visual del estado de persistencia (Guardando… / Guardado). */
function IndicadorGuardado({
  guardando,
  huboCambios,
}: {
  guardando: boolean;
  huboCambios: boolean;
}) {
  if (guardando) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/50">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60" />
        Guardando…
      </span>
    );
  }
  if (huboCambios) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
        <span aria-hidden>✓</span>
        Guardado
      </span>
    );
  }
  return null;
}

function Avatar({ participante }: { participante: ParticipanteActivo }) {
  if (participante.fotoUrl) {
    return (
      <img
        src={participante.fotoUrl}
        alt=""
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-semibold text-foreground/60">
      {iniciales(participante.nombre, participante.apellido)}
    </span>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";

export interface PresenteVista {
  readonly participanteId: string;
  readonly nombre: string;
  readonly fotoUrl: string | null;
  readonly visitasTraidas: number;
}

interface PresentesCellProps {
  readonly registroId: string;
  readonly fechaLabel: string;
  readonly totalPresentes: number;
  readonly presentes: readonly PresenteVista[];
  readonly guardarVisitas: (formData: FormData) => Promise<void>;
  /** Variante de disparador: número en tabla (desktop) o bloque en tarjeta (mobile). */
  readonly variant: "table" | "card";
}

/**
 * Celda de "Presentes" clickeable que abre un modal con la lista de participantes
 * presentes de un registro y permite asignar a cada uno la cantidad de visitas
 * que trajo a la clase ese sábado.
 */
export function PresentesCell({
  registroId,
  fechaLabel,
  totalPresentes,
  presentes,
  guardarVisitas,
  variant,
}: PresentesCellProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [valores, setValores] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    for (const p of presentes) inicial[p.participanteId] = p.visitasTraidas;
    return inicial;
  });
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  const abrir = () => dialogRef.current?.showModal();
  const cerrar = () => dialogRef.current?.close();

  function guardar(participanteId: string, valor: number) {
    const visitas = Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0;
    setValores((prev) => ({ ...prev, [participanteId]: visitas }));
    setGuardandoId(participanteId);
    const fd = new FormData();
    fd.set("registroId", registroId);
    fd.set("participanteId", participanteId);
    fd.set("visitasTraidas", String(visitas));
    startTransition(async () => {
      await guardarVisitas(fd);
      setGuardandoId(null);
    });
  }

  function ajustar(participanteId: string, delta: number) {
    const actual = valores[participanteId] ?? 0;
    guardar(participanteId, Math.max(0, actual + delta));
  }

  const totalVisitas = presentes.reduce((acc, p) => acc + (valores[p.participanteId] ?? 0), 0);

  const trigger =
    variant === "table" ? (
      <button
        type="button"
        onClick={abrir}
        className="font-medium text-green-500 hover:text-green-400 hover:underline transition-colors"
        title="Ver presentes y registrar visitas que trajeron"
      >
        {totalPresentes}
      </button>
    ) : (
      <button
        type="button"
        onClick={abrir}
        className="w-full bg-green-500/5 hover:bg-green-500/10 rounded p-2 text-center transition-colors"
        title="Ver presentes y registrar visitas que trajeron"
      >
        <p className="text-[10px] uppercase text-green-500/70 font-semibold mb-0.5">Presentes</p>
        <p className="text-lg font-bold text-green-500">{totalPresentes}</p>
      </button>
    );

  return (
    <>
      {trigger}
      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-lg shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Presentes — {fechaLabel}</h2>
              <p className="text-xs text-foreground/50 mt-0.5">
                {presentes.length} presente{presentes.length !== 1 ? "s" : ""}. Registra cuántas
                visitas trajo cada uno a la clase.
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

          <div className="max-h-80 overflow-y-auto space-y-2 -mx-1 px-1">
            {presentes.map((p) => {
              const guardando = isPending && guardandoId === p.participanteId;
              const valor = valores[p.participanteId] ?? 0;
              return (
                <div
                  key={p.participanteId}
                  className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2"
                >
                  {p.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.fotoUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover bg-foreground/5"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-xs font-bold text-blue-500">
                      {p.nombre.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 text-sm text-foreground/90 truncate" title={p.nombre}>
                    {p.nombre}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => ajustar(p.participanteId, -1)}
                      disabled={guardando || valor <= 0}
                      className="h-7 w-7 rounded-md bg-foreground/5 text-foreground/70 hover:bg-foreground/10 disabled:opacity-40 transition-colors"
                      aria-label="Restar visita"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={valor}
                      onChange={(e) => {
                        const v = Number.parseInt(e.target.value, 10);
                        setValores((prev) => ({ ...prev, [p.participanteId]: Number.isFinite(v) && v > 0 ? v : 0 }));
                      }}
                      onBlur={(e) => {
                        const v = Number.parseInt(e.target.value, 10);
                        guardar(p.participanteId, Number.isFinite(v) ? v : 0);
                      }}
                      className="w-14 rounded-md border border-foreground/20 bg-background px-2 py-1 text-center text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => ajustar(p.participanteId, 1)}
                      disabled={guardando}
                      className="h-7 w-7 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      aria-label="Sumar visita"
                    >
                      +
                    </button>
                    {guardando && (
                      <svg className="animate-spin h-4 w-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
            {presentes.length === 0 && (
              <p className="text-sm text-foreground/40 text-center py-6">
                No hay participantes presentes en este registro.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
            <span className="text-xs text-foreground/60">
              Total de visitas traídas: <span className="font-semibold text-foreground">{totalVisitas}</span>
            </span>
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

"use client";

import { useRef } from "react";

export interface TopItem {
  readonly participanteId: string;
  readonly nombre: string;
  readonly fotoUrl: string | null;
  readonly valor: number;
}

interface Top10ButtonProps {
  readonly top: readonly TopItem[];
  /** Texto del botón (incluye emoji), p. ej. "🏆 Top 10 asistencia". */
  readonly botonLabel: string;
  /** Título del modal, p. ej. "Top 10 asistencia". */
  readonly titulo: string;
  /** Subtítulo descriptivo del modal. */
  readonly descripcion: string;
  /** Mensaje cuando no hay datos. */
  readonly vacioLabel: string;
  /** Variante de color del botón/valor. */
  readonly color: "amber" | "sky";
}

const MEDALLAS: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

const COLOR_BOTON: Record<Top10ButtonProps["color"], string> = {
  amber: "bg-amber-500/90 hover:bg-amber-500",
  sky: "bg-sky-500/90 hover:bg-sky-500",
};
const COLOR_BARRA: Record<Top10ButtonProps["color"], string> = {
  amber: "bg-green-500",
  sky: "bg-sky-500",
};
const COLOR_VALOR: Record<Top10ButtonProps["color"], string> = {
  amber: "text-green-500",
  sky: "text-sky-500",
};

/**
 * Botón + modal que muestra un Top 10 de participantes según una métrica
 * (`valor`), calculado sobre los registros sabáticos cargados en la página.
 */
export function Top10Button({
  top,
  botonLabel,
  titulo,
  descripcion,
  vacioLabel,
  color,
}: Top10ButtonProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const maxValor = top.length > 0 ? top[0]!.valor : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors ${COLOR_BOTON[color]}`}
        title={titulo}
      >
        {botonLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-md shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
              <p className="text-xs text-foreground/50 mt-0.5">{descripcion}</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-foreground/40 hover:text-foreground text-xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <ol className="space-y-2">
            {top.map((p, i) => (
              <li
                key={p.participanteId}
                className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2"
              >
                <span className="w-6 shrink-0 text-center text-sm font-bold text-foreground/60">
                  {MEDALLAS[i] ?? i + 1}
                </span>
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.fotoUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover bg-foreground/5"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-xs font-bold text-blue-500">
                    {p.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate" title={p.nombre}>
                    {p.nombre}
                  </p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className={`h-full rounded-full ${COLOR_BARRA[color]}`}
                      style={{ width: `${maxValor > 0 ? (p.valor / maxValor) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className={`shrink-0 text-sm font-semibold ${COLOR_VALOR[color]}`}>
                  {p.valor}
                </span>
              </li>
            ))}
            {top.length === 0 && (
              <li className="text-sm text-foreground/40 text-center py-6">{vacioLabel}</li>
            )}
          </ol>

          <div className="flex justify-end pt-2 border-t border-foreground/10">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

"use client";

import { useRef } from "react";

export interface PuntoSerie {
  /** Etiqueta corta del eje X (p. ej. "S1" o la fecha). */
  readonly label: string;
  /** Etiqueta larga para el tooltip/detalle (p. ej. fecha completa). */
  readonly labelLargo: string;
  readonly valor: number;
}

interface IndicadorChartHeaderProps {
  /** Texto de la cabecera. */
  readonly titulo: string;
  /** Serie cronológica (más antiguo primero). */
  readonly serie: readonly PuntoSerie[];
  /** Color del trazo (clase de color de texto Tailwind para la cifra) y del gráfico. */
  readonly colorHex: string;
  /** Alineación del contenido de la cabecera. */
  readonly align?: "left" | "right";
  /** Clase extra para el botón (color del texto de la cabecera). */
  readonly labelClassName?: string;
  /** Formato del valor (p. ej. moneda para ofrenda). */
  readonly formato?: "numero" | "decimal";
}

function formatearValor(v: number, formato: IndicadorChartHeaderProps["formato"]): string {
  if (formato === "decimal") {
    return v.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return String(v);
}

/**
 * Cabecera de columna clickeable que abre un modal con un gráfico de línea (SVG)
 * mostrando la evolución del indicador por sábado.
 */
export function IndicadorChartHeader({
  titulo,
  serie,
  colorHex,
  align = "right",
  labelClassName,
  formato = "numero",
}: IndicadorChartHeaderProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Geometría del gráfico.
  const W = 640;
  const H = 280;
  const P = { top: 24, right: 24, bottom: 48, left: 48 };
  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;

  const valores = serie.map((p) => p.valor);
  const maxV = valores.length > 0 ? Math.max(...valores) : 0;
  const minV = valores.length > 0 ? Math.min(...valores, 0) : 0;
  const rango = maxV - minV || 1;

  const x = (i: number) =>
    P.left + (serie.length <= 1 ? innerW / 2 : (i / (serie.length - 1)) * innerW);
  const y = (v: number) => P.top + innerH - ((v - minV) / rango) * innerH;

  const puntos = serie.map((p, i) => ({ cx: x(i), cy: y(p.valor), ...p }));
  const linea = puntos.map((pt) => `${pt.cx},${pt.cy}`).join(" ");
  const area = puntos.length > 0
    ? `${P.left},${P.top + innerH} ${linea} ${x(serie.length - 1)},${P.top + innerH}`
    : "";

  // Líneas de referencia horizontales (4 divisiones).
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const val = minV + rango * f;
    return { y: y(val), val };
  });

  const promedio =
    valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
  const ultimo = valores.length > 0 ? valores[valores.length - 1]! : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={`inline-flex items-center gap-1 hover:underline transition-colors ${
          align === "right" ? "flex-row-reverse" : ""
        } ${labelClassName ?? "text-foreground/70"}`}
        title={`Ver evolución de ${titulo}`}
      >
        <span>{titulo}</span>
        <span className="opacity-50 text-[10px]" aria-hidden>📈</span>
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-2xl shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Evolución — {titulo}</h2>
              <p className="text-xs text-foreground/50 mt-0.5">
                Valor del indicador por sábado registrado.
              </p>
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

          {serie.length === 0 ? (
            <p className="text-sm text-foreground/40 text-center py-10">
              No hay datos registrados para este indicador.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-2">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/50">Último</p>
                  <p className="text-lg font-bold" style={{ color: colorHex }}>{formatearValor(ultimo, formato)}</p>
                </div>
                <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-2">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/50">Promedio</p>
                  <p className="text-lg font-bold text-foreground">{formatearValor(Math.round(promedio * 100) / 100, "decimal")}</p>
                </div>
                <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-2">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/50">Máximo</p>
                  <p className="text-lg font-bold text-foreground">{formatearValor(maxV, formato)}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-foreground/10 bg-foreground/[0.02] p-2">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Gráfico de ${titulo}`}>
                  {/* Grid + etiquetas del eje Y */}
                  {gridY.map((g, i) => (
                    <g key={i}>
                      <line x1={P.left} y1={g.y} x2={W - P.right} y2={g.y} stroke="currentColor" className="text-foreground/10" strokeWidth={1} />
                      <text x={P.left - 8} y={g.y + 3} textAnchor="end" className="fill-foreground/40" fontSize={10}>
                        {formatearValor(Math.round(g.val * 100) / 100, formato)}
                      </text>
                    </g>
                  ))}

                  {/* Área bajo la curva */}
                  {puntos.length > 1 && (
                    <polygon points={area} fill={colorHex} opacity={0.08} />
                  )}

                  {/* Línea */}
                  {puntos.length > 1 && (
                    <polyline
                      points={linea}
                      fill="none"
                      stroke={colorHex}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Puntos + etiquetas del eje X y valor */}
                  {puntos.map((pt, i) => (
                    <g key={i}>
                      <circle cx={pt.cx} cy={pt.cy} r={3.5} fill={colorHex}>
                        <title>{`${pt.labelLargo}: ${formatearValor(pt.valor, formato)}`}</title>
                      </circle>
                      <text x={pt.cx} y={pt.cy - 8} textAnchor="middle" className="fill-foreground/60" fontSize={9}>
                        {formatearValor(pt.valor, formato)}
                      </text>
                      <text x={pt.cx} y={H - P.bottom + 18} textAnchor="middle" className="fill-foreground/40" fontSize={9}>
                        {pt.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </>
          )}

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

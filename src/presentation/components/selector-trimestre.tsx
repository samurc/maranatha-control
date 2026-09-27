"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface SelectorTrimestreProps {
  /** Año seleccionado actualmente. */
  readonly anio: number;
  /** Trimestre seleccionado (1-4) o null para "Todos" (solo si se permite). */
  readonly trimestre: number | null;
  /** Años disponibles para elegir (orden descendente recomendado). */
  readonly anios: readonly number[];
  /** Si true, ofrece una opción "Todos" (trimestre = null). */
  readonly permitirTodos?: boolean;
}

const TRIMESTRES = [1, 2, 3, 4] as const;

/**
 * Selector de año y trimestre que refleja su estado en los search params de la
 * URL (`?anio=&trimestre=`). Al cambiar, navega a la misma ruta con los nuevos
 * parámetros, provocando que el Server Component vuelva a renderizar con el
 * periodo elegido. Con `permitirTodos`, la opción "Todos" omite el parámetro
 * `trimestre`.
 */
export function SelectorTrimestre({
  anio,
  trimestre,
  anios,
  permitirTodos = false,
}: SelectorTrimestreProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function navegar(nuevoAnio: number, nuevoTrimestre: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("anio", String(nuevoAnio));
    if (nuevoTrimestre === null) params.delete("trimestre");
    else params.set("trimestre", String(nuevoTrimestre));
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false });
    });
  }

  const claseSelect =
    "rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors disabled:opacity-50";

  return (
    <div className="flex items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/40">Año</span>
        <select
          value={anio}
          disabled={isPending}
          onChange={(e) => navegar(Number(e.target.value), trimestre)}
          className={claseSelect}
        >
          {anios.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/40">Trimestre</span>
        <select
          value={trimestre ?? ""}
          disabled={isPending}
          onChange={(e) => navegar(anio, e.target.value === "" ? null : Number(e.target.value))}
          className={claseSelect}
        >
          {permitirTodos && <option value="">Todos</option>}
          {TRIMESTRES.map((t) => (
            <option key={t} value={t}>{t}° Trimestre</option>
          ))}
        </select>
      </label>
    </div>
  );
}

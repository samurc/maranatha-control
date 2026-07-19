/**
 * `useGridKeyboardNav` (Requerimiento 14.3, tarea 35.4).
 *
 * Hook que captura `ArrowUp`/`ArrowDown` (y `Tab`/`Shift+Tab` de forma
 * nativa vía `tabIndex`, sin necesidad de interceptarlos) para mover el
 * foco DOM entre filas de la grilla, sin depender del mouse. `Enter`
 * confirma el valor de la celda enfocada (delegado al propio control:
 * `<input type="number">`/`<button>` ya manejan `Enter` nativamente, por
 * lo que este hook no necesita interceptarlo explícitamente más que para
 * evitar que borbotee hacia un formulario padre).
 *
 * Devuelve:
 * - `onKeyDown`: manejador a adjuntar al contenedor `role="grid"`.
 * - `tabIndexPara(index)`: `0` para la primera fila (punto de entrada del
 *   tabulador), `-1` para el resto (se navega por flechas, no por Tab
 *   entre CADA fila, evitando un tab-trap de cientos de paradas).
 */
import { useCallback } from "react";

export interface UseGridKeyboardNavResult {
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  readonly tabIndexPara: (index: number) => 0 | -1;
}

const SELECTOR_FILA = "[data-row-index]";

export function useGridKeyboardNav(
  totalFilas: number
): UseGridKeyboardNavResult {
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }
      const filaActual = (event.target as HTMLElement).closest(
        SELECTOR_FILA
      ) as HTMLElement | null;
      if (filaActual === null) {
        return;
      }
      const indexActual = Number(filaActual.dataset.rowIndex);
      const siguiente =
        event.key === "ArrowDown"
          ? Math.min(indexActual + 1, totalFilas - 1)
          : Math.max(indexActual - 1, 0);

      if (siguiente === indexActual) {
        return;
      }

      event.preventDefault();
      const contenedor = filaActual.closest('[role="grid"]');
      const filaSiguiente = contenedor?.querySelector(
        `[data-row-index="${siguiente}"]`
      ) as HTMLElement | null;
      filaSiguiente?.focus();
    },
    [totalFilas]
  );

  const tabIndexPara = useCallback(
    (index: number): 0 | -1 => (index === 0 ? 0 : -1),
    []
  );

  return { onKeyDown, tabIndexPara };
}

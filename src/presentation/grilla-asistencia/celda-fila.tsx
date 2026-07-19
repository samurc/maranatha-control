/**
 * `CeldaFila` (Requerimiento 14.2, 14.5, tareas 35.1, 35.9).
 *
 * Componente de fila memoizado con `React.memo`: solo se re-renderiza
 * cuando su PROPIA `CeldaState` cambia de referencia (Property 37,
 * Requirement 14.2), gracias a que `gridReducer` (`grid-state.ts`)
 * preserva la identidad referencial de las entradas no afectadas por una
 * acción `SET_CELDA`.
 *
 * Accesibilidad (Requirement 14.5, tarea 35.9): `role="row"` en el
 * contenedor y `role="gridcell"` en cada control interactivo, `aria-label`
 * descriptivo por control, foco visible vía `:focus-visible` (Tailwind
 * `focus-visible:ring-2`), contraste AA en los estados de la celda.
 */
"use client";

import { memo } from "react";
import type { CeldaState } from "./grid-state";

export interface CeldaFilaProps {
  readonly participanteId: string;
  readonly nombreCompleto: string;
  readonly celda: CeldaState;
  readonly onCambiar: (participanteId: string, celda: CeldaState) => void;
}

function CeldaFilaImpl({
  participanteId,
  nombreCompleto,
  celda,
  onCambiar,
}: CeldaFilaProps): React.JSX.Element {
  return (
    <div role="row" data-participante-id={participanteId} className="grid-row">
      <span role="rowheader">{nombreCompleto}</span>
      <div role="gridcell">
        <button
          type="button"
          aria-label={`Marcar presente a ${nombreCompleto}`}
          aria-pressed={celda.presente}
          className="focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          onClick={() =>
            onCambiar(participanteId, { ...celda, presente: !celda.presente })
          }
        >
          {celda.presente ? "Presente" : "Ausente"}
        </button>
      </div>
      <input
        role="gridcell"
        aria-label={`Días de estudio de ${nombreCompleto}`}
        type="number"
        min={0}
        max={7}
        step={1}
        value={celda.diasEstudio}
        className="focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        onChange={(event) => {
          const valor = Number(event.target.value);
          if (Number.isInteger(valor) && valor >= 0 && valor <= 7) {
            onCambiar(participanteId, { ...celda, diasEstudio: valor });
          }
        }}
      />
    </div>
  );
}

/**
 * Comparador explícito: re-renderiza solo si cambia la referencia de
 * `celda` (nunca por comparación profunda de `nombreCompleto`/callbacks
 * estables), reforzando la garantía de aislamiento de Property 37.
 */
export const CeldaFila = memo(
  CeldaFilaImpl,
  (prev, next) =>
    prev.celda === next.celda &&
    prev.participanteId === next.participanteId &&
    prev.nombreCompleto === next.nombreCompleto
);

/**
 * `InterfazGrillaAsistencia` (Requerimiento 14.1-14.5, 18.4, tareas
 * 35.1-35.9).
 *
 * Componente de cliente que orquesta:
 * - Virtualización de filas (`@tanstack/react-virtual`, design.md) para
 *   soportar hasta 200 Participantes sin montar en el DOM más que las
 *   filas visibles (Requirement 14.1).
 * - Estado local granular vía `useReducer` (`grid-state.ts`, Requirement
 *   14.2).
 * - Navegación por teclado (`useGridKeyboardNav`, Requirement 14.3).
 * - Guardado consolidado (`useGuardarAsistencia`, Requirement 14.4).
 * - Indicador visual de cambios pendientes de sincronización offline
 *   (Requirement 18.4).
 * - Accesibilidad: `role="grid"` en el contenedor virtualizado
 *   (Requirement 14.5).
 */
"use client";

import { useReducer, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { gridReducer, type CeldaState, type GridState } from "./grid-state";
import { CeldaFila } from "./celda-fila";
import { useGridKeyboardNav } from "./use-grid-keyboard-nav";
import { useGuardarAsistencia } from "./use-guardar-asistencia";
import type { RegistrarAsistenciaDto } from "../../application/dto/registro-sabatico.schema";

export interface ParticipanteGrilla {
  readonly participanteId: string;
  readonly nombreCompleto: string;
}

export interface InterfazGrillaAsistenciaProps {
  readonly participantes: readonly ParticipanteGrilla[];
  readonly estadoInicial: GridState;
  /** Metadatos fijos del Registro_Sabatico objetivo (Requirement 14.4). */
  readonly contexto: Pick<
    RegistrarAsistenciaDto,
    "iglesiaId" | "unidadId" | "fechaReferencia"
  >;
  /** Ejecuta el DTO consolidado contra `registrar-asistencia.use-case.ts` (vía OfflineQueue si no hay conectividad). */
  readonly onGuardar: (dto: RegistrarAsistenciaDto) => Promise<void>;
}

const ALTURA_FILA_PX = 40;

export function InterfazGrillaAsistencia({
  participantes,
  estadoInicial,
  contexto,
  onGuardar,
}: InterfazGrillaAsistenciaProps): React.JSX.Element {
  const [state, dispatch] = useReducer(gridReducer, estadoInicial);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: participantes.length,
    getScrollElement: () => contenedorRef.current,
    estimateSize: () => ALTURA_FILA_PX,
    overscan: 8,
  });

  const { hayPendientes, guardando, guardar } = useGuardarAsistencia({
    estadoGuardado: estadoInicial,
    estadoActual: state,
    contexto,
    onGuardar,
  });

  const manejarCambio = (participanteId: string, celda: CeldaState): void => {
    dispatch({ type: "SET_CELDA", participanteId, celda });
  };

  const { onKeyDown, tabIndexPara } = useGridKeyboardNav(participantes.length);

  return (
    <div>
      {hayPendientes ? (
        <p role="status" aria-live="polite" data-testid="indicador-pendientes">
          Cambios pendientes de sincronización.
        </p>
      ) : null}

      <div
        ref={contenedorRef}
        role="grid"
        aria-label="Grilla de asistencia"
        aria-rowcount={participantes.length}
        onKeyDown={onKeyDown}
        style={{ height: "600px", overflow: "auto" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const participante = participantes[item.index];
            if (participante === undefined) {
              return null;
            }
            const celda =
              state[participante.participanteId] ?? {
                presente: false,
                diasEstudio: 0,
              };
            return (
              <div
                key={participante.participanteId}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${item.size}px`,
                  transform: `translateY(${item.start}px)`,
                }}
                tabIndex={tabIndexPara(item.index)}
                data-row-index={item.index}
              >
                <CeldaFila
                  participanteId={participante.participanteId}
                  nombreCompleto={participante.nombreCompleto}
                  celda={celda}
                  onCambiar={manejarCambio}
                />
              </div>
            );
          })}
        </div>
      </div>

      <button type="button" onClick={() => void guardar()} disabled={guardando}>
        Guardar
      </button>
    </div>
  );
}

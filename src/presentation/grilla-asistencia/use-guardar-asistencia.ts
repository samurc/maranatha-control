/**
 * `useGuardarAsistencia` (Requerimiento 14.4, 18.4, tarea 35.6).
 *
 * Recolecta el diff acumulado (`calcularDiff`, `grid-state.ts`) desde el
 * último estado guardado y lo envía como UN SOLO DTO consolidado a
 * `registrar-asistencia.use-case.ts` (Property 38: "el número de llamadas
 * al repositorio de persistencia SHALL ser exactamente uno,
 * independientemente del valor de N" ediciones). El envío real
 * (`onGuardar`) es inyectado por el llamador: en producción, encola el
 * comando en `OfflineQueue` si no hay conectividad, o lo ejecuta
 * directamente contra el caso de uso si la hay — esa decisión de
 * conectividad vive fuera de este hook (en la página que compone
 * `InterfazGrillaAsistencia`), que solo se preocupa de construir el DTO
 * consolidado y no envía nada si el diff está vacío (N=0 también produce
 * como máximo una llamada, nunca cero llamadas fallidas por diff vacío
 * silenciosamente ignoradas sin que el Maestro lo sepa — se retorna sin
 * llamar a `onGuardar`, pero el llamador puede optar por deshabilitar el
 * botón "Guardar" cuando no hay cambios).
 *
 * `hayPendientes` (Requirement 18.4): booleano derivado exclusivamente
 * del diff local NO guardado, para el indicador visual de la grilla. No
 * debe confundirse con `OfflineQueue.tieneCambiosPendientes()` (cambios
 * ya enviados pero aún no sincronizados con el servidor por falta de
 * conectividad) — ambos indicadores son complementarios y la página que
 * compone este hook puede combinarlos.
 */
import { useCallback, useState } from "react";
import { calcularDiff, type GridState } from "./grid-state";
import type { RegistrarAsistenciaDto } from "../../application/dto/registro-sabatico.schema";

export interface UseGuardarAsistenciaInput {
  readonly estadoGuardado: GridState;
  readonly estadoActual: GridState;
  readonly contexto: Pick<
    RegistrarAsistenciaDto,
    "iglesiaId" | "unidadId" | "fechaReferencia"
  >;
  readonly onGuardar: (dto: RegistrarAsistenciaDto) => Promise<void>;
}

export interface UseGuardarAsistenciaResult {
  readonly hayPendientes: boolean;
  readonly guardando: boolean;
  /** Construye el DTO consolidado y lo envía en una única llamada (Property 38). No hace nada si el diff está vacío. */
  readonly guardar: () => Promise<void>;
}

export function useGuardarAsistencia({
  estadoGuardado,
  estadoActual,
  contexto,
  onGuardar,
}: UseGuardarAsistenciaInput): UseGuardarAsistenciaResult {
  const [guardando, setGuardando] = useState(false);

  const diff = calcularDiff(estadoGuardado, estadoActual);
  const hayPendientes = diff.size > 0;

  const guardar = useCallback(async () => {
    if (diff.size === 0) {
      return;
    }
    setGuardando(true);
    try {
      // Única llamada, con TODOS los cambios acumulados (Property 38).
      await onGuardar({
        iglesiaId: contexto.iglesiaId,
        unidadId: contexto.unidadId,
        fechaReferencia: contexto.fechaReferencia,
        cambios: [...diff.values()],
      });
    } finally {
      setGuardando(false);
    }
  }, [diff, contexto, onGuardar]);

  return { hayPendientes, guardando, guardar };
}

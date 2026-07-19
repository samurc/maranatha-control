/**
 * Estado local de la Interfaz_Grilla_Asistencia (Requerimiento 14.1,
 * 14.2, tarea 35.1).
 *
 * Modelado como `Record<participanteId, CeldaState>` gestionado con
 * `useReducer` (design.md: "Estado local de la grilla modelado como
 * `Record<participanteId, CeldaState>` con actualizaciones granulares vía
 * `useReducer`/store atómico"). Cada acción `SET_CELDA` reemplaza
 * ÚNICAMENTE la entrada del `participanteId` afectado, preservando la
 * identidad referencial (misma referencia de objeto) de todas las demás
 * entradas — esto es lo que permite que un componente de fila memoizado
 * con `React.memo` + un selector por clave (tarea 35.1) NO se
 * re-renderice cuando otra fila cambia (Property 37, Requirement 14.2).
 */

export interface CeldaState {
  readonly presente: boolean;
  readonly diasEstudio: number;
}

export type GridState = Readonly<Record<string, CeldaState>>;

export type GridAction =
  | {
      readonly type: "SET_CELDA";
      readonly participanteId: string;
      readonly celda: CeldaState;
    }
  | { readonly type: "RESET"; readonly estadoInicial: GridState };

/**
 * Reductor puro de la grilla. Para `SET_CELDA`, retorna un NUEVO objeto de
 * nivel superior (`{...state, [participanteId]: celda}`) pero conserva
 * intactas (misma referencia) todas las entradas de otros
 * `participanteId` — la propiedad que garantiza Property 37 ("el número
 * de re-renderizados de filas no editadas SHALL ser cero").
 */
export function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case "SET_CELDA":
      if (state[action.participanteId] === action.celda) {
        return state; // sin cambio real: evita un re-render innecesario incluso de la propia fila.
      }
      return { ...state, [action.participanteId]: action.celda };
    case "RESET":
      return action.estadoInicial;
  }
}

/** Diff de un único Participante entre el estado guardado y el estado local actual (Requirement 14.4). */
export interface CambioParcial {
  readonly participanteId: string;
  readonly presente: boolean;
  readonly diasEstudio: number;
}

/**
 * Calcula el diff acumulado (`Map<participanteId, CambioParcial>`) entre
 * `estadoGuardado` (último estado sincronizado con el servidor) y
 * `estadoActual` (estado local tras N ediciones del Maestro). Solo
 * incluye entradas cuyo `presente`/`diasEstudio` cambió efectivamente
 * (Requirement 14.4: el DTO consolidado enviado al caso de uso no debe
 * incluir Participantes sin cambios reales).
 */
export function calcularDiff(
  estadoGuardado: GridState,
  estadoActual: GridState
): ReadonlyMap<string, CambioParcial> {
  const diff = new Map<string, CambioParcial>();
  for (const [participanteId, celdaActual] of Object.entries(estadoActual)) {
    const celdaGuardada = estadoGuardado[participanteId];
    const cambio =
      celdaGuardada === undefined ||
      celdaGuardada.presente !== celdaActual.presente ||
      celdaGuardada.diasEstudio !== celdaActual.diasEstudio;
    if (cambio) {
      diff.set(participanteId, { participanteId, ...celdaActual });
    }
  }
  return diff;
}

/**
 * Calculadora pura del indicador de deserción de los Participantes de una
 * Unidad_Accion, a partir de una secuencia de sus Registros_Sabaticos.
 *
 * Fuente normativa:
 * - Requirement 11.6: "THE Modulo_Dashboard SHALL calcular el indicador de
 *   deserción de un Participante como la ausencia registrada en tres o más
 *   Registros_Sabaticos consecutivos de su Unidad_Accion."
 * - Requirement 11.7: "THE Modulo_Dashboard SHALL basar sus cálculos
 *   exclusivamente en Registros_Sabaticos con `estado=cerrado`..." — esta
 *   función NO filtra por `estado`: asume que el llamador (el caso de uso
 *   `consultar-dashboard`, tarea 22.3) ya le entrega únicamente Registros
 *   con `estado=cerrado` de una única Unidad_Accion. Filtrar por estado y
 *   por Unidad_Accion es una responsabilidad de la consulta al repositorio
 *   en la capa de Aplicación, no de este cálculo puro de dominio.
 * - Diseño (design.md), Property 31 — "Cálculo de deserción": "Para todo
 *   Participante y toda secuencia de Registros_Sabaticos cerrados y
 *   consecutivos de su Unidad_Accion, el indicador de deserción SHALL ser
 *   verdadero si y solo si el Participante está registrado como ausente en
 *   tres o más de esos registros consecutivos."
 *
 * ## Qué cuenta como "ausente" en un Registro_Sabatico dado
 * Un Participante se considera ausente en un Registro_Sabatico cuando su
 * entrada en el mapa `asistencia` tiene `presente=false`, **o cuando no
 * tiene ninguna entrada en ese mapa**. Ambos casos se tratan igual: la
 * ausencia de un registro de asistencia para un Participante en un sábado
 * dado no es evidencia de presencia, así que no debe tratarse de forma más
 * benigna que una ausencia explícita.
 *
 * ## Cómo se determina la "consecutividad"
 * "Consecutivo" no tiene significado sin un orden total bien definido, y no
 * puede asumirse que el arreglo de entrada llegue ya ordenado (el llamador
 * puede entregarlo en el orden en que el repositorio los devolvió, p.ej.
 * por ID de documento). Por lo tanto esta función **siempre reordena
 * defensivamente** su entrada por la secuencia cronológica del
 * `Sabado_Eclesiastico` de cada Registro — `(anio, numeroTrimestre,
 * numeroSabado)`, en ese orden de prioridad — antes de evaluar cualquier
 * racha de ausencias. `numeroSabado` por sí solo no sirve como clave de
 * orden global porque se reinicia a 1 en cada Trimestre (Requirement 20.2).
 *
 * Dos Registros son "consecutivos" cuando son adyacentes en esa secuencia
 * ordenada, es decir, no hay ningún otro Registro de la misma Unidad_Accion
 * entre ambos dentro del arreglo recibido. Esta función NO exige además que
 * `numeroSabado` sea correlativo sin huecos: si un sábado del periodo nunca
 * llegó a cerrarse, simplemente no existe un Registro_Sabatico `cerrado`
 * para él y por lo tanto no aparece en la entrada de esta función (ver
 * Requirement 11.7 y Property 32); los dos Registros cerrados que quedan
 * inmediatamente antes y después de ese hueco se consideran consecutivos
 * entre sí a efectos de este cálculo.
 *
 * ## El umbral de tres o más
 * Se recorre la secuencia ordenada acumulando una racha de ausencias
 * consecutivas por Participante; la racha se reinicia a cero en cualquier
 * Registro donde el Participante esté presente. Un Participante queda
 * marcado con deserción=true en cuanto su racha alcanza 3 en cualquier
 * punto de la secuencia (no exige que la racha termine exactamente en 3;
 * una racha de 4, 5, etc. también satisface "tres o más").
 *
 * ## Forma de la API: cálculo en bloque para toda la Unidad_Accion
 * Se expone `calcularDesercion`, que recibe la secuencia completa de
 * Registros de una Unidad_Accion y devuelve de una sola pasada el conjunto
 * de todos los `participanteId` con deserción=true. Se prefiere esta forma
 * en bloque sobre una que reciba un único `participanteId` porque:
 * - El Dashboard (tarea 22.3) necesita el indicador para todos los
 *   Participantes de cada Unidad_Accion que reporta, no para uno a la vez;
 *   la forma en bloque ordena y recorre los Registros una sola vez para
 *   todos ellos, en vez de repetir el ordenamiento por Participante.
 * - Sigue siendo trivial de usar para un único Participante:
 *   `calcularDesercion(registros).has(participanteId)`.
 *
 * Validates: Requirements 11.6
 */

/** Umbral mínimo de ausencias consecutivas que constituye deserción. */
const UMBRAL_DESERCION = 3;

/**
 * Forma mínima de solo lectura, por Participante, requerida para
 * determinar ausencia en un Registro_Sabatico. Deliberadamente más angosta
 * que `AsistenciaParticipante` (design.md): solo expone el booleano que
 * participa en este cálculo.
 */
export interface AsistenciaParaDesercion {
  readonly presente: boolean;
}

/**
 * Subconjunto de `SabadoEclesiastico` (domain/value-objects) suficiente
 * para establecer el orden cronológico entre Registros_Sabaticos de una
 * misma Unidad_Accion.
 */
export interface SabadoParaOrden {
  readonly anio: number;
  readonly numeroTrimestre: 1 | 2 | 3 | 4;
  readonly numeroSabado: number;
}

/**
 * Forma mínima de solo lectura de un Registro_Sabatico requerida para
 * calcular deserción. Se asume ya filtrado a `estado=cerrado` y a una
 * única Unidad_Accion por el llamador (Requirement 11.7); ver comentario de
 * módulo.
 */
export interface RegistroParaDesercion {
  readonly sabadoEclesiastico: SabadoParaOrden;
  readonly asistencia: Readonly<Record<string, AsistenciaParaDesercion>>;
}

/**
 * Calcula el conjunto de `participanteId` en deserción (ausentes en tres o
 * más Registros_Sabaticos consecutivos) dentro de `registros`.
 *
 * Función total y pura: para cualquier arreglo de entrada (incluido el
 * vacío) devuelve un `ReadonlySet` definido, sin lanzar excepciones ni
 * depender de Firebase/Next.js. No muta `registros` ni ninguno de sus
 * elementos.
 *
 * @param registros Registros_Sabaticos `cerrado` de una única
 *   Unidad_Accion, en cualquier orden (se reordenan internamente por
 *   cronología del Sabado_Eclesiastico).
 */
export function calcularDesercion(
  registros: ReadonlyArray<RegistroParaDesercion>
): ReadonlySet<string> {
  const ordenados = ordenarPorSabadoEclesiastico(registros);

  const participanteIds = new Set<string>();
  for (const registro of ordenados) {
    for (const participanteId of Object.keys(registro.asistencia)) {
      participanteIds.add(participanteId);
    }
  }

  const enDesercion = new Set<string>();
  const rachaActual = new Map<string, number>();

  for (const registro of ordenados) {
    for (const participanteId of participanteIds) {
      const ausente = esAusenteEnRegistro(registro, participanteId);
      const racha = ausente ? (rachaActual.get(participanteId) ?? 0) + 1 : 0;
      rachaActual.set(participanteId, racha);

      if (racha >= UMBRAL_DESERCION) {
        enDesercion.add(participanteId);
      }
    }
  }

  return enDesercion;
}

/**
 * Un Participante está ausente en un Registro cuando su entrada tiene
 * `presente=false`, o cuando no tiene ninguna entrada en el mapa
 * `asistencia` de ese Registro (ver comentario de módulo).
 */
function esAusenteEnRegistro(
  registro: RegistroParaDesercion,
  participanteId: string
): boolean {
  return registro.asistencia[participanteId]?.presente !== true;
}

/**
 * Reordena defensivamente por cronología del Sabado_Eclesiastico:
 * `(anio, numeroTrimestre, numeroSabado)`, en ese orden de prioridad.
 * No muta el arreglo de entrada.
 */
function ordenarPorSabadoEclesiastico(
  registros: ReadonlyArray<RegistroParaDesercion>
): ReadonlyArray<RegistroParaDesercion> {
  return [...registros].sort((a, b) => {
    const sabadoA = a.sabadoEclesiastico;
    const sabadoB = b.sabadoEclesiastico;

    if (sabadoA.anio !== sabadoB.anio) {
      return sabadoA.anio - sabadoB.anio;
    }
    if (sabadoA.numeroTrimestre !== sabadoB.numeroTrimestre) {
      return sabadoA.numeroTrimestre - sabadoB.numeroTrimestre;
    }
    return sabadoA.numeroSabado - sabadoB.numeroSabado;
  });
}

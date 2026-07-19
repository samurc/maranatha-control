/**
 * Calculadora pura de los `Totales_Rapidos` (presentes/ausentes/visitas) de
 * un `Registro_Sabatico`, a partir del mapa de asistencia de sus
 * Participantes.
 *
 * Fuente normativa:
 * - Requirement 7.6: "WHEN se registra `presente=true` para un Participante
 *   THEN el Sistema SHALL incrementar `presentes` en `totales_rapidos`; en
 *   caso contrario SHALL incrementar `ausentes`."
 * - Requirement 7.7: "WHEN se registra un Participante con `es_visita=true`
 *   como `presente=true` THEN el Sistema SHALL incrementar `visitas` en
 *   `totales_rapidos`."
 * - Requirement 7.10: "el Sistema SHALL garantizar que `presentes` +
 *   `ausentes` sea igual al número de entradas en el mapa `asistencia`, y
 *   que `visitas` sea igual al número de entradas con `es_visita=true` y
 *   `presente=true`."
 * - Diseño (design.md, `TotalesRapidos`):
 *   `interface TotalesRapidos { presentes: number; ausentes: number; visitas: number; }`
 *
 * Decisión de forma de entrada (`esVisita` no vive en `AsistenciaParticipante`):
 * El diseño modela `RegistroSabatico.asistencia` como
 * `Record<participanteId, AsistenciaParticipante>`, y `AsistenciaParticipante`
 * (design.md) solo contiene `presente`/`diasEstudio`/`autorregistrado`/
 * `codigoVisual`/`seguimientoPastoral` — no `esVisita`. El atributo
 * `esVisita` pertenece a la entidad `Participante` (colección separada), no
 * a la fotografía de asistencia de un sábado puntual. Por lo tanto esta
 * función pura de dominio recibe la forma mínima de solo lectura que
 * necesita para satisfacer el invariante contable exacto de Requirement
 * 7.10 — `presente` y `esVisita` por Participante — y deja a cargo de la
 * capa de Aplicación el "join" entre `AsistenciaParticipante` (del
 * `RegistroSabatico`) y `Participante.esVisita` (de su propia colección)
 * antes de invocarla. Esto mantiene la función total, pura y sin
 * dependencias de infraestructura, evitando acoplarla prematuramente a la
 * forma completa de `AsistenciaParticipante` (aún no construida — ver
 * tareas 6.x/16.x) o a `Participante` (tarea 14.x).
 *
 * Validates: Requirements 7.6, 7.7, 7.10
 */

/** Totales rápidos agregados de un `Registro_Sabatico` (design.md `TotalesRapidos`). */
export interface TotalesRapidos {
  readonly presentes: number;
  readonly ausentes: number;
  readonly visitas: number;
}

/**
 * Forma mínima de solo lectura, por Participante, requerida para calcular
 * `TotalesRapidos`. Deliberadamente más angosta que `AsistenciaParticipante`
 * (design.md): solo expone los dos booleanos que participan en el
 * invariante contable de Requirement 7.10.
 */
export interface AsistenciaParaTotales {
  readonly presente: boolean;
  readonly esVisita: boolean;
}

/**
 * Calcula `presentes`, `ausentes` y `visitas` a partir del mapa de
 * asistencia de un `Registro_Sabatico`.
 *
 * Función total y pura: para cualquier `Record` de entrada (incluido el
 * mapa vacío) devuelve un `TotalesRapidos` definido, sin lanzar excepciones
 * ni depender de Firebase/Next.js.
 *
 * Por construcción, para toda entrada:
 * - `presentes + ausentes === Object.keys(asistencia).length` (Requirement
 *   7.10, primera mitad): cada entrada del mapa incrementa exactamente uno
 *   de los dos contadores, nunca ambos ni ninguno, porque la rama se decide
 *   por el único booleano `presente` (Requirement 7.6).
 * - `visitas === número de entradas con esVisita && presente` (Requirement
 *   7.10, segunda mitad; Requirement 7.7): `visitas` se incrementa
 *   únicamente cuando ambos booleanos son verdaderos a la vez.
 */
export function calcularTotalesRapidos(
  asistencia: Readonly<Record<string, AsistenciaParaTotales>>
): TotalesRapidos {
  let presentes = 0;
  let ausentes = 0;
  let visitas = 0;

  for (const { presente, esVisita } of Object.values(asistencia)) {
    if (presente) {
      presentes += 1;
      if (esVisita) {
        visitas += 1;
      }
    } else {
      ausentes += 1;
    }
  }

  return { presentes, ausentes, visitas };
}

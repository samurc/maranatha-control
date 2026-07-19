/**
 * Calculadora pura del `Codigo_Visual` de un Participante dentro de un
 * Registro_Sabatico, a partir de `presente` / `diasEstudio` / `esVisita`.
 *
 * Fuente normativa y su ambigüedad:
 * - Glosario (requirements.md): "Codigo_Visual: Código abreviado calculado a
 *   partir de la asistencia y el estudio diario de un Participante (por
 *   ejemplo 'P7', 'F') usado para visualización rápida en la grilla."
 * - Diseño (design.md, `AsistenciaParticipante.codigoVisual`):
 *   `codigoVisual: string; // "P7", "A", "F", "V"...`
 *
 * Ninguno de los dos documentos define la regla carácter por carácter; solo
 * enumeran cuatro códigos de ejemplo: "P7", "A", "F", "V". Se infiere la
 * regla más fiel a esos cuatro ejemplos observando que un Participante tiene
 * exactamente dos atributos booleanos relevantes (`presente`, `esVisita`) más
 * `diasEstudio`, es decir 4 combinaciones booleanas — el mismo número de
 * ejemplos provistos. Se adopta entonces una correspondencia 1 a 1 que usa
 * cada ejemplo exactamente una vez, sin redundancia entre "F" y "A":
 *
 *   presente=true,  esVisita=false -> "P" + diasEstudio  (p.ej. "P7", "P0")
 *     Miembro regular presente: el código expone además sus días de
 *     estudio, tal como indica el glosario ("P7").
 *   presente=true,  esVisita=true  -> "V"
 *     Visita presente ("Visita"). No se le antepone `diasEstudio`: una
 *     visita ocasional no tiene un seguimiento de estudio diario
 *     significativo para la visualización rápida de la grilla.
 *   presente=false, esVisita=false -> "F"
 *     Miembro regular ausente ("Falta").
 *   presente=false, esVisita=true  -> "A"
 *     Visita ausente ("Ausente"). Se usa un código distinto de "F" para no
 *     tratar la inasistencia de una visita igual que la de un miembro
 *     regular comprometido con la Unidad_Accion.
 *
 * Esta interpretación cubre exhaustivamente las 4 combinaciones booleanas de
 * (`presente`, `esVisita`) y es la que determina el resultado esperado por
 * la Property 22 ("Recalculo de código visual y totales tras actualización",
 * design.md) para cualquier entrada válida.
 *
 * Validates: Requirements 7.2
 */

/** Entrada pura requerida para calcular el `Codigo_Visual`. */
export interface CalcularCodigoVisualInput {
  readonly presente: boolean;
  readonly diasEstudio: number;
  readonly esVisita: boolean;
}

/**
 * Calcula el `Codigo_Visual` de un Participante. Función total y pura: para
 * cualquier combinación válida de `presente`/`esVisita` (y cualquier
 * `diasEstudio` entero, típicamente 0..7) devuelve un código definido.
 */
export function calcularCodigoVisual(
  input: CalcularCodigoVisualInput
): string {
  const { presente, diasEstudio, esVisita } = input;

  if (presente && !esVisita) {
    return `P${diasEstudio}`;
  }

  if (presente && esVisita) {
    return "V";
  }

  if (!presente && esVisita) {
    return "A";
  }

  return "F";
}

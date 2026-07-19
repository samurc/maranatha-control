/**
 * Validador puro de `dias_estudio` (`diasEstudio`) de un Participante
 * dentro de un Registro_Sabatico.
 *
 * Fuente normativa:
 * - Requirement 7.5: "IF `dias_estudio` enviado para un Participante está
 *   fuera del rango 0 a 7, THEN THE Modulo_Registro_Sabatico SHALL
 *   rechazar la operación y retornar un error de validación."
 * - design.md, `AsistenciaParticipante.diasEstudio: number; // 0..7`.
 *
 * El rango es entero e inclusivo: los enteros 0, 1, ..., 7 son válidos;
 * cualquier valor no entero (incluye `NaN`/`Infinity`), negativo, o mayor a
 * 7 es inválido.
 *
 * Validates: Requirements 7.5
 */

import { type Result, ok, err } from "../shared/result";
import { type DomainError, validationError } from "../shared/domain-error";

const MIN_DIAS_ESTUDIO = 0;
const MAX_DIAS_ESTUDIO = 7;

/**
 * Valida que `valor` sea un entero dentro del rango inclusivo
 * [0, 7]. Función pura y total: nunca lanza excepciones, siempre retorna
 * un `Result`.
 *
 * @param valor Cantidad de días de estudio a validar.
 */
export function validarDiasEstudio(
  valor: number
): Result<number, DomainError> {
  if (
    !Number.isInteger(valor) ||
    valor < MIN_DIAS_ESTUDIO ||
    valor > MAX_DIAS_ESTUDIO
  ) {
    return err(
      validationError("dias_estudio debe ser un entero entre 0 y 7.", [
        { path: "diasEstudio", message: "Debe ser un entero entre 0 y 7." },
      ])
    );
  }

  return ok(valor);
}

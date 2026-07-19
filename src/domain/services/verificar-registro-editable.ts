/**
 * Guarda de estado editable de un Registro_Sabatico.
 *
 * Fuente normativa:
 * - Requirements 7.4, 8.4, 9.4, 10.5 (variantes de "mientras
 *   `estado=cerrado`, rechazar la mutación de X").
 * - design.md, Property 19 ("Inmutabilidad del Registro_Sabatico cerrado"):
 *   "Para todo Registro_Sabatico con `estado=cerrado`, todo intento de
 *   modificar la asistencia, el `dias_estudio`, o de crear/modificar un
 *   Seguimiento_Pastoral asociado SHALL ser rechazado con un error de
 *   estado inválido, excepto la operación explícita de reapertura
 *   ejecutada por un Secretario o Admin_Global."
 *
 * Esta guarda está pensada para ser invocada por los casos de uso que
 * mutan asistencia/dias_estudio/Seguimiento_Pastoral (p. ej. las tareas
 * 16.4, 19.1, 20.1) ANTES de aplicar la mutación. La excepción de
 * reapertura mencionada en la Propiedad 19 NO se modela aquí: reabrir un
 * Registro_Sabatico (`cerrado` -> `borrador`) es un caso de uso propio y
 * dedicado (`reabrir-registro-sabatico.use-case.ts`, tarea 18.2) que
 * transiciona el estado directamente, sin pasar por esta guarda. Por lo
 * tanto esta función no necesita (ni debe) tener un caso especial para
 * "reapertura": simplemente no se la invoca desde ese caso de uso.
 *
 * Validates: Requirements 7.4, 8.4, 9.4, 10.5
 */

import { type Result, ok, err } from "../shared/result";
import { type DomainError, conflictError } from "../shared/domain-error";

/**
 * Forma mínima de entrada requerida por esta guarda: solo necesita conocer
 * el `estado` del Registro_Sabatico. Si en el futuro existe una entidad
 * `RegistroSabatico` completa en el dominio, esta guarda puede aceptarla
 * también, ya que únicamente lee el campo `estado`.
 */
export interface RegistroEditableInput {
  readonly estado: "borrador" | "cerrado";
}

/**
 * Verifica que un Registro_Sabatico admita mutaciones (asistencia,
 * `dias_estudio`, o Seguimiento_Pastoral). Función pura y total: nunca
 * lanza excepciones, siempre retorna un `Result`.
 *
 * - `estado="borrador"` -> editable: `ok(undefined)`.
 * - `estado="cerrado"` -> no editable: `err(conflictError(...))`.
 *
 * @param registro Registro_Sabatico (o forma mínima equivalente) a verificar.
 */
export function verificarRegistroEditable(
  registro: RegistroEditableInput
): Result<void, DomainError> {
  if (registro.estado === "cerrado") {
    return err(
      conflictError(
        "El Registro_Sabatico está cerrado y no puede modificarse. " +
          "Un Secretario o Admin_Global debe reabrirlo antes de continuar."
      )
    );
  }

  return ok(undefined);
}

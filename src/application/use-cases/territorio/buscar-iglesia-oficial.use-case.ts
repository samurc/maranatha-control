/**
 * `buscar-iglesia-oficial.use-case.ts` (Requerimiento 4.2, 4.3, 4.4, tarea
 * 11.1).
 *
 * Consume `SearchChurchPort` (implementado en producción por
 * `SearchChurchHttpAdapter`, tarea 28.1; en pruebas por
 * `InMemorySearchChurchPort`, tarea 8.4) y mapea cada resultado a un
 * borrador de Iglesia con `id_oficial`, `nombre` y `pais_codigo` idénticos
 * a los del resultado (Requirement 4.2, Property 12).
 *
 * Este caso de uso es de solo lectura (no persiste nada ni registra
 * auditoría: buscar no es una mutación), por lo que NO usa el wrapper
 * `ejecutarCasoDeUso` (diseñado para el esqueleto canónico de mutación
 * validación→autorización→dominio→persistencia→auditoría). En su lugar
 * aplica manualmente los dos primeros pasos (validación Zod, luego
 * `canPerform`) y traduce cualquier excepción del puerto de
 * infraestructura (incluyendo `SearchChurchTimeoutError`, Requirement 4.3)
 * a un `DomainError`, preservando la misma garantía de no lanzar
 * excepciones hacia la capa de Presentación (Requirement 17.3).
 *
 * Validates: Requirements 4.2, 4.3, 4.4
 */

import {
  type Result,
  type DomainError,
  ok,
  err,
  validationError,
  authorizationError,
  internalError,
} from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import { BuscarIglesiaOficialSchema } from "../../dto/search-church.schema";
import type { IglesiaOficial, SearchChurchPort } from "../../ports/search-church.port";
import { SearchChurchTimeoutError } from "../../ports/search-church.port";

export interface BuscarIglesiaOficialDeps {
  readonly searchChurch: SearchChurchPort;
}

/** Borrador de Iglesia prellenado a partir de un resultado de SearchChurch (Requirement 4.2). */
export type BorradorIglesia = IglesiaOficial;

export function crearBuscarIglesiaOficialUseCase(
  deps: BuscarIglesiaOficialDeps
) {
  return async function execute(
    actorClaims: CustomClaims,
    input: unknown
  ): Promise<Result<readonly BorradorIglesia[], DomainError>> {
    const dto = BuscarIglesiaOficialSchema.safeParse(input);
    if (!dto.success) {
      return err(
        validationError(
          "El criterio de búsqueda no cumple con el esquema esperado.",
          dto.error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          }))
        )
      );
    }

    // Requirement 4.4: únicamente admin_global y admin_asociacion pueden
    // invocar la búsqueda de SearchChurch. Este recurso no tiene una
    // representación propia en PERMISSION_MATRIX (no es un recurso de
    // dominio persistido), por lo que la restricción de rol se aplica
    // aquí directamente en vez de delegar en `canPerform`.
    if (
      actorClaims.role !== "admin_global" &&
      actorClaims.role !== "admin_asociacion"
    ) {
      return err(authorizationError());
    }

    try {
      const resultados = await deps.searchChurch.buscar(dto.data.criterio);
      return ok(
        resultados.map((resultado) => ({
          idOficial: resultado.idOficial,
          nombre: resultado.nombre,
          paisCodigo: resultado.paisCodigo,
        }))
      );
    } catch (error) {
      if (error instanceof SearchChurchTimeoutError) {
        return err({
          kind: "conflicto",
          message:
            "El servicio SearchChurch no respondió a tiempo. Puede registrar la Iglesia manualmente.",
        });
      }
      console.error("[application] error de infraestructura capturado:", error);
      return err(internalError());
    }
  };
}

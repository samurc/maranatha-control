/**
 * `listar-unidades-por-maestro.use-case.ts` (Requerimiento 5.6, tarea
 * 13.3, Property 15).
 *
 * Retorna exactamente el subconjunto de Unidades_Accion cuyo `maestroUid`
 * coincide con el `uid` del token del Maestro solicitante, y ningún
 * elemento adicional. Caso de uso de solo lectura: no usa el wrapper
 * `ejecutarCasoDeUso` (reservado a mutaciones), pero sigue devolviendo un
 * `Result` para preservar la garantía de no lanzar excepciones de negocio
 * (Requirement 17.3).
 *
 * Validates: Requirements 5.6
 */

import {
  type Result,
  type DomainError,
  ok,
  err,
  validationError,
  authorizationError,
} from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  ListarUnidadesPorMaestroSchema,
} from "../../dto/unidades.schema";
import type { UnidadAccion } from "../../../domain/entities/unidad-accion.entity";
import type { UnidadAccionRepositoryPort } from "../../ports/unidad-accion.repository.port";

export interface ListarUnidadesPorMaestroDeps {
  readonly unidades: UnidadAccionRepositoryPort;
}

export function crearListarUnidadesPorMaestroUseCase(
  deps: ListarUnidadesPorMaestroDeps
) {
  return async function execute(
    actorClaims: CustomClaims,
    input: unknown
  ): Promise<Result<readonly UnidadAccion[], DomainError>> {
    const dto = ListarUnidadesPorMaestroSchema.safeParse(input);
    if (!dto.success) {
      return err(
        validationError(
          "El DTO de entrada no cumple con el esquema esperado.",
          dto.error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          }))
        )
      );
    }

    // Requirement 5.6: un Maestro solo puede consultar sus propias
    // Unidades ("mis Unidades"); no puede suplantar a otro maestroUid.
    if (
      actorClaims.role !== "admin_global" &&
      dto.data.maestroUid !== actorClaims.uid
    ) {
      return err(authorizationError());
    }

    const unidades = await deps.unidades.listByMaestro(dto.data.maestroUid);
    return ok(unidades);
  };
}

/**
 * `eliminar-datos-participante.use-case.ts` (Requerimiento 21.3, 21.4,
 * tarea 24.1, Property 52, 53).
 *
 * Elimina permanentemente los datos personales de un Participante: tras
 * completarse la operación, ningún dato personal de ese Participante
 * persiste en el Sistema (Property 52). Restringido exclusivamente a
 * `admin_global` (Requirement 21.4, Property 53). Registra un evento de
 * auditoría (Requirement 21.3).
 *
 * Validates: Requirements 21.3, 21.4
 */

import { canPerform } from "../../../domain/rbac/rbac-engine";
import {
  type Result,
  type DomainError,
  ok,
  err,
  validationError,
  authorizationError,
  notFoundError,
} from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import { EliminarDatosParticipanteSchema } from "../../dto/privacidad.schema";
import type { ParticipanteRepositoryPort } from "../../ports/participante.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";

export interface EliminarDatosParticipanteDeps {
  readonly participantes: ParticipanteRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

export interface DatosParticipanteEliminados {
  readonly participanteId: string;
}

export function crearEliminarDatosParticipanteUseCase(
  deps: EliminarDatosParticipanteDeps
) {
  return async function execute(
    actorClaims: CustomClaims,
    input: unknown
  ): Promise<Result<DatosParticipanteEliminados, DomainError>> {
    const dto = EliminarDatosParticipanteSchema.safeParse(input);
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

    if (!canPerform(actorClaims, "datos_personales", "eliminar", {})) {
      return err(authorizationError());
    }

    const participante = await deps.participantes.findById(
      dto.data.participanteId
    );
    if (participante === null) {
      return err(
        notFoundError(
          `El Participante "${dto.data.participanteId}" no existe.`,
          dto.data.participanteId
        )
      );
    }

    await deps.participantes.delete(participante.id);

    await registrarEventoAuditoria(deps.auditoria)({
      uid: actorClaims.uid,
      accion: "eliminar_datos_participante",
      recursoAfectado: participante.id,
      iglesiaId: participante.iglesiaId,
    });

    return ok({ participanteId: participante.id });
  };
}

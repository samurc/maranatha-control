/**
 * `exportar-datos-participante.use-case.ts` (Requerimiento 21.3, 21.4,
 * tarea 24.1, Property 52, 53).
 *
 * Compila exactamente los campos personales almacenados de un
 * Participante (Property 52). Restringido exclusivamente a
 * `admin_global` (Requirement 21.4, Property 53; el recurso
 * `datos_personales` en `PERMISSION_MATRIX` solo tiene fila para
 * `admin_global`). Registra un evento de auditoría (Requirement 21.3).
 *
 * No usa el wrapper `ejecutarCasoDeUso` completo (no hay "creación" de un
 * nuevo recurso que persistir vía `save`; la "persistencia" de esta
 * operación es simplemente producir el export), pero SÍ reutiliza
 * `registrarEventoAuditoria` para mantener el mismo contrato de
 * auditoría que el resto del Sistema.
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
import {
  ExportarDatosParticipanteSchema,
} from "../../dto/privacidad.schema";
import type { Participante } from "../../../domain/entities/participante.entity";
import type { ParticipanteRepositoryPort } from "../../ports/participante.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";

export interface ExportarDatosParticipanteDeps {
  readonly participantes: ParticipanteRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

export function crearExportarDatosParticipanteUseCase(
  deps: ExportarDatosParticipanteDeps
) {
  return async function execute(
    actorClaims: CustomClaims,
    input: unknown
  ): Promise<Result<Participante, DomainError>> {
    const dto = ExportarDatosParticipanteSchema.safeParse(input);
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

    if (!canPerform(actorClaims, "datos_personales", "leer", {})) {
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

    await registrarEventoAuditoria(deps.auditoria)({
      uid: actorClaims.uid,
      accion: "exportar_datos_participante",
      recursoAfectado: participante.id,
      iglesiaId: participante.iglesiaId,
    });

    return ok(participante);
  };
}

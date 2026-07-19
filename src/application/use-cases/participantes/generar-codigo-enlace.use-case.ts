/**
 * `generar-codigo-enlace.use-case.ts` (Requerimiento 6.7, tarea 14.6).
 *
 * Emite un código de enlace de un solo uso para un Participante sin
 * `userUid`, que un futuro Alumno canjeará (`canjear-codigo-enlace.use-case.ts`,
 * mismo archivo de tarea) para vincular su cuenta (Requirement 1.7, 1.8).
 * Secretario/Maestro/Admin_Global sobre su propia `iglesia_id`
 * (`PERMISSION_MATRIX`: misma fila de `actualizar` sobre `participante`
 * que el resto de mutaciones operativas de este recurso).
 *
 * Regla de dominio adicional: el Participante objetivo debe existir y no
 * tener ya un `userUid` vinculado (de lo contrario, generar un nuevo
 * código sería contradictorio con Requirement 1.7 — el código vincula "un
 * Participante sin `user_uid`"), en cuyo caso se rechaza con conflicto.
 *
 * Validates: Requirements 6.7
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import { conflictError, notFoundError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  GenerarCodigoEnlaceSchema,
  type GenerarCodigoEnlaceDto,
} from "../../dto/participantes.schema";
import type { Participante } from "../../../domain/entities/participante.entity";
import type { ParticipanteRepositoryPort } from "../../ports/participante.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import type { ClockPort } from "../../ports/clock.port";

export interface GenerarCodigoEnlaceDeps {
  readonly participantes: ParticipanteRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
  readonly clock: ClockPort;
  readonly generarCodigo?: () => string;
}

export function crearGenerarCodigoEnlaceUseCase(
  deps: GenerarCodigoEnlaceDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<GenerarCodigoEnlaceDto, Participante>(
      {
        schema: GenerarCodigoEnlaceSchema,
        resource: "participante",
        operation: "actualizar",
        scopeOf: () => ({}),
        canPerform: (claims, resource, operation) =>
          claims.role === "admin_global"
            ? canPerform(claims, resource, operation, {})
            : canPerform(claims, resource, operation, {
                iglesiaId: claims.iglesiaId,
              }),
        applyDomainRule: async (data, actor) => {
          const participante = await deps.participantes.findById(
            data.participanteId
          );
          if (participante === null) {
            return err(
              notFoundError(
                `El Participante "${data.participanteId}" no existe.`,
                data.participanteId
              )
            );
          }
          if (
            actor.role !== "admin_global" &&
            participante.iglesiaId !== actor.iglesiaId
          ) {
            return err(
              notFoundError(
                `El Participante "${data.participanteId}" no existe.`,
                data.participanteId
              )
            );
          }
          if (participante.userUid !== undefined) {
            return err(
              conflictError(
                "El Participante ya tiene una cuenta de Alumno vinculada."
              )
            );
          }
          return ok<Participante>({
            ...participante,
            codigoEnlace: {
              codigo: (deps.generarCodigo ?? crypto.randomUUID)(),
              usado: false,
              emitidoPor: actor.uid,
              emitidoEn: deps.clock.now(),
            },
          });
        },
        save: (value) => deps.participantes.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "generar_codigo_enlace",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

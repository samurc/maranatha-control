/**
 * `actualizar-estado-participante.use-case.ts` (Requerimiento 6.4, tarea
 * 14.3).
 *
 * Marca el `estado` de un Participante como `inactivo` (o `activo`),
 * excluyéndolo de futuros Registros_Sabaticos generados a partir de ese
 * momento (esa exclusión la implementa `registrar-asistencia.use-case.ts`,
 * tarea 16.1, Property 17, filtrando por `estado=activo` al crear el
 * Registro; este caso de uso solo persiste la transición de estado).
 *
 * Validates: Requirements 6.4
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import { notFoundError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  ActualizarEstadoParticipanteSchema,
  type ActualizarEstadoParticipanteDto,
} from "../../dto/participantes.schema";
import type { Participante } from "../../../domain/entities/participante.entity";
import type { ParticipanteRepositoryPort } from "../../ports/participante.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";

export interface ActualizarEstadoParticipanteDeps {
  readonly participantes: ParticipanteRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

export function crearActualizarEstadoParticipanteUseCase(
  deps: ActualizarEstadoParticipanteDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<ActualizarEstadoParticipanteDto, Participante>(
      {
        schema: ActualizarEstadoParticipanteSchema,
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
          const participante = await deps.participantes.findById(data.id);
          if (participante === null) {
            return err(
              notFoundError(
                `El Participante "${data.id}" no existe.`,
                data.id
              )
            );
          }
          if (
            actor.role !== "admin_global" &&
            participante.iglesiaId !== actor.iglesiaId
          ) {
            return err(
              notFoundError(
                `El Participante "${data.id}" no existe.`,
                data.id
              )
            );
          }
          return ok<Participante>({ ...participante, estado: data.estado });
        },
        save: (value) => deps.participantes.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "actualizar_estado_participante",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

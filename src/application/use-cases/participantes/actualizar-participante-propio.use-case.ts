/**
 * `actualizar-participante-propio.use-case.ts` (Requerimiento 6.5, 6.6,
 * tarea 14.4).
 *
 * Un Alumno solo edita el Participante vinculado a su propio `userUid`
 * (Requirement 6.5); cualquier intento sobre un Participante cuyo
 * `userUid` no coincide con el `uid` del actor se rechaza con un error de
 * autorización (Requirement 6.6). Los campos editables se limitan a
 * `nombre`/`apellido` (ver `ActualizarParticipantePropioSchema`).
 *
 * No se usa `canPerform` con el `scope` territorial estándar: la fila
 * `"self"` de `PERMISSION_MATRIX` para `participante.actualizar` solo
 * verifica el alcance territorial grueso (`own_iglesia`), no la propiedad
 * exacta del registro — esa verificación de propiedad es la regla de
 * dominio que este caso de uso aplica explícitamente (ver comentario de
 * `ScopeRequirement` en `rbac-engine.ts`).
 *
 * Validates: Requirements 6.5, 6.6
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import { authorizationError, notFoundError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  ActualizarParticipantePropioSchema,
  type ActualizarParticipantePropioDto,
} from "../../dto/participantes.schema";
import type { Participante } from "../../../domain/entities/participante.entity";
import type { ParticipanteRepositoryPort } from "../../ports/participante.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";

export interface ActualizarParticipantePropioDeps {
  readonly participantes: ParticipanteRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

export function crearActualizarParticipantePropioUseCase(
  deps: ActualizarParticipantePropioDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<ActualizarParticipantePropioDto, Participante>(
      {
        schema: ActualizarParticipantePropioSchema,
        resource: "participante",
        operation: "actualizar",
        scopeOf: () => ({ iglesiaId: actorClaims.iglesiaId }),
        canPerform: (claims, resource, operation, scope) =>
          claims.role === "alumno" &&
          canPerform(claims, resource, operation, scope),
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
          // Requirement 6.6: propiedad exacta del registro, no solo
          // alcance territorial grueso.
          if (participante.userUid !== actor.uid) {
            return err(authorizationError());
          }
          return ok<Participante>({
            ...participante,
            nombre: data.nombre ?? participante.nombre,
            apellido: data.apellido ?? participante.apellido,
          });
        },
        save: (value) => deps.participantes.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "actualizar_participante_propio",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

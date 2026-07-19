/**
 * `registrar-seguimiento-pastoral.use-case.ts` (Requerimiento 9.1-9.5,
 * tarea 19.1).
 *
 * Almacena un Seguimiento_Pastoral embebido dentro de
 * `asistencia[participanteId].seguimientoPastoral` del Registro_Sabatico
 * correspondiente, con `accion` restringido al enum {llamado_telefonico,
 * enfermo_oracion, visitado_en_semana} (Requirement 9.2, validado por
 * `AccionSeguimientoPastoralSchema` dentro del propio esquema Zod del DTO,
 * ver `execute-use-case.ts` paso 1). Restringido a Maestro/Admin_Global
 * (Requirement 9.3, `PERMISSION_MATRIX`: única fila de `crear` sobre
 * `seguimiento_pastoral` es `["maestro"], ... "own_iglesia"` más
 * `["admin_global"], ..., "any"`). Regla de dominio adicional (Requirement
 * 9.1): un Maestro solo registra sobre Unidades a su cargo — igual patrón
 * que `registrar-asistencia.use-case.ts` (Requirement 7.3). Guardia de
 * estado editable (Requirement 9.4, Property 19): rechaza si el
 * Registro_Sabatico está `cerrado`.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err, isErr } from "../../../domain/shared";
import { authorizationError, notFoundError } from "../../../domain/shared/domain-error";
import { verificarRegistroEditable } from "../../../domain/services/verificar-registro-editable";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  RegistrarSeguimientoPastoralSchema,
  type RegistrarSeguimientoPastoralDto,
} from "../../dto/seguimiento-pastoral.schema";
import type {
  AsistenciaParticipante,
  RegistroSabatico,
} from "../../../domain/entities/registro-sabatico.entity";
import type { RegistroSabaticoRepositoryPort } from "../../ports/registro-sabatico.repository.port";
import type { UnidadAccionRepositoryPort } from "../../ports/unidad-accion.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import type { ClockPort } from "../../ports/clock.port";

export interface RegistrarSeguimientoPastoralDeps {
  readonly registros: RegistroSabaticoRepositoryPort;
  readonly unidades: UnidadAccionRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
  readonly clock: ClockPort;
}

export function crearRegistrarSeguimientoPastoralUseCase(
  deps: RegistrarSeguimientoPastoralDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<RegistrarSeguimientoPastoralDto, RegistroSabatico>(
      {
        schema: RegistrarSeguimientoPastoralSchema,
        resource: "seguimiento_pastoral",
        operation: "crear",
        scopeOf: () => ({}),
        canPerform: (claims, resource, operation) =>
          claims.role === "admin_global"
            ? canPerform(claims, resource, operation, {})
            : canPerform(claims, resource, operation, {
                iglesiaId: claims.iglesiaId,
              }),
        applyDomainRule: async (data, actor) => {
          const registro = await deps.registros.findById(data.registroId);
          if (registro === null) {
            return err(
              notFoundError(
                `El Registro_Sabatico "${data.registroId}" no existe.`,
                data.registroId
              )
            );
          }
          if (
            actor.role !== "admin_global" &&
            registro.iglesiaId !== actor.iglesiaId
          ) {
            return err(
              notFoundError(
                `El Registro_Sabatico "${data.registroId}" no existe.`,
                data.registroId
              )
            );
          }
          // Requirement 9.1: un Maestro solo registra sobre Unidades a su cargo.
          if (actor.role === "maestro") {
            const unidad = await deps.unidades.findById(registro.unidadId);
            if (unidad === null || unidad.maestroUid !== actor.uid) {
              return err(authorizationError());
            }
          }

          const editable = verificarRegistroEditable(registro);
          if (isErr(editable)) {
            return editable;
          }

          const asistenciaPrevia = registro.asistencia[data.participanteId];
          if (asistenciaPrevia === undefined) {
            return err(
              notFoundError(
                `El Participante "${data.participanteId}" no está registrado en este Registro_Sabatico.`,
                data.participanteId
              )
            );
          }

          const nuevaEntrada: AsistenciaParticipante = {
            ...asistenciaPrevia,
            seguimientoPastoral: [
              ...asistenciaPrevia.seguimientoPastoral,
              {
                accion: data.accion,
                registradoPor: actor.uid,
                registradoEn: deps.clock.now(),
              },
            ],
          };

          return ok<RegistroSabatico>({
            ...registro,
            asistencia: {
              ...registro.asistencia,
              [data.participanteId]: nuevaEntrada,
            },
            actualizadoEn: deps.clock.now(),
          });
        },
        save: (value) => deps.registros.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "registrar_seguimiento_pastoral",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

/**
 * `actualizar-estado-unidad-accion.use-case.ts` (Requerimiento 5.4, tarea
 * 13.2).
 *
 * Transición `activa`/`inactiva` de una Unidad_Accion. `PERMISSION_MATRIX`
 * concede `actualizar` sobre `unidad_accion` únicamente a `secretario`
 * (alcance `own_iglesia`) y `admin_global` (alcance `any`); `maestro` solo
 * tiene `crear` (Requirement 5.4: "Como Secretario"), por lo que
 * `canPerform` rechaza a `maestro` por ausencia de fila.
 *
 * Validates: Requirements 5.4
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import { notFoundError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  ActualizarEstadoUnidadAccionSchema,
  type ActualizarEstadoUnidadAccionDto,
} from "../../dto/unidades.schema";
import type { UnidadAccion } from "../../../domain/entities/unidad-accion.entity";
import type { UnidadAccionRepositoryPort } from "../../ports/unidad-accion.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";

export interface ActualizarEstadoUnidadAccionDeps {
  readonly unidades: UnidadAccionRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

export function crearActualizarEstadoUnidadAccionUseCase(
  deps: ActualizarEstadoUnidadAccionDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<ActualizarEstadoUnidadAccionDto, UnidadAccion>(
      {
        schema: ActualizarEstadoUnidadAccionSchema,
        resource: "unidad_accion",
        operation: "actualizar",
        scopeOf: () => ({}),
        canPerform: (claims, resource, operation) => {
          if (claims.role === "admin_global") {
            return canPerform(claims, resource, operation, {});
          }
          return canPerform(claims, resource, operation, {
            iglesiaId: claims.iglesiaId,
          });
        },
        applyDomainRule: async (data, actor) => {
          const unidad = await deps.unidades.findById(data.id);
          if (unidad === null) {
            return err(
              notFoundError(
                `La Unidad_Accion "${data.id}" no existe.`,
                data.id
              )
            );
          }
          if (actor.role !== "admin_global" && unidad.iglesiaId !== actor.iglesiaId) {
            return err(
              notFoundError(
                `La Unidad_Accion "${data.id}" no existe.`,
                data.id
              )
            );
          }
          return ok<UnidadAccion>({ ...unidad, estado: data.estado });
        },
        save: (value) => deps.unidades.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "actualizar_estado_unidad_accion",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

/**
 * `crear-distrito.use-case.ts` (Requerimiento 2.2, 2.4, tarea 10.1).
 *
 * `admin_global` crea un Distrito para cualquier `asociacion_id`;
 * `admin_asociacion` puede crearlo únicamente si `asociacion_id` coincide
 * con la de su propio token (alcance `"own_asociacion"` en
 * `PERMISSION_MATRIX`, Property 7). La regla de dominio adicional
 * (Requirement 2.4): rechazar con error de validación si la
 * `asociacion_id` referenciada no existe — esta verificación SÍ requiere
 * infraestructura (`asociaciones.findById`), por lo que se resuelve dentro
 * de `applyDomainRule`, no de `canPerform` (que es dominio puro y no
 * conoce el repositorio).
 *
 * Validates: Requirements 2.2, 2.4
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import { validationError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  CrearDistritoSchema,
  type CrearDistritoDto,
} from "../../dto/territorio.schema";
import type { Distrito } from "../../../domain/entities/distrito.entity";
import type { AsociacionRepositoryPort } from "../../ports/asociacion.repository.port";
import type { DistritoRepositoryPort } from "../../ports/distrito.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import type { ClockPort } from "../../ports/clock.port";

export interface CrearDistritoDeps {
  readonly asociaciones: AsociacionRepositoryPort;
  readonly distritos: DistritoRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
  readonly clock: ClockPort;
  readonly generarId?: () => string;
}

export function crearCrearDistritoUseCase(deps: CrearDistritoDeps) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<CrearDistritoDto, Distrito>(
      {
        schema: CrearDistritoSchema,
        resource: "distrito",
        operation: "crear",
        scopeOf: (data) => ({ asociacionId: data.asociacionId }),
        canPerform,
        applyDomainRule: async (data) => {
          const asociacion = await deps.asociaciones.findById(
            data.asociacionId
          );
          if (asociacion === null) {
            return err(
              validationError(
                `La Asociacion_Mision "${data.asociacionId}" no existe.`,
                [{ path: "asociacionId", message: "Asociacion_Mision inexistente." }]
              )
            );
          }
          return ok<Distrito>({
            id: (deps.generarId ?? crypto.randomUUID)(),
            nombre: data.nombre,
            asociacionId: data.asociacionId,
            creadoEn: deps.clock.now(),
          });
        },
        save: (value) => deps.distritos.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "crear_distrito",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

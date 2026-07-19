/**
 * `crear-iglesia.use-case.ts` (Requerimiento 3.1-3.5, tarea 10.4).
 *
 * `admin_global` crea cualquier Iglesia; `admin_asociacion` únicamente si
 * `asociacion_id` coincide con la de su propio token (Property 7,
 * `canPerform` sobre `PERMISSION_MATRIX`). Regla de dominio adicional
 * (Requirement 3.4, Property 8): rechazar con error de validación de
 * duplicado si `id_oficial` ya existe — verificación que requiere el
 * repositorio, por eso vive en `applyDomainRule`, no en `canPerform`.
 * `fecha_alta` se fija al instante de creación (Requirement 3.1),
 * provisto por `ClockPort` (nunca `new Date()` directo).
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import { validationError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  CrearIglesiaSchema,
  type CrearIglesiaDto,
} from "../../dto/territorio.schema";
import type { Iglesia } from "../../../domain/entities/iglesia.entity";
import type { IglesiaRepositoryPort } from "../../ports/iglesia.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import type { ClockPort } from "../../ports/clock.port";

export interface CrearIglesiaDeps {
  readonly iglesias: IglesiaRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
  readonly clock: ClockPort;
}

export function crearCrearIglesiaUseCase(deps: CrearIglesiaDeps) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<CrearIglesiaDto, Iglesia>(
      {
        schema: CrearIglesiaSchema,
        resource: "iglesia",
        operation: "crear",
        scopeOf: (data) => ({ asociacionId: data.asociacionId }),
        canPerform,
        applyDomainRule: async (data) => {
          const existente = await deps.iglesias.findByIdOficial(
            data.idOficial
          );
          if (existente !== null) {
            return err(
              validationError(
                `Ya existe una Iglesia con id_oficial "${data.idOficial}".`,
                [{ path: "idOficial", message: "id_oficial duplicado." }]
              )
            );
          }
          const ahora = deps.clock.now();
          return ok<Iglesia>({
            id: data.idOficial,
            idOficial: data.idOficial,
            nombre: data.nombre,
            asociacionId: data.asociacionId,
            distritoId: data.distritoId,
            paisCodigo: data.paisCodigo,
            timezone: data.timezone,
            fechaAlta: ahora,
            creadoEn: ahora,
          });
        },
        save: (value) => deps.iglesias.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "crear_iglesia",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

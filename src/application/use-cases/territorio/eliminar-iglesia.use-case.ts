/**
 * `eliminar-iglesia.use-case.ts` (Requerimiento 3.8, tarea 10.9, Property
 * 9).
 *
 * Eliminación permanente restringida exclusivamente a `admin_global`
 * (`PERMISSION_MATRIX`: única fila de `eliminar` para `iglesia` es
 * `["admin_global"], "iglesia", ["crear", "actualizar", "eliminar"],
 * "any"`).
 *
 * Validates: Requirements 3.8
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import { notFoundError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  EliminarIglesiaSchema,
  type EliminarIglesiaDto,
} from "../../dto/territorio.schema";
import type { Iglesia } from "../../../domain/entities/iglesia.entity";
import type { IglesiaRepositoryPort } from "../../ports/iglesia.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";

export interface EliminarIglesiaDeps {
  readonly iglesias: IglesiaRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

export function crearEliminarIglesiaUseCase(deps: EliminarIglesiaDeps) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<EliminarIglesiaDto, Iglesia>(
      {
        schema: EliminarIglesiaSchema,
        resource: "iglesia",
        operation: "eliminar",
        scopeOf: () => ({}),
        canPerform,
        applyDomainRule: async (data) => {
          const iglesia = await deps.iglesias.findById(data.id);
          if (iglesia === null) {
            return err(
              notFoundError(`La Iglesia "${data.id}" no existe.`, data.id)
            );
          }
          return ok(iglesia);
        },
        save: async (value) => {
          await deps.iglesias.delete(value.id);
          return value;
        },
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "eliminar_iglesia",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

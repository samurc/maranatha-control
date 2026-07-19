/**
 * `eliminar-registro-sabatico.use-case.ts` (Requerimiento 7.9, tarea 16.6,
 * Property 9).
 *
 * Eliminación permanente restringida exclusivamente a `admin_global`
 * (`PERMISSION_MATRIX`: única fila de `eliminar` para `registro_sabatico`
 * es `["admin_global"], "registro_sabatico", ["crear", "actualizar",
 * "eliminar"], "any"`).
 *
 * Validates: Requirements 7.9
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import { notFoundError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  EliminarRegistroSabaticoSchema,
  type EliminarRegistroSabaticoDto,
} from "../../dto/registro-sabatico.schema";
import type { RegistroSabatico } from "../../../domain/entities/registro-sabatico.entity";
import type { RegistroSabaticoRepositoryPort } from "../../ports/registro-sabatico.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";

export interface EliminarRegistroSabaticoDeps {
  readonly registros: RegistroSabaticoRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

export function crearEliminarRegistroSabaticoUseCase(
  deps: EliminarRegistroSabaticoDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<EliminarRegistroSabaticoDto, RegistroSabatico>(
      {
        schema: EliminarRegistroSabaticoSchema,
        resource: "registro_sabatico",
        operation: "eliminar",
        scopeOf: () => ({}),
        canPerform,
        applyDomainRule: async (data) => {
          const registro = await deps.registros.findById(data.id);
          if (registro === null) {
            return err(
              notFoundError(
                `El Registro_Sabatico "${data.id}" no existe.`,
                data.id
              )
            );
          }
          return ok(registro);
        },
        save: async (value) => {
          await deps.registros.delete(value.id);
          return value;
        },
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "eliminar_registro_sabatico",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

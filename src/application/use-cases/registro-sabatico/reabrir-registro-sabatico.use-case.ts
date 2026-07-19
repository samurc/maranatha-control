/**
 * `reabrir-registro-sabatico.use-case.ts` (Requerimiento 8.3, tarea 18.2,
 * Property 20).
 *
 * Devuelve un Registro_Sabatico `cerrado` a `estado=borrador`. Misma
 * restricción de rol que `cerrar-registro-sabatico.use-case.ts`
 * (Secretario/Admin_Global), aplicada por el mismo motivo (ver comentario
 * de módulo de ese archivo).
 *
 * Validates: Requirements 8.3
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import {
  authorizationError,
  conflictError,
  notFoundError,
} from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  ReabrirRegistroSabaticoSchema,
  type ReabrirRegistroSabaticoDto,
} from "../../dto/registro-sabatico.schema";
import type { RegistroSabatico } from "../../../domain/entities/registro-sabatico.entity";
import type { RegistroSabaticoRepositoryPort } from "../../ports/registro-sabatico.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import type { ClockPort } from "../../ports/clock.port";

export interface ReabrirRegistroSabaticoDeps {
  readonly registros: RegistroSabaticoRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
  readonly clock: ClockPort;
}

export function crearReabrirRegistroSabaticoUseCase(
  deps: ReabrirRegistroSabaticoDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<ReabrirRegistroSabaticoDto, RegistroSabatico>(
      {
        schema: ReabrirRegistroSabaticoSchema,
        resource: "registro_sabatico",
        operation: "actualizar",
        scopeOf: () => ({}),
        canPerform: (claims, resource, operation) =>
          claims.role === "admin_global"
            ? canPerform(claims, resource, operation, {})
            : canPerform(claims, resource, operation, {
                iglesiaId: claims.iglesiaId,
              }),
        applyDomainRule: async (data, actor) => {
          if (actor.role !== "secretario" && actor.role !== "admin_global") {
            return err(authorizationError());
          }
          const registro = await deps.registros.findById(data.id);
          if (registro === null) {
            return err(
              notFoundError(
                `El Registro_Sabatico "${data.id}" no existe.`,
                data.id
              )
            );
          }
          if (
            actor.role === "secretario" &&
            registro.iglesiaId !== actor.iglesiaId
          ) {
            return err(
              notFoundError(
                `El Registro_Sabatico "${data.id}" no existe.`,
                data.id
              )
            );
          }
          if (registro.estado === "borrador") {
            return err(
              conflictError("El Registro_Sabatico ya está en borrador.")
            );
          }
          return ok<RegistroSabatico>({
            ...registro,
            estado: "borrador",
            cerradoPor: undefined,
            fechaCierre: undefined,
            actualizadoEn: deps.clock.now(),
          });
        },
        save: (value) => deps.registros.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "reabrir_registro_sabatico",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

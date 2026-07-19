/**
 * `cerrar-registro-sabatico.use-case.ts` (Requerimiento 8.1, 8.2, tarea
 * 18.1, Property 20).
 *
 * Marca un Registro_Sabatico con `estado=borrador` como `cerrado`,
 * registrando `cerradoPor` (`uid` del actor) y `fechaCierre` (instante del
 * `ClockPort`). Restringido a Secretario/Admin_Global: `PERMISSION_MATRIX`
 * otorga `actualizar` sobre `registro_sabatico` también a `maestro`
 * (misma fila que `crear`), por lo que esta regla de negocio MÁS
 * específica (Requirement 8.2: "IF un Maestro intenta cambiar el `estado`
 * ... SHALL rechazar") se verifica explícitamente en `applyDomainRule`,
 * no delegada a `canPerform` (que no distingue "actualizar asistencia" de
 * "actualizar estado a cerrado", ver comentario de `rbac-engine.ts`).
 *
 * Validates: Requirements 8.1, 8.2
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
  CerrarRegistroSabaticoSchema,
  type CerrarRegistroSabaticoDto,
} from "../../dto/registro-sabatico.schema";
import type { RegistroSabatico } from "../../../domain/entities/registro-sabatico.entity";
import type { RegistroSabaticoRepositoryPort } from "../../ports/registro-sabatico.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import type { ClockPort } from "../../ports/clock.port";

export interface CerrarRegistroSabaticoDeps {
  readonly registros: RegistroSabaticoRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
  readonly clock: ClockPort;
}

export function crearCerrarRegistroSabaticoUseCase(
  deps: CerrarRegistroSabaticoDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<CerrarRegistroSabaticoDto, RegistroSabatico>(
      {
        schema: CerrarRegistroSabaticoSchema,
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
          // Requirement 8.2: exclusivamente Secretario/Admin_Global.
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
          if (registro.estado === "cerrado") {
            return err(
              conflictError("El Registro_Sabatico ya está cerrado.")
            );
          }
          return ok<RegistroSabatico>({
            ...registro,
            estado: "cerrado",
            cerradoPor: actor.uid,
            fechaCierre: deps.clock.now(),
            actualizadoEn: deps.clock.now(),
          });
        },
        save: (value) => deps.registros.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "cerrar_registro_sabatico",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

/**
 * `asignar-supervisor-distrito.use-case.ts` (Requerimiento 2.5, tarea
 * 10.2).
 *
 * Asigna un `user_uid` con rol `pastor_distrital`/`anciano` como
 * supervisor de un Distrito existente. Solo `admin_global` puede hacerlo
 * (Requirement 2.5: "Como Admin_Global"; ninguna fila de
 * `PERMISSION_MATRIX` otorga `actualizar` sobre `distrito` a
 * `admin_asociacion` fuera de `crear`, así que `canPerform` con
 * `operation: "actualizar"` y alcance `"any"` solo resuelve verdadero para
 * `admin_global`).
 *
 * Regla de dominio adicional: el Distrito objetivo debe existir
 * (`no_encontrado` en caso contrario) — verificación que requiere el
 * repositorio y por eso se resuelve en `applyDomainRule`.
 *
 * Validates: Requirements 2.5
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import { notFoundError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  AsignarSupervisorDistritoSchema,
  type AsignarSupervisorDistritoDto,
} from "../../dto/territorio.schema";
import type { Distrito } from "../../../domain/entities/distrito.entity";
import type { DistritoRepositoryPort } from "../../ports/distrito.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";

export interface AsignarSupervisorDistritoDeps {
  readonly distritos: DistritoRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

export function crearAsignarSupervisorDistritoUseCase(
  deps: AsignarSupervisorDistritoDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<AsignarSupervisorDistritoDto, Distrito>(
      {
        schema: AsignarSupervisorDistritoSchema,
        resource: "distrito",
        operation: "actualizar",
        scopeOf: () => ({}),
        canPerform,
        applyDomainRule: async (data) => {
          const distrito = await deps.distritos.findById(data.distritoId);
          if (distrito === null) {
            return err(
              notFoundError(
                `El Distrito "${data.distritoId}" no existe.`,
                data.distritoId
              )
            );
          }
          return ok<Distrito>({ ...distrito, supervisorUid: data.supervisorUid });
        },
        save: (value) => deps.distritos.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "asignar_supervisor_distrito",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

/**
 * `crear-unidad-accion.use-case.ts` (Requerimiento 5.1, 5.2, tarea 13.1).
 *
 * Secretario/Maestro/Admin_Global crean una Unidad_Accion sobre su propia
 * `iglesia_id` (Property 2, Property 14: `director_es`, `pastor_distrital`,
 * `anciano` y `alumno` no tienen ninguna fila de `crear` para
 * `unidad_accion` en `PERMISSION_MATRIX`, por lo que `canPerform` los
 * rechaza por ausencia). `estado=activa` inicial (Requirement 5.1).
 *
 * Validates: Requirements 5.1, 5.2
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  CrearUnidadAccionSchema,
  type CrearUnidadAccionDto,
} from "../../dto/unidades.schema";
import type { UnidadAccion } from "../../../domain/entities/unidad-accion.entity";
import type { UnidadAccionRepositoryPort } from "../../ports/unidad-accion.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import type { ClockPort } from "../../ports/clock.port";

export interface CrearUnidadAccionDeps {
  readonly unidades: UnidadAccionRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
  readonly clock: ClockPort;
  readonly generarId?: () => string;
}

export function crearCrearUnidadAccionUseCase(deps: CrearUnidadAccionDeps) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<CrearUnidadAccionDto, UnidadAccion>(
      {
        schema: CrearUnidadAccionSchema,
        resource: "unidad_accion",
        operation: "crear",
        scopeOf: (data) => ({ iglesiaId: data.iglesiaId }),
        canPerform,
        applyDomainRule: (data) =>
          ok<UnidadAccion>({
            id: (deps.generarId ?? crypto.randomUUID)(),
            iglesiaId: data.iglesiaId,
            nombre: data.nombre,
            maestroUid: data.maestroUid,
            estado: "activa",
            creadoEn: deps.clock.now(),
          }),
        save: (value) => deps.unidades.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "crear_unidad_accion",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

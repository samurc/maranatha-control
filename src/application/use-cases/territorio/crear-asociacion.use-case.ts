/**
 * `crear-asociacion.use-case.ts` (Requerimiento 2.1, 2.3, tarea 10.1).
 *
 * Solo `admin_global` crea una Asociacion_Mision (Requirement 2.3); esto se
 * refleja en `PERMISSION_MATRIX` (tarea 4.1): la única fila de `crear` con
 * alcance `"any"` para el recurso `asociacion` pertenece a `admin_global`
 * (la fila de `admin_asociacion` para `crear` es, por diseño,
 * inalcanzable — ver comentario de `rbac-engine.ts`). No existe regla de
 * negocio adicional más allá de la autorización.
 *
 * Validates: Requirements 2.1
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  CrearAsociacionSchema,
  type CrearAsociacionDto,
} from "../../dto/territorio.schema";
import type { Asociacion } from "../../../domain/entities/asociacion.entity";
import type { AsociacionRepositoryPort } from "../../ports/asociacion.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import type { ClockPort } from "../../ports/clock.port";

export interface CrearAsociacionDeps {
  readonly asociaciones: AsociacionRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
  readonly clock: ClockPort;
  /** Generador de ID inyectable para pruebas deterministas; por defecto `crypto.randomUUID`. */
  readonly generarId?: () => string;
}

export function crearCrearAsociacionUseCase(deps: CrearAsociacionDeps) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<CrearAsociacionDto, Asociacion>(
      {
        schema: CrearAsociacionSchema,
        resource: "asociacion",
        operation: "crear",
        // La Asociacion a crear no tiene una asociacionId "propia" que
        // comparar contra el token del actor (no es hija de otra
        // Asociación); el scope vacío hace que solo `admin_global`
        // (alcance "any") pase `canPerform` (ver comentario de
        // PERMISSION_MATRIX en rbac-engine.ts).
        scopeOf: () => ({}),
        canPerform,
        applyDomainRule: (data) =>
          ok<Asociacion>({
            id: (deps.generarId ?? crypto.randomUUID)(),
            nombre: data.nombre,
            paisCodigo: data.paisCodigo,
            creadoEn: deps.clock.now(),
          }),
        save: (value) => deps.asociaciones.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "crear_asociacion",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

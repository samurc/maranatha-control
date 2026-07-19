/**
 * `crear-participante.use-case.ts` (Requerimiento 6.1-6.3, tarea 14.1).
 *
 * Secretario/Maestro/Admin_Global crean un Participante sobre su propia
 * `iglesia_id` (Property 2). Regla de dominio adicional (Requirement 6.3,
 * Property 16): rechazar con error de validación si la `unidad_id`
 * provista pertenece a una `iglesia_id` distinta de la provista para el
 * Participante — verificación que requiere el repositorio de
 * Unidad_Accion, por eso vive en `applyDomainRule`. `estado=activo`
 * inicial (Requirement 6.1).
 *
 * Validates: Requirements 6.1, 6.2, 6.3
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import { validationError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  CrearParticipanteSchema,
  type CrearParticipanteDto,
} from "../../dto/participantes.schema";
import type { Participante } from "../../../domain/entities/participante.entity";
import type { ParticipanteRepositoryPort } from "../../ports/participante.repository.port";
import type { UnidadAccionRepositoryPort } from "../../ports/unidad-accion.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import type { ClockPort } from "../../ports/clock.port";

export interface CrearParticipanteDeps {
  readonly participantes: ParticipanteRepositoryPort;
  readonly unidades: UnidadAccionRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
  readonly clock: ClockPort;
  readonly generarId?: () => string;
}

export function crearCrearParticipanteUseCase(deps: CrearParticipanteDeps) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<CrearParticipanteDto, Participante>(
      {
        schema: CrearParticipanteSchema,
        resource: "participante",
        operation: "crear",
        scopeOf: (data) => ({ iglesiaId: data.iglesiaId }),
        canPerform,
        applyDomainRule: async (data) => {
          const unidad = await deps.unidades.findById(data.unidadId);
          if (unidad === null || unidad.iglesiaId !== data.iglesiaId) {
            return err(
              validationError(
                `La unidad_id "${data.unidadId}" no pertenece a la iglesia_id "${data.iglesiaId}".`,
                [{ path: "unidadId", message: "Referencia inválida a Unidad_Accion." }]
              )
            );
          }
          return ok<Participante>({
            id: (deps.generarId ?? crypto.randomUUID)(),
            iglesiaId: data.iglesiaId,
            unidadId: data.unidadId,
            nombre: data.nombre,
            apellido: data.apellido,
            esVisita: data.esVisita,
            esMenorEdad: data.esMenorEdad,
            estado: "activo",
            creadoEn: deps.clock.now(),
          });
        },
        save: (value) => deps.participantes.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "crear_participante",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

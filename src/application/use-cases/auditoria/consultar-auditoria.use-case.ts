/**
 * `consultar-auditoria.use-case.ts` (Requerimiento 13.3-13.5, tarea 23.3,
 * Property 35, 36).
 *
 * Consulta el historial de auditoría con filtros `iglesia_id`/`uid`/rango
 * de fechas. `admin_global` puede consultar sin restricción de alcance
 * (Requirement 13.3); `admin_asociacion` recibe únicamente eventos cuya
 * `iglesia_id` pertenece a una Iglesia de su propia `asociacion_id`
 * (Requirement 13.4, Property 35) — la resolución de qué Iglesias
 * pertenecen a su Asociación se hace en este caso de uso, no en el puerto
 * de auditoría (que no conoce la jerarquía territorial). Todo otro rol es
 * rechazado (Requirement 13.5, Property 36).
 *
 * Caso de uso de solo lectura: no usa `ejecutarCasoDeUso`.
 *
 * Validates: Requirements 13.3, 13.4, 13.5
 */

import {
  type Result,
  type DomainError,
  ok,
  err,
  validationError,
  authorizationError,
} from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import { ConsultarAuditoriaSchema } from "../../dto/auditoria.schema";
import type { AuditoriaEvento } from "../../../domain/entities/auditoria-evento.entity";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import type { IglesiaRepositoryPort } from "../../ports/iglesia.repository.port";

export interface ConsultarAuditoriaDeps {
  readonly auditoria: AuditoriaRepositoryPort;
  readonly iglesias: IglesiaRepositoryPort;
}

export function crearConsultarAuditoriaUseCase(
  deps: ConsultarAuditoriaDeps
) {
  return async function execute(
    actorClaims: CustomClaims,
    input: unknown
  ): Promise<Result<readonly AuditoriaEvento[], DomainError>> {
    const dto = ConsultarAuditoriaSchema.safeParse(input);
    if (!dto.success) {
      return err(
        validationError(
          "El DTO de entrada no cumple con el esquema esperado.",
          dto.error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          }))
        )
      );
    }

    // Requirement 13.5, Property 36: solo admin_global y admin_asociacion.
    if (
      actorClaims.role !== "admin_global" &&
      actorClaims.role !== "admin_asociacion"
    ) {
      return err(authorizationError());
    }

    if (actorClaims.role === "admin_global") {
      const eventos = await deps.auditoria.listar({
        iglesiaId: dto.data.iglesiaId,
        uid: dto.data.uid,
        desde: dto.data.desde,
        hasta: dto.data.hasta,
      });
      return ok(eventos);
    }

    // admin_asociacion (Requirement 13.4, Property 35): alcance restringido
    // a las Iglesias de su propia asociacion_id.
    if (actorClaims.asociacionId === undefined) {
      return err(authorizationError());
    }
    const iglesiasPropias = await deps.iglesias.listByAsociacion(
      actorClaims.asociacionId
    );
    const iglesiaIdsPropios = new Set(iglesiasPropias.map((i) => i.id));

    if (
      dto.data.iglesiaId !== undefined &&
      !iglesiaIdsPropios.has(dto.data.iglesiaId)
    ) {
      // El filtro solicitado explícitamente cae fuera del alcance del actor.
      return ok([]);
    }

    const eventosCandidatos = await deps.auditoria.listar({
      iglesiaId: dto.data.iglesiaId,
      uid: dto.data.uid,
      desde: dto.data.desde,
      hasta: dto.data.hasta,
    });

    const eventosEnAlcance = eventosCandidatos.filter(
      (evento) =>
        evento.iglesiaId !== undefined &&
        iglesiaIdsPropios.has(evento.iglesiaId)
    );

    return ok(eventosEnAlcance);
  };
}

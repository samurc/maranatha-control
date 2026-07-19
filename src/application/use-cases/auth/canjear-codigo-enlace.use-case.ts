/**
 * `canjear-codigo-enlace.use-case.ts` (Requerimiento 1.7, 1.8, 6.7, tarea
 * 14.6, Property 6).
 *
 * Un Alumno canjea un código de enlace vigente (`usado=false`), lo que
 * vincula su `userUid` al Participante correspondiente y asigna
 * `role=alumno` con la `iglesiaId` del Participante (Requirement 1.7).
 * Todo código ya usado o inexistente se rechaza sin modificar ningún
 * Participante (Requirement 1.8, Property 6).
 *
 * No hay restricción de `role`/alcance territorial vía `canPerform`: el
 * actor que canjea un código de enlace es, por definición, un usuario
 * recién autenticado que AÚN NO TIENE Custom_Claims operativos
 * (`role=alumno` es precisamente lo que este caso de uso le asignará), por
 * lo que la autorización de esta operación se basa enteramente en la
 * posesión del código de un solo uso, no en `PERMISSION_MATRIX`.
 *
 * Validates: Requirements 1.7, 1.8, 6.7
 */

import { ok, err } from "../../../domain/shared";
import { conflictError, notFoundError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  CanjearCodigoEnlaceSchema,
  type CanjearCodigoEnlaceDto,
} from "../../dto/auth.schema";
import type { Participante } from "../../../domain/entities/participante.entity";
import type { ParticipanteRepositoryPort } from "../../ports/participante.repository.port";
import type { AuthAdminPort } from "../../ports/auth-admin.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";

export interface CanjearCodigoEnlaceDeps {
  readonly participantes: ParticipanteRepositoryPort;
  readonly authAdmin: AuthAdminPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

export function crearCanjearCodigoEnlaceUseCase(
  deps: CanjearCodigoEnlaceDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<CanjearCodigoEnlaceDto, Participante>(
      {
        schema: CanjearCodigoEnlaceSchema,
        resource: "participante",
        operation: "actualizar",
        scopeOf: () => ({}),
        // Ver comentario de módulo: la autorización de esta operación no
        // depende de PERMISSION_MATRIX (el actor todavía no tiene rol
        // operativo), sino de la posesión del código de un solo uso,
        // verificada en applyDomainRule.
        canPerform: () => true,
        applyDomainRule: async (data) => {
          const participante = await deps.participantes.findByCodigoEnlace(
            data.codigo
          );
          if (participante === null || participante.codigoEnlace === undefined) {
            return err(
              notFoundError("El código de enlace no existe.", data.codigo)
            );
          }
          if (participante.codigoEnlace.usado) {
            return err(
              conflictError("El código de enlace ya fue utilizado.")
            );
          }
          return ok<Participante>({
            ...participante,
            userUid: data.alumnoUid,
            codigoEnlace: { ...participante.codigoEnlace, usado: true },
          });
        },
        save: async (value) => {
          const guardado = await deps.participantes.save(value);
          await deps.authAdmin.setCustomUserClaims(value.userUid as string, {
            role: "alumno",
            iglesiaId: value.iglesiaId,
          });
          await deps.authAdmin.revokeRefreshTokens(value.userUid as string);
          return guardado;
        },
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "canjear_codigo_enlace",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

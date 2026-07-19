/**
 * `asignar-custom-claims.use-case.ts` (Requerimiento 1.1-1.5, tarea 9.1).
 *
 * Asigna/actualiza los Custom_Claims (`role`, `iglesiaId`, `distritoId`,
 * `asociacionId`) de un usuario destino, siguiendo el esqueleto canónico
 * de Aplicación (`ejecutarCasoDeUso`, tarea 2.3):
 *
 *   1. Validación Zod del DTO, incluyendo que `role` pertenezca al conjunto
 *      de roles válidos (Requirement 1.4, Property 4) — una falla aquí no
 *      tiene ningún efecto colateral: los Custom_Claims del usuario
 *      destino permanecen sin cambios.
 *   2. Autorización vía `canPerform(actorClaims, "custom_claims",
 *      "actualizar", { asociacionId: dto.asociacionId })`, que reproduce
 *      exactamente Property 3 a partir de las filas de `PERMISSION_MATRIX`
 *      para el recurso `custom_claims` (tarea 4.1): verdadero si y solo si
 *      el actor es `admin_global` (alcance `"any"`), o el actor es
 *      `admin_asociacion` y `dto.asociacionId` coincide con
 *      `actorClaims.asociacionId` (alcance `"own_asociacion"`); en
 *      cualquier otro caso, `canPerform` retorna `false` por ausencia de
 *      fila coincidente y el wrapper responde con un error de
 *      autorización (Requirement 1.3).
 *   3. Regla de dominio: no existe ninguna regla de negocio adicional más
 *      allá de la autorización y la validación de forma ya cubiertas por
 *      los pasos 1-2 (a diferencia de, por ejemplo, la unicidad de
 *      `id_oficial` de Iglesia); `applyDomainRule` es un paso identidad que
 *      solo re-empaqueta el DTO validado como el valor a persistir.
 *   4. Persistencia (`save`): la única escritura consolidada de este caso
 *      de uso consiste en DOS llamadas de infraestructura estrechamente
 *      acopladas —`authAdmin.setCustomUserClaims` seguido de
 *      `authAdmin.revokeRefreshTokens`— ejecutadas ambas dentro del mismo
 *      paso `save` para garantizar que la invalidación de sesión ocurra
 *      exactamente una vez por cada asignación exitosa (Requirement 1.5,
 *      Property 5), nunca de forma condicional ni duplicada.
 *   5. Auditoría: registrada automáticamente por el wrapper tras el `save`
 *      exitoso (Requirement 1.1, 1.2).
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok } from "../../../domain/shared";
import type { CustomClaims, Role } from "../../../domain/value-objects/custom-claims.vo";
import {
  AsignarCustomClaimsSchema,
  type AsignarCustomClaimsDto,
} from "../../dto/auth.schema";
import type { AuthAdminPort } from "../../ports/auth-admin.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";

/** Dependencias de infraestructura inyectadas (puertos de Aplicación). */
export interface AsignarCustomClaimsDeps {
  readonly authAdmin: AuthAdminPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

/** Custom_Claims resultantes asignados al usuario destino. */
export interface AsignarCustomClaimsResultado {
  readonly targetUid: string;
  readonly role: Role;
  readonly iglesiaId?: string;
  readonly distritoId?: string;
  readonly asociacionId?: string;
}

/**
 * Construye el caso de uso `asignar-custom-claims`, listo para invocarse
 * como `execute(actorClaims, input)` desde una Route Handler de Next.js,
 * una Cloud Function `onCall`, o una prueba (Requirement 19.3).
 */
export function crearAsignarCustomClaimsUseCase(
  deps: AsignarCustomClaimsDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<AsignarCustomClaimsDto, AsignarCustomClaimsResultado>(
      {
        schema: AsignarCustomClaimsSchema,
        resource: "custom_claims",
        operation: "actualizar",
        scopeOf: (data) => ({ asociacionId: data.asociacionId }),
        canPerform,
        applyDomainRule: (data) =>
          ok({
            targetUid: data.targetUid,
            role: data.role,
            iglesiaId: data.iglesiaId,
            distritoId: data.distritoId,
            asociacionId: data.asociacionId,
          }),
        save: async (value) => {
          await deps.authAdmin.setCustomUserClaims(value.targetUid, {
            role: value.role,
            iglesiaId: value.iglesiaId,
            distritoId: value.distritoId,
            asociacionId: value.asociacionId,
          });
          // Invalidación de sesión exactamente una vez por asignación
          // exitosa (Requirement 1.5, Property 5).
          await deps.authAdmin.revokeRefreshTokens(value.targetUid);
          return value;
        },
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "asignar_custom_claims",
        recursoAfectadoOf: (value) => value.targetUid,
      },
      actorClaims,
      input
    );
  };
}

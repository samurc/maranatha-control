/**
 * `leer-participante.use-case.ts` (Requerimiento 6.5, 6.6, 21.2, tarea
 * 14.4, Property 51).
 *
 * Lectura de un Participante, con dos niveles de acceso:
 *
 * 1. **Rechazo total** cuando ni `canPerform` (alcance territorial de
 *    `PERMISSION_MATRIX`) ni la propiedad del registro (Alumno vinculado)
 *    autorizan al actor en absoluto — p. ej. `pastor_distrital`/`anciano`,
 *    excluidos de `participante` por ser datos individuales (Requirement
 *    16.8), o un Secretario de otra `iglesia_id`.
 * 2. **Sanitización de `nombre`/`apellido`** cuando `canPerform` SÍ
 *    autoriza la lectura por alcance territorial, pero el `role` del
 *    actor no pertenece al conjunto explícito del Requerimiento 21.2
 *    ({admin_global, secretario, maestro, director_es} + el propio
 *    Alumno vinculado) — actualmente solo `admin_asociacion`, que
 *    `PERMISSION_MATRIX` autoriza a leer `participante` con alcance
 *    `own_asociacion` (para conteos/administración regional) pero sin
 *    calificar para ver nombres/apellidos individuales.
 *
 * Property 51 exige explícitamente una de estas dos alternativas ("SHALL
 * ser rechazada O retornar dichos campos ofuscados"); este caso de uso
 * implementa ambas, cada una para el subconjunto de actores que le
 * corresponde.
 *
 * Caso de uso de solo lectura: no usa `ejecutarCasoDeUso` (reservado a
 * mutaciones).
 *
 * Validates: Requirements 6.5, 6.6, 21.2
 */

import { canPerform } from "../../../domain/rbac/rbac-engine";
import {
  type Result,
  type DomainError,
  ok,
  err,
  validationError,
  authorizationError,
  notFoundError,
} from "../../../domain/shared";
import type { CustomClaims, Role } from "../../../domain/value-objects/custom-claims.vo";
import { LeerParticipanteSchema } from "../../dto/participantes.schema";
import type { Participante } from "../../../domain/entities/participante.entity";
import type { ParticipanteRepositoryPort } from "../../ports/participante.repository.port";
import type { IglesiaRepositoryPort } from "../../ports/iglesia.repository.port";

export interface LeerParticipanteDeps {
  readonly participantes: ParticipanteRepositoryPort;
  /**
   * Necesario para resolver el `asociacionId` de la Iglesia del
   * Participante (el propio Participante solo almacena `iglesiaId`), y
   * así evaluar la fila `own_asociacion` de `admin_asociacion` sobre
   * `participante` en `PERMISSION_MATRIX` — el mismo patrón de
   * resolución jerárquica que `design.md` describe para
   * `isAuthorizedForChurch` en `firestore.rules` (un `get()` adicional
   * sobre `/iglesias/{iglesiaId}`).
   */
  readonly iglesias: IglesiaRepositoryPort;
}

/** Valor de reemplazo para `nombre`/`apellido` ofuscados (Requirement 21.2, Property 51). */
export const CAMPO_OFUSCADO = "[protegido]";

/** Roles con visibilidad plena de nombre/apellido individuales (Requirement 21.2), además del propio Alumno vinculado. */
const ROLES_CON_NOMBRE_VISIBLE: ReadonlySet<Role> = new Set<Role>([
  "admin_global",
  "secretario",
  "maestro",
  "director_es",
]);

export function crearLeerParticipanteUseCase(deps: LeerParticipanteDeps) {
  return async function execute(
    actorClaims: CustomClaims,
    input: unknown
  ): Promise<Result<Participante, DomainError>> {
    const dto = LeerParticipanteSchema.safeParse(input);
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

    const participante = await deps.participantes.findById(dto.data.id);
    if (participante === null) {
      return err(
        notFoundError(
          `El Participante "${dto.data.id}" no existe.`,
          dto.data.id
        )
      );
    }

    const esAlumnoPropio =
      actorClaims.role === "alumno" &&
      participante.userUid === actorClaims.uid;

    let autorizadoTerritorialmente = false;
    if (actorClaims.role !== "alumno") {
      const iglesia = await deps.iglesias.findById(participante.iglesiaId);
      autorizadoTerritorialmente = canPerform(actorClaims, "participante", "leer", {
        iglesiaId: participante.iglesiaId,
        asociacionId: iglesia?.asociacionId,
      });
    }

    if (!esAlumnoPropio && !autorizadoTerritorialmente) {
      return err(authorizationError());
    }

    const nombreVisible =
      esAlumnoPropio || ROLES_CON_NOMBRE_VISIBLE.has(actorClaims.role);

    if (nombreVisible) {
      return ok(participante);
    }

    return ok({
      ...participante,
      nombre: CAMPO_OFUSCADO,
      apellido: CAMPO_OFUSCADO,
    });
  };
}

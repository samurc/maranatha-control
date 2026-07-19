/**
 * Wrapper genérico de ejecución de casos de uso (design.md, sección
 * "Aplicación", esqueleto canónico de caso de uso).
 *
 * Impone, para **todo** caso de uso mutador del Sistema, el mismo orden de
 * pasos, sin excepciones:
 *
 *   1. Validación del DTO de entrada contra un esquema Zod (Req 17.1).
 *   2. Si la validación falla: retorno inmediato de `err(validacion)` sin
 *      ningún efecto colateral -- ni `canPerform`, ni regla de dominio, ni
 *      `save`, ni auditoría se invocan (Req 17.2).
 *   3. Autorización vía `canPerform(actorClaims, resource, operation, scope)`
 *      inyectado por el llamador (implementación concreta: tarea 4.3).
 *   4. Regla de negocio de dominio (`applyDomainRule`), inyectada por cada
 *      caso de uso concreto.
 *   5. Persistencia (`save`, típicamente `repo.save`) como única escritura
 *      consolidada.
 *   6. Evento de auditoría (`registrarAuditoria`), invocado únicamente tras
 *      una persistencia exitosa (Req 13.1).
 *
 * Cualquier excepción lanzada por los puertos de infraestructura inyectados
 * (`save`, `registrarAuditoria`, o el propio `applyDomainRule` si delega en
 * infraestructura) se captura en un único `try/catch` y se traduce a
 * `err(internalError())`, un mensaje genérico que **no** filtra el mensaje
 * original de la excepción hacia la capa de Presentación (Req 17.3). El
 * detalle técnico original se entrega a `onInfrastructureError` (por
 * defecto, `console.error`) para el registro de errores del servidor.
 *
 * Este módulo es dominio-de-Aplicación puro: no importa Firebase ni
 * Next.js. El esquema Zod, `canPerform`, la regla de dominio, el repositorio
 * y el puerto de auditoría son todos inyectados por el caso de uso concreto
 * que configura y ejecuta este wrapper (tareas 9.1, 10.1, etc.).
 *
 * Validates: Requirements 17.1, 17.2, 17.3
 */

import type { ZodType } from "zod";
import type { CustomClaims } from "../../domain/value-objects/custom-claims.vo";
import type { Resource, Operation, ResourceScope } from "../../domain/rbac/types";
import {
  type Result,
  type DomainError,
  ok,
  err,
  isErr,
  validationError,
  authorizationError,
  internalError,
} from "../../domain/shared";

/** Evento de auditoría registrado tras toda mutación exitosa (Req 13.1). */
export interface EventoAuditoria {
  readonly uid: string;
  readonly accion: string;
  readonly recursoAfectado: string;
  readonly iglesiaId?: string;
}

/**
 * Configuración de un caso de uso concreto que consume el wrapper genérico.
 *
 * @typeParam TDomainData - Forma del DTO ya validado por `schema` (salida
 * de `safeParse`).
 * @typeParam TOutput - Forma del valor persistido/retornado por el caso de
 * uso (entidad de dominio guardada).
 */
export interface UseCaseConfig<TDomainData, TOutput> {
  /** Esquema Zod contra el que se valida el `input` crudo (Req 17.1). */
  readonly schema: ZodType<TDomainData>;
  /** Recurso del dominio sobre el que se solicita la operación (Req 16). */
  readonly resource: Resource;
  /** Operación CRUD/listado solicitada sobre `resource`. */
  readonly operation: Operation;
  /** Deriva el alcance territorial del recurso a partir del DTO validado. */
  readonly scopeOf: (data: TDomainData) => ResourceScope;
  /**
   * Verificación de autorización RBAC, inyectada por el llamador. La
   * implementación concreta (`domain/services/rbac-engine.ts`, tarea 4.3)
   * se conecta aquí sin que este wrapper dependa de ella.
   */
  readonly canPerform: (
    claims: CustomClaims,
    resource: Resource,
    operation: Operation,
    scope: ResourceScope
  ) => boolean;
  /**
   * Regla(s) de negocio de dominio (estado, rangos, unicidad...). Puede ser
   * síncrona o asíncrona; su resultado ya es un `Result` y, si es `Err`, se
   * retorna tal cual sin envolverlo (preserva la categoría de error
   * original, p. ej. `conflicto` o `no_encontrado`).
   */
  readonly applyDomainRule: (
    data: TDomainData,
    actorClaims: CustomClaims
  ) => Promise<Result<TOutput, DomainError>> | Result<TOutput, DomainError>;
  /** Única escritura consolidada (típicamente `repo.save`). */
  readonly save: (value: TOutput) => Promise<TOutput>;
  /** Puerto de auditoría inyectado (implementación concreta: tarea 23.1). */
  readonly registrarAuditoria: (evento: EventoAuditoria) => Promise<void>;
  /** Nombre de la acción registrada en el evento de auditoría. */
  readonly accion: string;
  /** Deriva el identificador del recurso afectado a partir del valor persistido. */
  readonly recursoAfectadoOf: (value: TOutput) => string;
  /**
   * Callback opcional invocado con el detalle técnico original de cualquier
   * excepción capturada por el `try/catch` de infraestructura, para
   * registro en el servidor (Req 17.3). Por defecto usa `console.error`.
   * Nunca se envía al valor de retorno del caso de uso.
   */
  readonly onInfrastructureError?: (error: unknown) => void;
}

function logInfrastructureError(error: unknown): void {
  console.error("[application] error de infraestructura capturado:", error);
}

/**
 * Ejecuta un caso de uso siguiendo el esqueleto canónico de Aplicación:
 * validación Zod → `canPerform` → regla de dominio → `save` → auditoría.
 *
 * Nunca lanza excepciones de negocio ni de infraestructura hacia el
 * llamador: toda falla se comunica como `Result.Err<DomainError>`.
 */
export async function ejecutarCasoDeUso<TDomainData, TOutput>(
  config: UseCaseConfig<TDomainData, TOutput>,
  actorClaims: CustomClaims,
  input: unknown
): Promise<Result<TOutput, DomainError>> {
  // 1-2. Validación Zod. Falla => retorno inmediato, sin efectos colaterales (Req 17.1, 17.2).
  const dto = config.schema.safeParse(input);
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

  // 3. Autorización RBAC.
  if (!config.canPerform(actorClaims, config.resource, config.operation, config.scopeOf(dto.data))) {
    return err(authorizationError());
  }

  try {
    // 4. Regla de negocio de dominio.
    const domainResult = await config.applyDomainRule(dto.data, actorClaims);
    if (isErr(domainResult)) {
      return domainResult;
    }

    // 5. Única escritura consolidada.
    const saved = await config.save(domainResult.value);

    // 6. Evento de auditoría, solo tras persistencia exitosa (Req 13.1).
    await config.registrarAuditoria({
      uid: actorClaims.uid,
      accion: config.accion,
      recursoAfectado: config.recursoAfectadoOf(saved),
      iglesiaId: config.scopeOf(dto.data).iglesiaId,
    });

    return ok(saved);
  } catch (error) {
    // Captura única de excepciones de puertos de infraestructura: se
    // traduce a `error_interno` genérico, sin filtrar el mensaje original
    // hacia la capa de Presentación (Req 17.3).
    (config.onInfrastructureError ?? logInfrastructureError)(error);
    return err(internalError());
  }
}

/**
 * `DomainError` taxonomy shared by every use case of the System.
 *
 * Every use case returns a `Result<Output, DomainError>` (see `result.ts`)
 * instead of throwing business exceptions towards the Presentation layer.
 * Each error is classified into exactly one of the five categories below,
 * which the Application layer later maps to an HTTP status code and the
 * Presentation layer maps to a translatable UI message
 * (design.md, "Taxonomía de errores (Requerimiento 17.4)").
 *
 * Validates: Requirements 17.4
 */

/** A single field-level validation issue (e.g. produced by a failed Zod parse). */
export interface ValidationIssue {
  /** Dot/bracket path to the offending field, e.g. `"dias_estudio"` or `"asistencia[3].participanteId"`. */
  readonly path: string;
  /** Human-readable explanation of why the field is invalid. */
  readonly message: string;
}

/** Invalid input DTO (HTTP 400). Never has side effects (Requirement 17.2). */
export interface ValidationDomainError {
  readonly kind: "validacion";
  readonly message: string;
  readonly issues: readonly ValidationIssue[];
}

/** Actor lacks permission for the requested resource/operation/scope (HTTP 403). */
export interface AuthorizationDomainError {
  readonly kind: "autorizacion";
  readonly message: string;
}

/** Referenced resource does not exist (HTTP 404). */
export interface NotFoundDomainError {
  readonly kind: "no_encontrado";
  readonly message: string;
  /** Identifier of the resource that could not be found, when available. */
  readonly resourceId?: string;
}

/** Operation conflicts with the current state of a resource (HTTP 409). */
export interface ConflictDomainError {
  readonly kind: "conflicto";
  readonly message: string;
}

/**
 * Unexpected failure (infrastructure exception, uncontrolled timeout, etc.).
 * The message returned here MUST be a generic, client-safe message; the
 * original technical detail is logged separately and never placed here
 * (Requirement 17.3).
 */
export interface InternalDomainError {
  readonly kind: "error_interno";
  readonly message: string;
}

/**
 * Discriminated union of every possible domain error category. Exhaustive
 * by construction: `kind` is exactly one of
 * {validacion, autorizacion, no_encontrado, conflicto, error_interno}.
 */
export type DomainError =
  | ValidationDomainError
  | AuthorizationDomainError
  | NotFoundDomainError
  | ConflictDomainError
  | InternalDomainError;

/** Builds a `validacion` error. */
export function validationError(
  message: string,
  issues: readonly ValidationIssue[] = []
): ValidationDomainError {
  return { kind: "validacion", message, issues };
}

/** Builds an `autorizacion` error. */
export function authorizationError(
  message = "No tiene permiso para realizar esta operación."
): AuthorizationDomainError {
  return { kind: "autorizacion", message };
}

/** Builds a `no_encontrado` error. */
export function notFoundError(
  message: string,
  resourceId?: string
): NotFoundDomainError {
  return { kind: "no_encontrado", message, resourceId };
}

/** Builds a `conflicto` error. */
export function conflictError(message: string): ConflictDomainError {
  return { kind: "conflicto", message };
}

/** Builds an `error_interno` error. */
export function internalError(
  message = "Ocurrió un error inesperado. Intente nuevamente."
): InternalDomainError {
  return { kind: "error_interno", message };
}

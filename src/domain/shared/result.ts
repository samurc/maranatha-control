/**
 * Generic `Result<T, E>` type used pervasively across use cases so that
 * business/domain errors are values (never thrown exceptions) all the way
 * up to the Presentation layer.
 *
 * See design.md, section "Aplicación" (canonical use-case skeleton:
 * `execute(): Promise<Result<Output, DomainError>>`).
 *
 * Validates: Requirements 17.4
 */

/** Successful outcome carrying the produced value. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Failed outcome carrying the error. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Discriminated union representing either a success (`Ok`) or a failure (`Err`). */
export type Result<T, E> = Ok<T> | Err<E>;

/** Builds a successful `Result`. */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/** Builds a failed `Result`. */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/** Narrows a `Result` to `Ok`. */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

/** Narrows a `Result` to `Err`. */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

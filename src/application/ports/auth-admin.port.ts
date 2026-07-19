/**
 * Puerto de administración de Firebase Auth (Requerimiento 1.5, 19.2).
 *
 * Implementado por `FirebaseAdminAuthAdapter` (tarea 27.1), que envuelve
 * `firebase-admin/auth`: `setCustomUserClaims` y `revokeRefreshTokens`.
 * Consumido por `asignar-custom-claims.use-case.ts` (tarea 9.1) y por
 * `canjear-codigo-enlace.use-case.ts` (tarea 14.6) para invalidar la
 * sesión vigente del usuario destino tras actualizar sus Custom_Claims.
 */
import type { CustomClaims } from "../../domain/value-objects/custom-claims.vo";

export interface AuthAdminPort {
  /** Actualiza los Custom_Claims del usuario `uid` (Requirement 1.1, 1.2, 1.7). */
  setCustomUserClaims(
    uid: string,
    claims: Omit<CustomClaims, "uid">
  ): Promise<void>;
  /** Invalida el token de sesión vigente del usuario `uid` (Requirement 1.5). */
  revokeRefreshTokens(uid: string): Promise<void>;
}

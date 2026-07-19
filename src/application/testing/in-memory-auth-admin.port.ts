/**
 * Doble en memoria de `AuthAdminPort` (tarea 8.4): registra las llamadas a
 * `setCustomUserClaims`/`revokeRefreshTokens` para que las pruebas de
 * `asignar-custom-claims.use-case.ts` (tarea 9.1) puedan verificar
 * Property 5 (invalidación de sesión exactamente una vez) sin depender de
 * `firebase-admin`.
 */
import type { CustomClaims } from "../../domain/value-objects/custom-claims.vo";
import type { AuthAdminPort } from "../ports/auth-admin.port";

interface ClaimsAsignados {
  readonly uid: string;
  readonly claims: Omit<CustomClaims, "uid">;
}

export class InMemoryAuthAdminPort implements AuthAdminPort {
  readonly claimsAsignados: ClaimsAsignados[] = [];
  readonly sesionesRevocadas: string[] = [];

  async setCustomUserClaims(
    uid: string,
    claims: Omit<CustomClaims, "uid">
  ): Promise<void> {
    this.claimsAsignados.push({ uid, claims });
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    this.sesionesRevocadas.push(uid);
  }
}

/**
 * `FirebaseAdminAuthAdapter` (Requerimiento 1.5, 19.2, tarea 27.1).
 *
 * Implementa `AuthAdminPort` sobre `firebase-admin/auth`. Solo debe
 * instanciarse en un entorno de servidor (Cloud Function/Route Handler
 * con credenciales de servicio), nunca en el cliente: `firebase-admin`
 * requiere credenciales privilegiadas que no deben empaquetarse en el
 * bundle del navegador.
 */

import type { Auth } from "firebase-admin/auth";
import type { CustomClaims } from "../../domain/value-objects/custom-claims.vo";
import type { AuthAdminPort } from "../../application/ports/auth-admin.port";

export class FirebaseAdminAuthAdapter implements AuthAdminPort {
  constructor(private readonly auth: Auth) {}

  async setCustomUserClaims(
    uid: string,
    claims: Omit<CustomClaims, "uid">
  ): Promise<void> {
    await this.auth.setCustomUserClaims(uid, {
      role: claims.role,
      iglesiaId: claims.iglesiaId,
      distritoId: claims.distritoId,
      asociacionId: claims.asociacionId,
    });
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    await this.auth.revokeRefreshTokens(uid);
  }
}

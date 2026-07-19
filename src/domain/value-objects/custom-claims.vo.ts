/**
 * Custom_Claims: atributos de autorización incrustados en el token de
 * Firebase Auth de un usuario (ver Glosario y Requerimiento 1).
 *
 * Value Object de dominio puro: sin dependencias de Firebase/Next.js.
 */

/**
 * Rol del usuario dentro del Sistema. Fuente única de verdad del conjunto
 * de roles válidos (Requerimiento 1.4).
 */
export type Role =
  | "admin_global"
  | "admin_asociacion"
  | "pastor_distrital"
  | "anciano"
  | "director_es"
  | "secretario"
  | "maestro"
  | "alumno";

/**
 * Custom_Claims de un usuario autenticado.
 *
 * `uid` identifica al usuario de Firebase Auth y se usa, entre otros casos,
 * para registrar el actor de un evento de Modulo_Auditoria
 * (ver design.md, wrapper de casos de uso: `auditoria.registrar({ uid: actorClaims.uid, ... })`).
 */
export interface CustomClaims {
  uid: string;
  role: Role;
  iglesiaId?: string;
  distritoId?: string;
  asociacionId?: string;
}

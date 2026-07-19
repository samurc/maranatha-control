/**
 * Tipos del Motor_RBAC (dominio puro, sin dependencias de Firebase/Next.js).
 *
 * Este archivo define únicamente los tipos compartidos por el Motor_RBAC.
 * La tabla `PERMISSION_MATRIX` y las funciones `isAuthorizedForChurch`,
 * `hasOperationalRole`, `canPerform` y `visibleNavSections` se implementan
 * en `domain/services/rbac-engine.ts` (tareas 4.1/4.3), que debe importar
 * estos tipos desde aquí.
 */

/**
 * Recurso del dominio sobre el que se solicita una operación autorizada.
 */
export type Resource =
  | "asociacion"
  | "distrito"
  | "iglesia"
  | "unidad_accion"
  | "participante"
  | "registro_sabatico"
  | "seguimiento_pastoral"
  | "dashboard"
  | "auditoria"
  | "custom_claims"
  | "datos_personales";

/**
 * Operación CRUD/listado solicitada sobre un `Resource`.
 */
export type Operation = "crear" | "leer" | "actualizar" | "eliminar" | "listar";

/**
 * Alcance territorial del recurso objetivo de una operación, usado por
 * `canPerform`/`isAuthorizedForChurch` para resolver autorización jerárquica
 * (Requerimiento 12).
 */
export interface ResourceScope {
  iglesiaId?: string;
  distritoId?: string;
  asociacionId?: string;
}

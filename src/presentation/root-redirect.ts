/**
 * `resolverDestinoRaiz(claims)` (Requerimiento 23.4-23.7, tarea 43.7).
 *
 * Función pura que decide el destino de redirección de la ruta raíz `/`
 * a partir de los Custom_Claims de la sesión actual (o su ausencia), SIN
 * ejecutar el `redirect()` en sí — esto permite probarla como una
 * propiedad sin necesitar un entorno de Next.js real (design.md,
 * "Página raíz `/`"). Consumida por `app/page.tsx`.
 *
 * Reglas, en orden de evaluación:
 * 1. Sin sesión (`claims === null`) → `/login` (Requirement 23.7).
 * 2. `role === "alumno"` → `/panel-alumno` (Requirement 23.4).
 * 3. Rol analítico (los 5 roles del Requirement 15.2: `admin_global`,
 *    `admin_asociacion`, `pastor_distrital`, `anciano`, `director_es`) →
 *    `/dashboard` (Requirement 23.5).
 * 4. En cualquier otro caso (`secretario`/`maestro`) → la primera entrada
 *    de `construirMenuNavegacion(claims)`, o `/login` si el menú
 *    resultante está vacío (Requirement 23.6).
 */
import type { CustomClaims, Role } from "../domain/value-objects/custom-claims.vo";
import { construirMenuNavegacion } from "./nav-sections";

const RUTA_LOGIN = "/login";

/** Los 5 roles con acceso analítico de solo lectura al Dashboard (Requirement 15.2). */
const ROLES_ANALITICOS: ReadonlySet<Role> = new Set<Role>([
  "admin_global",
  "admin_asociacion",
  "pastor_distrital",
  "anciano",
  "director_es",
]);

export function resolverDestinoRaiz(claims: CustomClaims | null): string {
  if (claims === null) {
    return RUTA_LOGIN;
  }
  if (claims.role === "alumno") {
    return "/panel-alumno";
  }
  if (ROLES_ANALITICOS.has(claims.role)) {
    return "/dashboard";
  }
  // Secretario y Maestro van directo a participantes
  if (claims.role === "secretario" || claims.role === "maestro") {
    return "/participantes";
  }
  const menu = construirMenuNavegacion(claims);
  return menu[0]?.href ?? RUTA_LOGIN;
}

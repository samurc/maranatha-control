/**
 * Esquemas Zod de los DTOs de entrada de los casos de uso de Autenticación
 * y Custom_Claims (Requerimiento 1, tareas 9.1 y 14.6).
 *
 * Validates: Requirements 17.1
 */
import { z } from "zod";
import type { Role } from "../../domain/value-objects/custom-claims.vo";

/** Fuente única de verdad del conjunto de roles válidos (Requirement 1.4). */
export const ROLES = [
  "admin_global",
  "admin_asociacion",
  "pastor_distrital",
  "anciano",
  "director_es",
  "secretario",
  "maestro",
  "alumno",
] as const satisfies readonly Role[];

export const RoleSchema = z.enum(ROLES);

/** DTO de `asignar-custom-claims.use-case.ts` (Requirement 1.1-1.5). */
export const AsignarCustomClaimsSchema = z.object({
  targetUid: z.string().min(1),
  role: RoleSchema,
  iglesiaId: z.string().min(1).optional(),
  distritoId: z.string().min(1).optional(),
  asociacionId: z.string().min(1).optional(),
});
export type AsignarCustomClaimsDto = z.infer<typeof AsignarCustomClaimsSchema>;

/** DTO de `canjear-codigo-enlace.use-case.ts` (Requirement 1.7, 1.8, 6.7). */
export const CanjearCodigoEnlaceSchema = z.object({
  codigo: z.string().min(1),
  alumnoUid: z.string().min(1),
});
export type CanjearCodigoEnlaceDto = z.infer<typeof CanjearCodigoEnlaceSchema>;

/** DTO de `POST /api/auth/login` (Requirement 22.1, tarea 41.1). */
export const LoginRequestSchema = z.object({
  idToken: z.string().min(1),
});
export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;

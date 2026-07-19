/**
 * Esquema Zod del DTO de entrada de
 * `registrar-seguimiento-pastoral.use-case.ts` (Requerimiento 9, tarea
 * 19.1).
 *
 * Validates: Requirements 17.1, 9.2
 */
import { z } from "zod";
import type { AccionSeguimientoPastoral } from "../../domain/entities/registro-sabatico.entity";

/** Enum de `accion` (Requirement 9.2, Property 24). */
export const ACCIONES_SEGUIMIENTO_PASTORAL = [
  "llamado_telefonico",
  "enfermo_oracion",
  "visitado_en_semana",
] as const satisfies readonly AccionSeguimientoPastoral[];

export const AccionSeguimientoPastoralSchema = z.enum(
  ACCIONES_SEGUIMIENTO_PASTORAL
);

export const RegistrarSeguimientoPastoralSchema = z.object({
  registroId: z.string().min(1),
  participanteId: z.string().min(1),
  accion: AccionSeguimientoPastoralSchema,
});
export type RegistrarSeguimientoPastoralDto = z.infer<
  typeof RegistrarSeguimientoPastoralSchema
>;

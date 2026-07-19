/**
 * Esquemas Zod de los DTOs de entrada de los casos de uso de Gestión
 * Territorial (Requerimientos 2, 3, tareas 10.1, 10.2, 10.4, 10.7, 10.9).
 *
 * Validates: Requirements 17.1
 */
import { z } from "zod";

/** DTO de `crear-asociacion.use-case.ts` (Requirement 2.1). */
export const CrearAsociacionSchema = z.object({
  nombre: z.string().min(1),
  paisCodigo: z.string().min(2).max(2),
});
export type CrearAsociacionDto = z.infer<typeof CrearAsociacionSchema>;

/** DTO de `crear-distrito.use-case.ts` (Requirement 2.2, 2.4). */
export const CrearDistritoSchema = z.object({
  nombre: z.string().min(1),
  asociacionId: z.string().min(1),
});
export type CrearDistritoDto = z.infer<typeof CrearDistritoSchema>;

/** DTO de `asignar-supervisor-distrito.use-case.ts` (Requirement 2.5). */
export const AsignarSupervisorDistritoSchema = z.object({
  distritoId: z.string().min(1),
  supervisorUid: z.string().min(1),
});
export type AsignarSupervisorDistritoDto = z.infer<
  typeof AsignarSupervisorDistritoSchema
>;

/** DTO de `crear-iglesia.use-case.ts` (Requirement 3.1-3.5). */
export const CrearIglesiaSchema = z.object({
  idOficial: z.string().min(1),
  nombre: z.string().min(1),
  asociacionId: z.string().min(1),
  distritoId: z.string().min(1),
  paisCodigo: z.string().min(2).max(2),
  timezone: z.string().min(1).optional(),
});
export type CrearIglesiaDto = z.infer<typeof CrearIglesiaSchema>;

/**
 * DTO de `editar-iglesia.use-case.ts` (Requirement 3.6): actualiza
 * únicamente `nombre`, `distrito_id` o `pais_codigo`.
 */
export const EditarIglesiaSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1).optional(),
  distritoId: z.string().min(1).optional(),
  paisCodigo: z.string().min(2).max(2).optional(),
});
export type EditarIglesiaDto = z.infer<typeof EditarIglesiaSchema>;

/** DTO de `eliminar-iglesia.use-case.ts` (Requirement 3.8). */
export const EliminarIglesiaSchema = z.object({
  id: z.string().min(1),
});
export type EliminarIglesiaDto = z.infer<typeof EliminarIglesiaSchema>;

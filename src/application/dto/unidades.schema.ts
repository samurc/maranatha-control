/**
 * Esquemas Zod de los DTOs de entrada de los casos de uso de Unidades de
 * Acción (Requerimiento 5, tareas 13.1-13.3).
 *
 * Validates: Requirements 17.1
 */
import { z } from "zod";

/** DTO de `crear-unidad-accion.use-case.ts` (Requirement 5.1, 5.2). */
export const CrearUnidadAccionSchema = z.object({
  iglesiaId: z.string().min(1),
  nombre: z.string().min(1),
  maestroUid: z.string().min(1),
});
export type CrearUnidadAccionDto = z.infer<typeof CrearUnidadAccionSchema>;

export const EstadoUnidadAccionSchema = z.enum(["activa", "inactiva"]);

/** DTO de `actualizar-estado-unidad-accion.use-case.ts` (Requirement 5.4). */
export const ActualizarEstadoUnidadAccionSchema = z.object({
  id: z.string().min(1),
  estado: EstadoUnidadAccionSchema,
});
export type ActualizarEstadoUnidadAccionDto = z.infer<
  typeof ActualizarEstadoUnidadAccionSchema
>;

/** DTO de `listar-unidades-por-maestro.use-case.ts` (Requirement 5.6). */
export const ListarUnidadesPorMaestroSchema = z.object({
  maestroUid: z.string().min(1),
});
export type ListarUnidadesPorMaestroDto = z.infer<
  typeof ListarUnidadesPorMaestroSchema
>;

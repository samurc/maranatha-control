/**
 * Esquemas Zod de los DTOs de entrada de los casos de uso de Participantes
 * y vínculo de cuenta Alumno (Requerimientos 1.7, 1.8, 6, tareas
 * 14.1-14.6).
 *
 * Validates: Requirements 17.1
 */
import { z } from "zod";

/** DTO de `crear-participante.use-case.ts` (Requirement 6.1-6.3). */
export const CrearParticipanteSchema = z.object({
  iglesiaId: z.string().min(1),
  unidadId: z.string().min(1),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  esVisita: z.boolean(),
  esMenorEdad: z.boolean().optional(),
});
export type CrearParticipanteDto = z.infer<typeof CrearParticipanteSchema>;

export const EstadoParticipanteSchema = z.enum(["activo", "inactivo"]);

/** DTO de `actualizar-estado-participante.use-case.ts` (Requirement 6.4). */
export const ActualizarEstadoParticipanteSchema = z.object({
  id: z.string().min(1),
  estado: EstadoParticipanteSchema,
});
export type ActualizarEstadoParticipanteDto = z.infer<
  typeof ActualizarEstadoParticipanteSchema
>;

/** DTO de `leer-participante.use-case.ts` (Requirement 6.5, 6.6, 21.2). */
export const LeerParticipanteSchema = z.object({
  id: z.string().min(1),
});
export type LeerParticipanteDto = z.infer<typeof LeerParticipanteSchema>;

/**
 * DTO de `actualizar-participante-propio.use-case.ts` (Requirement 6.5,
 * 6.6, 21.2): un Alumno solo edita el Participante vinculado a su propio
 * `userUid`; los campos editables se limitan a `nombre`/`apellido`.
 */
export const ActualizarParticipantePropioSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1).optional(),
  apellido: z.string().min(1).optional(),
});
export type ActualizarParticipantePropioDto = z.infer<
  typeof ActualizarParticipantePropioSchema
>;

/** DTO de `generar-codigo-enlace.use-case.ts` (Requirement 6.7). */
export const GenerarCodigoEnlaceSchema = z.object({
  participanteId: z.string().min(1),
});
export type GenerarCodigoEnlaceDto = z.infer<typeof GenerarCodigoEnlaceSchema>;

/**
 * Esquemas Zod de los DTOs de entrada de los casos de uso de Privacidad y
 * datos personales (Requerimiento 21.3, 21.4, tarea 24.1).
 *
 * Validates: Requirements 17.1
 */
import { z } from "zod";

/** DTO de `exportar-datos-participante.use-case.ts` (Requirement 21.3). */
export const ExportarDatosParticipanteSchema = z.object({
  participanteId: z.string().min(1),
});
export type ExportarDatosParticipanteDto = z.infer<
  typeof ExportarDatosParticipanteSchema
>;

/** DTO de `eliminar-datos-participante.use-case.ts` (Requirement 21.3, 21.4). */
export const EliminarDatosParticipanteSchema = z.object({
  participanteId: z.string().min(1),
});
export type EliminarDatosParticipanteDto = z.infer<
  typeof EliminarDatosParticipanteSchema
>;

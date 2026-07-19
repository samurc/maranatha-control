/**
 * Esquemas Zod de los DTOs de entrada de los casos de uso de Check-in de
 * Estudio Diario (Requerimiento 10, tareas 20.1, 20.5).
 *
 * Validates: Requirements 17.1
 */
import { z } from "zod";

/**
 * DTO de `autorregistrar-estudio-diario.use-case.ts` (Requirement
 * 10.1-10.3, 10.5): el Alumno actor se identifica vía `actorClaims.uid`
 * (no viaja en el DTO); `participanteId` es el Participante objetivo, cuya
 * propiedad (`participante.userUid === actorClaims.uid`) se verifica como
 * regla de dominio (Requirement 10.3).
 */
export const AutorregistrarEstudioDiarioSchema = z.object({
  participanteId: z.string().min(1),
  /** Instante de referencia del día calendario vigente (provisto por `ClockPort`). */
  fechaReferencia: z.coerce.date(),
});
export type AutorregistrarEstudioDiarioDto = z.infer<
  typeof AutorregistrarEstudioDiarioSchema
>;

/** DTO de `consultar-mi-progreso.use-case.ts` (Requirement 10.6). */
export const ConsultarMiProgresoSchema = z.object({
  /** Instante de referencia para resolver el Sabado_Eclesiastico vigente. */
  fechaReferencia: z.coerce.date(),
});
export type ConsultarMiProgresoDto = z.infer<typeof ConsultarMiProgresoSchema>;

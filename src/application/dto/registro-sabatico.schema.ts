/**
 * Esquemas Zod de los DTOs de entrada de los casos de uso del
 * Registro_Sabatico Core y Cierre semanal (Requerimientos 7, 8, tareas
 * 16.1, 16.4, 16.6, 18.1, 18.2).
 *
 * Validates: Requirements 17.1
 */
import { z } from "zod";

/**
 * Cambio consolidado de un único Participante dentro de un mismo envío de
 * la Interfaz_Grilla_Asistencia (Requirement 14.4: un solo DTO consolidado
 * por Participante afectado, nunca una escritura por Participante).
 */
export const CambioAsistenciaParticipanteSchema = z.object({
  participanteId: z.string().min(1),
  presente: z.boolean(),
  /** 0..7 (Requirement 7.5); el rango exacto lo valida `validarDiasEstudio` como regla de dominio. */
  diasEstudio: z.number().int(),
});
export type CambioAsistenciaParticipanteDto = z.infer<
  typeof CambioAsistenciaParticipanteSchema
>;

/**
 * DTO de `registrar-asistencia.use-case.ts` (Requirement 7.1-7.7, 14.4):
 * cubre tanto el camino de creación (sin Registro_Sabatico previo) como el
 * de actualización, con el diff consolidado de la grilla en `cambios`.
 */
export const RegistrarAsistenciaSchema = z.object({
  iglesiaId: z.string().min(1),
  unidadId: z.string().min(1),
  /** Instante de referencia para resolver el Sabado_Eclesiastico vigente (provisto por `ClockPort`, nunca `new Date()` del caso de uso). */
  fechaReferencia: z.coerce.date(),
  cambios: z.array(CambioAsistenciaParticipanteSchema).min(1),
});
export type RegistrarAsistenciaDto = z.infer<typeof RegistrarAsistenciaSchema>;

/** DTO de `cerrar-registro-sabatico.use-case.ts` (Requirement 8.1, 8.2). */
export const CerrarRegistroSabaticoSchema = z.object({
  id: z.string().min(1),
});
export type CerrarRegistroSabaticoDto = z.infer<
  typeof CerrarRegistroSabaticoSchema
>;

/** DTO de `reabrir-registro-sabatico.use-case.ts` (Requirement 8.3). */
export const ReabrirRegistroSabaticoSchema = z.object({
  id: z.string().min(1),
});
export type ReabrirRegistroSabaticoDto = z.infer<
  typeof ReabrirRegistroSabaticoSchema
>;

/** DTO de `eliminar-registro-sabatico.use-case.ts` (Requirement 7.9). */
export const EliminarRegistroSabaticoSchema = z.object({
  id: z.string().min(1),
});
export type EliminarRegistroSabaticoDto = z.infer<
  typeof EliminarRegistroSabaticoSchema
>;

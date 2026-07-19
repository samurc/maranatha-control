/**
 * Esquema Zod del DTO de entrada de `consultar-auditoria.use-case.ts`
 * (Requerimiento 13.3-13.5, tarea 23.3).
 *
 * Validates: Requirements 17.1
 */
import { z } from "zod";

export const ConsultarAuditoriaSchema = z.object({
  iglesiaId: z.string().min(1).optional(),
  uid: z.string().min(1).optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});
export type ConsultarAuditoriaDto = z.infer<typeof ConsultarAuditoriaSchema>;

/**
 * Esquema Zod del DTO de entrada de `buscar-iglesia-oficial.use-case.ts`
 * (Requerimiento 4, tarea 11.1).
 *
 * Validates: Requirements 17.1
 */
import { z } from "zod";

export const BuscarIglesiaOficialSchema = z.object({
  criterio: z.string().min(1),
});
export type BuscarIglesiaOficialDto = z.infer<typeof BuscarIglesiaOficialSchema>;

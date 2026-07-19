/**
 * Esquema Zod del DTO de entrada de `consultar-dashboard.use-case.ts`
 * (Requerimiento 11, tareas 22.1, 22.3).
 *
 * Validates: Requirements 17.1
 */
import { z } from "zod";

export const ConsultarDashboardSchema = z.object({
  /** Rango de periodo a consultar; ambos límites inclusivos. */
  desde: z.coerce.date(),
  hasta: z.coerce.date(),
});
export type ConsultarDashboardDto = z.infer<typeof ConsultarDashboardSchema>;

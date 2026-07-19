/**
 * Helper transversal `registrarEventoAuditoria` (Requerimiento 13.1, tarea
 * 23.1).
 *
 * Fábrica que produce el callback `registrarAuditoria` consumido por
 * `ejecutarCasoDeUso` (tarea 2.3, `execute-use-case.ts`): el wrapper
 * invoca este callback exactamente una vez, únicamente tras una
 * persistencia exitosa (`save`), para toda operación mutadora del
 * Sistema (Requirement 13.1, Property 33). Centraliza en un único punto
 * la delegación a `AuditoriaRepositoryPort.registrar`, en vez de que cada
 * caso de uso repita el mismo `async (evento) => { await
 * deps.auditoria.registrar(evento); }` de forma dispersa.
 *
 * Uso típico dentro de un caso de uso concreto:
 *
 * ```typescript
 * registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
 * ```
 *
 * Validates: Requirements 13.1
 */

import type {
  AuditoriaRepositoryPort,
} from "../ports/auditoria.repository.port";
import type { EventoAuditoria } from "./execute-use-case";

export function registrarEventoAuditoria(
  auditoria: AuditoriaRepositoryPort
): (evento: EventoAuditoria) => Promise<void> {
  return async (evento: EventoAuditoria): Promise<void> => {
    await auditoria.registrar(evento);
  };
}

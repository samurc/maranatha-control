/**
 * Puerto de repositorio de Auditoría (Requerimiento 19.2, 13.1-13.5).
 *
 * `registrar()` es invocado exclusivamente desde el wrapper transversal de
 * casos de uso (`ejecutarCasoDeUso`, tarea 2.3 / helper de tarea 23.1) tras
 * cada mutación exitosa. `listar()` alimenta
 * `consultar-auditoria.use-case.ts` (tarea 23.3), que aplica el filtrado
 * por alcance del consultante (Property 35) sobre el resultado de este
 * puerto.
 */
import type { AuditoriaEvento } from "../../domain/entities/auditoria-evento.entity";

/** Datos de entrada para registrar un nuevo evento (sin `id`/`timestamp`, asignados por el adaptador). */
export interface RegistrarEventoAuditoriaInput {
  readonly uid: string;
  readonly accion: string;
  readonly recursoAfectado: string;
  readonly iglesiaId?: string;
}

/** Filtros de consulta de auditoría (Requirement 13.3, 13.4). */
export interface FiltroAuditoria {
  readonly iglesiaId?: string;
  readonly uid?: string;
  readonly desde?: Date;
  readonly hasta?: Date;
}

export interface AuditoriaRepositoryPort {
  /** Inmutable: no existen métodos `update`/`delete` en este puerto (Requirement 13.2). */
  registrar(evento: RegistrarEventoAuditoriaInput): Promise<AuditoriaEvento>;
  listar(filtro: FiltroAuditoria): Promise<readonly AuditoriaEvento[]>;
}

/**
 * Puerto de repositorio de Unidad_Accion (Requerimiento 19.2).
 *
 * Implementado por `FirestoreUnidadAccionRepository` (tarea 26.2) y por
 * `InMemoryUnidadAccionRepository` (tarea 8.4).
 */
import type { UnidadAccion } from "../../domain/entities/unidad-accion.entity";

export interface UnidadAccionRepositoryPort {
  findById(id: string): Promise<UnidadAccion | null>;
  /** Crea o actualiza (upsert) una Unidad_Accion. */
  save(unidad: UnidadAccion): Promise<UnidadAccion>;
  listByIglesia(iglesiaId: string): Promise<readonly UnidadAccion[]>;
  /** "Mis Unidades" de un Maestro (Requirement 5.6, Property 15). */
  listByMaestro(maestroUid: string): Promise<readonly UnidadAccion[]>;
}

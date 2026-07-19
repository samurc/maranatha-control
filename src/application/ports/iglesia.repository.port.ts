/**
 * Puerto de repositorio de Iglesia (Requerimiento 19.2).
 *
 * Implementado por `FirestoreIglesiaRepository` (tarea 26.1) y por
 * `InMemoryIglesiaRepository` (tarea 8.4).
 */
import type { Iglesia } from "../../domain/entities/iglesia.entity";

export interface IglesiaRepositoryPort {
  findById(id: string): Promise<Iglesia | null>;
  /** Usado para la verificación de unicidad de `id_oficial` (Requirement 3.4, Property 8). */
  findByIdOficial(idOficial: string): Promise<Iglesia | null>;
  /** Crea o actualiza (upsert) una Iglesia. */
  save(iglesia: Iglesia): Promise<Iglesia>;
  /** Eliminación permanente, restringida a `admin_global` (Requirement 3.8). */
  delete(id: string): Promise<void>;
  listByAsociacion(asociacionId: string): Promise<readonly Iglesia[]>;
  listByDistrito(distritoId: string): Promise<readonly Iglesia[]>;
  list(): Promise<readonly Iglesia[]>;
}

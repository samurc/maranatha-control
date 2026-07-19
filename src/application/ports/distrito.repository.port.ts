/**
 * Puerto de repositorio de Distrito (Requerimiento 19.2).
 *
 * Implementado por `FirestoreDistritoRepository` (tarea 26.1) y por
 * `InMemoryDistritoRepository` (tarea 8.4).
 */
import type { Distrito } from "../../domain/entities/distrito.entity";

export interface DistritoRepositoryPort {
  findById(id: string): Promise<Distrito | null>;
  /** Crea o actualiza (upsert) un Distrito. */
  save(distrito: Distrito): Promise<Distrito>;
  listByAsociacion(asociacionId: string): Promise<readonly Distrito[]>;
}

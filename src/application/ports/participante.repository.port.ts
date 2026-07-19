/**
 * Puerto de repositorio de Participante (Requerimiento 19.2).
 *
 * Implementado por `FirestoreParticipanteRepository` (tarea 26.2) y por
 * `InMemoryParticipanteRepository` (tarea 8.4).
 */
import type { Participante } from "../../domain/entities/participante.entity";

export interface ParticipanteRepositoryPort {
  findById(id: string): Promise<Participante | null>;
  /** Resuelve el Participante vinculado a un Alumno (Requirement 6.5, 6.6). */
  findByUserUid(userUid: string): Promise<Participante | null>;
  /** Resuelve el Participante titular de un código de enlace pendiente de canje (Requirement 1.7, 1.8). */
  findByCodigoEnlace(codigo: string): Promise<Participante | null>;
  /** Crea o actualiza (upsert) un Participante. */
  save(participante: Participante): Promise<Participante>;
  /** Eliminación permanente, usada por `eliminar-datos-participante.use-case.ts` (Requirement 21.3). */
  delete(id: string): Promise<void>;
  listByUnidad(unidadId: string): Promise<readonly Participante[]>;
  listByIglesia(iglesiaId: string): Promise<readonly Participante[]>;
}

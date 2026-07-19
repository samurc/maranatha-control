/**
 * Puerto de repositorio de Asociacion_Mision (Requerimiento 19.2).
 *
 * Interfaz de Aplicación implementada por `FirestoreAsociacionRepository`
 * (tarea 26.1) y por `InMemoryAsociacionRepository` (tarea 8.4, uso
 * exclusivo en pruebas de casos de uso).
 */
import type { Asociacion } from "../../domain/entities/asociacion.entity";

export interface AsociacionRepositoryPort {
  findById(id: string): Promise<Asociacion | null>;
  /** Crea o actualiza (upsert) una Asociacion_Mision. */
  save(asociacion: Asociacion): Promise<Asociacion>;
  list(): Promise<readonly Asociacion[]>;
}

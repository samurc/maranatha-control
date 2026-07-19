/**
 * Puerto de repositorio de Registro_Sabatico (Requerimiento 19.2).
 *
 * `save()` DEBE implementarse como una única escritura consolidada
 * (`setDoc`/`updateDoc` transaccional en `FirestoreRegistroSabaticoRepository`,
 * tarea 26.3), `upsert` idempotente por el ID determinístico del Registro
 * (Requirement 7.1, 14.4).
 */
import type { RegistroSabatico } from "../../domain/entities/registro-sabatico.entity";

export interface RegistroSabaticoRepositoryPort {
  findById(id: string): Promise<RegistroSabatico | null>;
  /** Upsert idempotente en una única escritura (Requirement 7.1, 14.4). */
  save(registro: RegistroSabatico): Promise<RegistroSabatico>;
  /** Eliminación permanente, restringida a `admin_global` (Requirement 7.9). */
  delete(id: string): Promise<void>;
  listByUnidad(unidadId: string): Promise<readonly RegistroSabatico[]>;
  listByIglesia(iglesiaId: string): Promise<readonly RegistroSabatico[]>;
}

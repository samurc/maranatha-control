/**
 * Doble en memoria de `UnidadAccionRepositoryPort` (tarea 8.4).
 */
import type { UnidadAccion } from "../../domain/entities/unidad-accion.entity";
import type { UnidadAccionRepositoryPort } from "../ports/unidad-accion.repository.port";

export class InMemoryUnidadAccionRepository
  implements UnidadAccionRepositoryPort
{
  private readonly store = new Map<string, UnidadAccion>();

  constructor(seed: readonly UnidadAccion[] = []) {
    for (const unidad of seed) {
      this.store.set(unidad.id, unidad);
    }
  }

  async findById(id: string): Promise<UnidadAccion | null> {
    return this.store.get(id) ?? null;
  }

  async save(unidad: UnidadAccion): Promise<UnidadAccion> {
    this.store.set(unidad.id, unidad);
    return unidad;
  }

  async listByIglesia(iglesiaId: string): Promise<readonly UnidadAccion[]> {
    return [...this.store.values()].filter(
      (unidad) => unidad.iglesiaId === iglesiaId
    );
  }

  async listByMaestro(maestroUid: string): Promise<readonly UnidadAccion[]> {
    return [...this.store.values()].filter(
      (unidad) => unidad.maestroUid === maestroUid
    );
  }
}

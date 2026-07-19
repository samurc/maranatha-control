/**
 * Doble en memoria de `DistritoRepositoryPort` (tarea 8.4).
 */
import type { Distrito } from "../../domain/entities/distrito.entity";
import type { DistritoRepositoryPort } from "../ports/distrito.repository.port";

export class InMemoryDistritoRepository implements DistritoRepositoryPort {
  private readonly store = new Map<string, Distrito>();

  constructor(seed: readonly Distrito[] = []) {
    for (const distrito of seed) {
      this.store.set(distrito.id, distrito);
    }
  }

  async findById(id: string): Promise<Distrito | null> {
    return this.store.get(id) ?? null;
  }

  async save(distrito: Distrito): Promise<Distrito> {
    this.store.set(distrito.id, distrito);
    return distrito;
  }

  async listByAsociacion(asociacionId: string): Promise<readonly Distrito[]> {
    return [...this.store.values()].filter(
      (distrito) => distrito.asociacionId === asociacionId
    );
  }
}

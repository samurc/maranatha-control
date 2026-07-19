/**
 * Doble en memoria de `IglesiaRepositoryPort` (tarea 8.4).
 */
import type { Iglesia } from "../../domain/entities/iglesia.entity";
import type { IglesiaRepositoryPort } from "../ports/iglesia.repository.port";

export class InMemoryIglesiaRepository implements IglesiaRepositoryPort {
  private readonly store = new Map<string, Iglesia>();

  constructor(seed: readonly Iglesia[] = []) {
    for (const iglesia of seed) {
      this.store.set(iglesia.id, iglesia);
    }
  }

  async findById(id: string): Promise<Iglesia | null> {
    return this.store.get(id) ?? null;
  }

  async findByIdOficial(idOficial: string): Promise<Iglesia | null> {
    for (const iglesia of this.store.values()) {
      if (iglesia.idOficial === idOficial) {
        return iglesia;
      }
    }
    return null;
  }

  async save(iglesia: Iglesia): Promise<Iglesia> {
    this.store.set(iglesia.id, iglesia);
    return iglesia;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async listByAsociacion(asociacionId: string): Promise<readonly Iglesia[]> {
    return [...this.store.values()].filter(
      (iglesia) => iglesia.asociacionId === asociacionId
    );
  }

  async listByDistrito(distritoId: string): Promise<readonly Iglesia[]> {
    return [...this.store.values()].filter(
      (iglesia) => iglesia.distritoId === distritoId
    );
  }

  async list(): Promise<readonly Iglesia[]> {
    return [...this.store.values()];
  }
}

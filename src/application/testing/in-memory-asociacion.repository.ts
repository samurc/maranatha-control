/**
 * Doble en memoria de `AsociacionRepositoryPort` (tarea 8.4), para uso
 * exclusivo en pruebas de casos de uso (Requerimiento 19.3, 19.5): permite
 * invocar cada caso de uso de forma independiente de Firebase/Next.js.
 */
import type { Asociacion } from "../../domain/entities/asociacion.entity";
import type { AsociacionRepositoryPort } from "../ports/asociacion.repository.port";

export class InMemoryAsociacionRepository implements AsociacionRepositoryPort {
  private readonly store = new Map<string, Asociacion>();

  constructor(seed: readonly Asociacion[] = []) {
    for (const asociacion of seed) {
      this.store.set(asociacion.id, asociacion);
    }
  }

  async findById(id: string): Promise<Asociacion | null> {
    return this.store.get(id) ?? null;
  }

  async save(asociacion: Asociacion): Promise<Asociacion> {
    this.store.set(asociacion.id, asociacion);
    return asociacion;
  }

  async list(): Promise<readonly Asociacion[]> {
    return [...this.store.values()];
  }
}

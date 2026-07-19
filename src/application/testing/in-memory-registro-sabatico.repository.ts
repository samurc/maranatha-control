/**
 * Doble en memoria de `RegistroSabaticoRepositoryPort` (tarea 8.4).
 */
import type { RegistroSabatico } from "../../domain/entities/registro-sabatico.entity";
import type { RegistroSabaticoRepositoryPort } from "../ports/registro-sabatico.repository.port";

export class InMemoryRegistroSabaticoRepository
  implements RegistroSabaticoRepositoryPort
{
  private readonly store = new Map<string, RegistroSabatico>();

  constructor(seed: readonly RegistroSabatico[] = []) {
    for (const registro of seed) {
      this.store.set(registro.id, registro);
    }
  }

  async findById(id: string): Promise<RegistroSabatico | null> {
    return this.store.get(id) ?? null;
  }

  async save(registro: RegistroSabatico): Promise<RegistroSabatico> {
    this.store.set(registro.id, registro);
    return registro;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async listByUnidad(unidadId: string): Promise<readonly RegistroSabatico[]> {
    return [...this.store.values()].filter(
      (registro) => registro.unidadId === unidadId
    );
  }

  async listByIglesia(
    iglesiaId: string
  ): Promise<readonly RegistroSabatico[]> {
    return [...this.store.values()].filter(
      (registro) => registro.iglesiaId === iglesiaId
    );
  }
}

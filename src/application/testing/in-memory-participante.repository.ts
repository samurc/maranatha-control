/**
 * Doble en memoria de `ParticipanteRepositoryPort` (tarea 8.4).
 */
import type { Participante } from "../../domain/entities/participante.entity";
import type { ParticipanteRepositoryPort } from "../ports/participante.repository.port";

export class InMemoryParticipanteRepository
  implements ParticipanteRepositoryPort
{
  private readonly store = new Map<string, Participante>();

  constructor(seed: readonly Participante[] = []) {
    for (const participante of seed) {
      this.store.set(participante.id, participante);
    }
  }

  async findById(id: string): Promise<Participante | null> {
    return this.store.get(id) ?? null;
  }

  async findByUserUid(userUid: string): Promise<Participante | null> {
    for (const participante of this.store.values()) {
      if (participante.userUid === userUid) {
        return participante;
      }
    }
    return null;
  }

  async findByCodigoEnlace(codigo: string): Promise<Participante | null> {
    for (const participante of this.store.values()) {
      if (participante.codigoEnlace?.codigo === codigo) {
        return participante;
      }
    }
    return null;
  }

  async save(participante: Participante): Promise<Participante> {
    this.store.set(participante.id, participante);
    return participante;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async listByUnidad(unidadId: string): Promise<readonly Participante[]> {
    return [...this.store.values()].filter(
      (participante) => participante.unidadId === unidadId
    );
  }

  async listByIglesia(iglesiaId: string): Promise<readonly Participante[]> {
    return [...this.store.values()].filter(
      (participante) => participante.iglesiaId === iglesiaId
    );
  }
}

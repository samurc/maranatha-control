/**
 * Doble en memoria de `SearchChurchPort` (tarea 8.4), usado por las
 * pruebas del caso de uso `buscar-iglesia-oficial.use-case.ts` (tarea 11.x)
 * sin invocar la API externa real.
 */
import type {
  IglesiaOficial,
  SearchChurchPort,
} from "../ports/search-church.port";
import { SearchChurchTimeoutError } from "../ports/search-church.port";

export class InMemorySearchChurchPort implements SearchChurchPort {
  constructor(
    private readonly resultados: readonly IglesiaOficial[] = [],
    /** Simula el timeout de 10s de la implementación real (Requirement 4.3, tarea 11.4). */
    private readonly simularTimeout = false
  ) {}

  async buscar(criterio: string): Promise<readonly IglesiaOficial[]> {
    if (this.simularTimeout) {
      throw new SearchChurchTimeoutError();
    }
    const criterioNormalizado = criterio.trim().toLowerCase();
    return this.resultados.filter((resultado) =>
      resultado.nombre.toLowerCase().includes(criterioNormalizado)
    );
  }
}

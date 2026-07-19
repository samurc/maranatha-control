/**
 * `SearchChurchHttpAdapter` (Requerimiento 4.1, 4.3, tarea 28.1, Property
 * 11).
 *
 * Implementa `SearchChurchPort` como cliente HTTP de una Cloud Function
 * intermediaria (`onCall`) que a su vez consulta la API externa
 * "SearchChurch". Las credenciales de esa API (API key/token) viven
 * exclusivamente en las variables de entorno del SERVIDOR que ejecuta la
 * Cloud Function, no en este adaptador ni en ningún código que se envíe
 * al cliente — este adaptador solo conoce la URL del endpoint y el token
 * de sesión de Firebase Auth del usuario que invoca la búsqueda (para que
 * la Cloud Function autentique al llamador), nunca la credencial de la
 * API externa (Property 11: la respuesta serializada retornada NUNCA
 * contiene esa credencial, porque este adaptador ni siquiera la posee).
 *
 * Aplica un `AbortController` con timeout de 10 segundos (Requirement
 * 4.3): al expirar, lanza `SearchChurchTimeoutError`, que el caso de uso
 * `buscar-iglesia-oficial.use-case.ts` traduce a un error de `conflicto`
 * con alternativa de registro manual.
 */

import {
  SearchChurchTimeoutError,
  type IglesiaOficial,
  type SearchChurchPort,
} from "../../application/ports/search-church.port";

const TIMEOUT_MS = 10_000;

export interface SearchChurchHttpAdapterConfig {
  /** URL de la Cloud Function `onCall` intermediaria (nunca la URL de la API externa directamente). */
  readonly endpointUrl: string;
  /** Token de sesión de Firebase Auth del usuario que invoca la búsqueda. */
  readonly obtenerTokenSesion: () => Promise<string>;
  /** Inyectable para pruebas; por defecto `globalThis.fetch`. */
  readonly fetchFn?: typeof fetch;
}

interface RespuestaSearchChurch {
  readonly resultados: readonly IglesiaOficial[];
}

export class SearchChurchHttpAdapter implements SearchChurchPort {
  private readonly fetchFn: typeof fetch;

  constructor(private readonly config: SearchChurchHttpAdapterConfig) {
    this.fetchFn = config.fetchFn ?? globalThis.fetch;
  }

  async buscar(criterio: string): Promise<readonly IglesiaOficial[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const token = await this.config.obtenerTokenSesion();
      const respuesta = await this.fetchFn(this.config.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ criterio }),
        signal: controller.signal,
      });

      if (!respuesta.ok) {
        throw new Error(
          `SearchChurch respondió con estado HTTP ${respuesta.status}.`
        );
      }

      const data = (await respuesta.json()) as RespuestaSearchChurch;
      return data.resultados;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || controller.signal.aborted)
      ) {
        throw new SearchChurchTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

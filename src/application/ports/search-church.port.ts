/**
 * Puerto/adaptador DDD para la integración con la API oficial "SearchChurch"
 * de la IASD (Requerimiento 4, design.md sección "Puerto SearchChurch").
 *
 * La implementación concreta (`SearchChurchHttpAdapter`, tarea 28.1) es una
 * Cloud Function `onCall` intermedia que agrega credenciales de API desde
 * variables de entorno del servidor (nunca enviadas al cliente) y aplica
 * un `AbortController` con timeout de 10s. `BuscarIglesiaOficialUseCase`
 * (tarea 11.1) solo conoce este puerto, no el adaptador.
 */

/** Resultado de búsqueda retornado por SearchChurch, mapeado a borrador de Iglesia (Requirement 4.2). */
export interface IglesiaOficial {
  readonly idOficial: string;
  readonly nombre: string;
  readonly paisCodigo: string;
}

/**
 * Lanzada por la implementación concreta cuando la API SearchChurch no
 * responde dentro del tiempo de espera de 10 segundos (Requirement 4.3).
 */
export class SearchChurchTimeoutError extends Error {
  constructor(message = "La búsqueda de Iglesia oficial superó el tiempo de espera de 10 segundos.") {
    super(message);
    this.name = "SearchChurchTimeoutError";
  }
}

export interface SearchChurchPort {
  /** Debe resolver con los resultados coincidentes, o lanzar `SearchChurchTimeoutError` a los 10s. */
  buscar(criterio: string): Promise<readonly IglesiaOficial[]>;
}

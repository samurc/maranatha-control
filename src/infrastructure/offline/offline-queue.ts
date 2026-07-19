/**
 * `OfflineQueue` (Requerimiento 18.1, 18.2, 18.4, tareas 32.1, 32.3, 32.5).
 *
 * Cola de comandos consolidados de la Interfaz_Grilla_Asistencia,
 * persistida localmente vía `OfflineStoragePort` (IndexedDB en
 * producción, `InMemoryOfflineStoragePort` en pruebas). Provee:
 *
 * - `encolar(comando)` (Requirement 18.1, Property 43): SIEMPRE resuelve
 *   de inmediato (nunca bloquea la interacción del Maestro con la
 *   grilla), delegando la persistencia real a `storage.encolar`, que es
 *   asíncrona pero no se espera de forma sincronizante con la UI — el
 *   llamador (la Grilla, tarea 35.6) decide si espera la promesa o solo
 *   la dispara ("fire and forget" con manejo de errores propio); esta
 *   clase no impone un `await` bloqueante adicional más allá de lo que
 *   ya hace la propia operación de IndexedDB.
 * - `sincronizarPendientes(ejecutarRegistrarAsistencia)` (Requirement
 *   18.2, Property 44): reintenta en orden FIFO cada comando pendiente
 *   invocando el caso de uso `registrar-asistencia.use-case.ts`
 *   inyectado; si la ejecución es exitosa, retira el comando de la cola
 *   pendiente. Si el caso de uso retorna un error de `conflicto` (que es
 *   exactamente lo que `verificarRegistroEditable` produce cuando el
 *   Registro remoto pasó a `estado=cerrado` mientras el dispositivo
 *   estaba desconectado, Requirement 18.3, Property 45), el comando se
 *   mueve a `comandos_en_conflicto` en vez de reintentarse indefinidamente
 *   o descartarse silenciosamente. Cualquier otro tipo de error deja el
 *   comando en la cola pendiente para un reintento posterior (p. ej. si
 *   la reconexión fue momentánea).
 * - `tieneCambiosPendientes()` (Requirement 18.4): indicador booleano
 *   consumido por la Interfaz_Grilla_Asistencia (tarea 35.8) para el
 *   indicador visual de sincronización pendiente.
 */

import { isErr } from "../../domain/shared";
import type { Result, DomainError } from "../../domain/shared";
import type { RegistroSabatico } from "../../domain/entities/registro-sabatico.entity";
import type { OfflineCommand, OfflineStoragePort } from "./offline-storage.port";

/** Firma del caso de uso `registrar-asistencia`, ya con sus dependencias inyectadas. */
export type EjecutarRegistrarAsistencia = (
  actorClaims: OfflineCommand["actorClaims"],
  input: unknown
) => Promise<Result<RegistroSabatico, DomainError>>;

export interface ResultadoSincronizacion {
  readonly sincronizados: readonly string[];
  readonly enConflicto: readonly string[];
  readonly reintentables: readonly string[];
}

export class OfflineQueue {
  constructor(private readonly storage: OfflineStoragePort) {}

  /**
   * Encola un comando consolidado. Nunca lanza ni bloquea la interacción
   * del Maestro (Requirement 18.1, Property 43): toda falla de
   * persistencia local se resuelve internamente re-lanzando como un
   * rechazo de la promesa retornada, que el llamador puede manejar sin
   * que esta clase imponga un bloqueo adicional de UI.
   */
  async encolar(comando: OfflineCommand): Promise<void> {
    await this.storage.encolar(comando);
  }

  async tieneCambiosPendientes(): Promise<boolean> {
    const pendientes = await this.storage.listarPendientes();
    return pendientes.length > 0;
  }

  async listarPendientes(): Promise<readonly OfflineCommand[]> {
    return this.storage.listarPendientes();
  }

  async listarEnConflicto(): Promise<readonly OfflineCommand[]> {
    return this.storage.listarEnConflicto();
  }

  /**
   * Sincroniza en orden FIFO todos los comandos pendientes (Requirement
   * 18.2, Property 44). Para cada comando, en el orden en que fue
   * encolado:
   *
   * - Éxito: se retira de la cola pendiente.
   * - Error de `conflicto` (Registro remoto cerrado, Requirement 18.3,
   *   Property 45): se mueve a `comandos_en_conflicto`, sin aplicarlo ni
   *   descartarlo.
   * - Cualquier otro error: permanece en la cola pendiente para un
   *   reintento posterior.
   */
  async sincronizarPendientes(
    ejecutarRegistrarAsistencia: EjecutarRegistrarAsistencia
  ): Promise<ResultadoSincronizacion> {
    const pendientes = await this.storage.listarPendientes();
    const sincronizados: string[] = [];
    const enConflicto: string[] = [];
    const reintentables: string[] = [];

    for (const comando of pendientes) {
      const resultado = await ejecutarRegistrarAsistencia(
        comando.actorClaims,
        comando.dto
      );

      if (!isErr(resultado)) {
        await this.storage.eliminarPendiente(comando.id);
        sincronizados.push(comando.id);
        continue;
      }

      if (resultado.error.kind === "conflicto") {
        await this.storage.moverAConflicto(comando);
        enConflicto.push(comando.id);
        continue;
      }

      reintentables.push(comando.id);
    }

    return { sincronizados, enConflicto, reintentables };
  }
}

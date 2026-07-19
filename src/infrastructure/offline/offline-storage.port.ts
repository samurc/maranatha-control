/**
 * Puerto de persistencia local para `OfflineQueue` (Requerimiento 18.1,
 * tarea 32.1).
 *
 * Abstrae el mecanismo de almacenamiento local (IndexedDB en producción,
 * un doble en memoria en pruebas) para que `OfflineQueue` sea Firebase/
 * navegador-agnóstica y pueda probarse con Vitest sin `jsdom` ni un
 * polyfill de IndexedDB.
 */
import type { CustomClaims } from "../../domain/value-objects/custom-claims.vo";
import type { RegistrarAsistenciaDto } from "../../application/dto/registro-sabatico.schema";

/**
 * Comando consolidado encolado por la Interfaz_Grilla_Asistencia: un
 * único DTO de `registrar-asistencia.use-case.ts` (ya consolidado por el
 * botón "Guardar", Requirement 14.4) junto con los Custom_Claims del
 * actor que lo generó (necesarios para reintentar la ejecución del caso
 * de uso al reconectar, sin depender de una sesión de Auth activa en ese
 * momento).
 */
export interface OfflineCommand {
  readonly id: string;
  readonly actorClaims: CustomClaims;
  readonly dto: RegistrarAsistenciaDto;
  readonly encoladoEn: Date;
}

export interface OfflineStoragePort {
  /** Encola `comando` al final de la cola FIFO pendiente. */
  encolar(comando: OfflineCommand): Promise<void>;
  /** Comandos pendientes, en orden FIFO (el primero encolado es el primero de la lista). */
  listarPendientes(): Promise<readonly OfflineCommand[]>;
  /** Retira un comando de la cola pendiente (tras sincronizarlo exitosamente). */
  eliminarPendiente(id: string): Promise<void>;
  /** Mueve un comando de la cola pendiente a `comandos_en_conflicto` (Requirement 18.3). */
  moverAConflicto(comando: OfflineCommand): Promise<void>;
  /** Comandos en conflicto, pendientes de revisión manual del Maestro. */
  listarEnConflicto(): Promise<readonly OfflineCommand[]>;
}

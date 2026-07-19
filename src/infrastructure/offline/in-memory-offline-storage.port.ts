/**
 * Doble en memoria de `OfflineStoragePort`, para pruebas de `OfflineQueue`
 * sin depender de IndexedDB/`jsdom`.
 */
import type { OfflineCommand, OfflineStoragePort } from "./offline-storage.port";

export class InMemoryOfflineStoragePort implements OfflineStoragePort {
  private pendientes: OfflineCommand[] = [];
  private enConflicto: OfflineCommand[] = [];

  async encolar(comando: OfflineCommand): Promise<void> {
    this.pendientes.push(comando);
  }

  async listarPendientes(): Promise<readonly OfflineCommand[]> {
    return [...this.pendientes];
  }

  async eliminarPendiente(id: string): Promise<void> {
    this.pendientes = this.pendientes.filter((c) => c.id !== id);
  }

  async moverAConflicto(comando: OfflineCommand): Promise<void> {
    this.pendientes = this.pendientes.filter((c) => c.id !== comando.id);
    this.enConflicto.push(comando);
  }

  async listarEnConflicto(): Promise<readonly OfflineCommand[]> {
    return [...this.enConflicto];
  }
}

/**
 * Doble en memoria de `AuditoriaRepositoryPort` (tarea 8.4).
 */
import type { AuditoriaEvento } from "../../domain/entities/auditoria-evento.entity";
import type {
  AuditoriaRepositoryPort,
  FiltroAuditoria,
  RegistrarEventoAuditoriaInput,
} from "../ports/auditoria.repository.port";
import type { ClockPort } from "../ports/clock.port";

export class InMemoryAuditoriaRepository implements AuditoriaRepositoryPort {
  private readonly eventos: AuditoriaEvento[] = [];
  private nextId = 1;

  constructor(private readonly clock: ClockPort) {}

  async registrar(
    evento: RegistrarEventoAuditoriaInput
  ): Promise<AuditoriaEvento> {
    const registrado: AuditoriaEvento = {
      id: String(this.nextId++),
      uid: evento.uid,
      accion: evento.accion,
      recursoAfectado: evento.recursoAfectado,
      iglesiaId: evento.iglesiaId,
      timestamp: this.clock.now(),
    };
    this.eventos.push(registrado);
    return registrado;
  }

  async listar(filtro: FiltroAuditoria): Promise<readonly AuditoriaEvento[]> {
    return this.eventos.filter((evento) => {
      if (filtro.iglesiaId !== undefined && evento.iglesiaId !== filtro.iglesiaId) {
        return false;
      }
      if (filtro.uid !== undefined && evento.uid !== filtro.uid) {
        return false;
      }
      if (filtro.desde !== undefined && evento.timestamp < filtro.desde) {
        return false;
      }
      if (filtro.hasta !== undefined && evento.timestamp > filtro.hasta) {
        return false;
      }
      return true;
    });
  }
}

import { describe, expect, it } from "vitest";
import { OfflineQueue } from "./offline-queue";
import { InMemoryOfflineStoragePort } from "./in-memory-offline-storage.port";
import { ok, err } from "../../domain/shared";
import { conflictError, notFoundError } from "../../domain/shared/domain-error";
import type { OfflineCommand } from "./offline-storage.port";
import type { RegistroSabatico } from "../../domain/entities/registro-sabatico.entity";
import type { CustomClaims } from "../../domain/value-objects/custom-claims.vo";

const MAESTRO: CustomClaims = { uid: "maestro1", role: "maestro", iglesiaId: "igl1" };

function comando(id: string, encoladoEn: Date): OfflineCommand {
  return {
    id,
    actorClaims: MAESTRO,
    dto: {
      iglesiaId: "igl1",
      unidadId: "ua1",
      fechaReferencia: encoladoEn,
      cambios: [{ participanteId: "p1", presente: true, diasEstudio: 3 }],
    },
    encoladoEn,
  };
}

const REGISTRO_FALSO: RegistroSabatico = {
  id: "igl1_ua1_2024_T1_S1",
  iglesiaId: "igl1",
  unidadId: "ua1",
  sabadoEclesiastico: { anio: 2024, numeroTrimestre: 1, numeroSabado: 1, fechaISO: "2024-01-06", timezone: "America/Santiago" },
  estado: "borrador",
  asistencia: {},
  totalesRapidos: { presentes: 0, ausentes: 0, visitas: 0 },
  creadoEn: new Date(),
  actualizadoEn: new Date(),
};

describe("OfflineQueue (Property 43, 44, 45)", () => {
  it("encolar nunca lanza y persiste el comando (Requirement 18.1, Property 43)", async () => {
    const storage = new InMemoryOfflineStoragePort();
    const queue = new OfflineQueue(storage);

    await expect(queue.encolar(comando("c1", new Date()))).resolves.toBeUndefined();
    expect(await queue.tieneCambiosPendientes()).toBe(true);
  });

  it("sincroniza en orden FIFO y retira los comandos exitosos (Requirement 18.2, Property 44)", async () => {
    const storage = new InMemoryOfflineStoragePort();
    const queue = new OfflineQueue(storage);
    const ordenEjecutado: string[] = [];

    await queue.encolar(comando("c1", new Date("2024-01-01T00:00:00Z")));
    await queue.encolar(comando("c2", new Date("2024-01-02T00:00:00Z")));

    const resultado = await queue.sincronizarPendientes(async (_claims, dto) => {
      const d = dto as { unidadId: string };
      ordenEjecutado.push(d.unidadId);
      return ok(REGISTRO_FALSO);
    });

    expect(resultado.sincronizados).toEqual(["c1", "c2"]);
    expect(await queue.tieneCambiosPendientes()).toBe(false);
  });

  it("mueve a comandos_en_conflicto sin aplicar ni descartar (Requirement 18.3, Property 45)", async () => {
    const storage = new InMemoryOfflineStoragePort();
    const queue = new OfflineQueue(storage);

    await queue.encolar(comando("c1", new Date()));

    const resultado = await queue.sincronizarPendientes(async () =>
      err(conflictError("El Registro_Sabatico está cerrado."))
    );

    expect(resultado.enConflicto).toEqual(["c1"]);
    expect(await queue.tieneCambiosPendientes()).toBe(false);
    const enConflicto = await queue.listarEnConflicto();
    expect(enConflicto.map((c) => c.id)).toEqual(["c1"]);
  });

  it("deja el comando en la cola pendiente ante un error distinto de conflicto (reintento posterior)", async () => {
    const storage = new InMemoryOfflineStoragePort();
    const queue = new OfflineQueue(storage);

    await queue.encolar(comando("c1", new Date()));

    const resultado = await queue.sincronizarPendientes(async () =>
      err(notFoundError("La Unidad_Accion no existe."))
    );

    expect(resultado.reintentables).toEqual(["c1"]);
    expect(await queue.tieneCambiosPendientes()).toBe(true);
  });
});

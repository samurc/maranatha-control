import { describe, expect, it } from "vitest";
import { crearAsignarSupervisorDistritoUseCase } from "./asignar-supervisor-distrito.use-case";
import { InMemoryDistritoRepository, InMemoryAuditoriaRepository, FakeClockPort } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const distritos = new InMemoryDistritoRepository([
    { id: "dis1", nombre: "Distrito Sur", asociacionId: "aso1", creadoEn: new Date() },
  ]);
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { distritos, auditoria };
}

describe("asignar-supervisor-distrito.use-case", () => {
  it("admin_global asigna el supervisor a un Distrito existente", async () => {
    const deps = crearDeps();
    const execute = crearAsignarSupervisorDistritoUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, {
      distritoId: "dis1",
      supervisorUid: "pastor1",
    });

    expect(isOk(resultado)).toBe(true);
    const distrito = await deps.distritos.findById("dis1");
    expect(distrito?.supervisorUid).toBe("pastor1");
  });

  it("rechaza cuando el Distrito no existe", async () => {
    const deps = crearDeps();
    const execute = crearAsignarSupervisorDistritoUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, {
      distritoId: "dis-inexistente",
      supervisorUid: "pastor1",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("no_encontrado");
    }
  });

  it("rechaza a un actor sin rol admin_global", async () => {
    const deps = crearDeps();
    const execute = crearAsignarSupervisorDistritoUseCase(deps);
    const adminAsociacion: CustomClaims = {
      uid: "actor2",
      role: "admin_asociacion",
      asociacionId: "aso1",
    };

    const resultado = await execute(adminAsociacion, {
      distritoId: "dis1",
      supervisorUid: "pastor1",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

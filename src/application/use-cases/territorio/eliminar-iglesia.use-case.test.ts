import { describe, expect, it } from "vitest";
import { crearEliminarIglesiaUseCase } from "./eliminar-iglesia.use-case";
import { InMemoryIglesiaRepository, InMemoryAuditoriaRepository, FakeClockPort } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { Iglesia } from "../../../domain/entities/iglesia.entity";

const IGLESIA_BASE: Iglesia = {
  id: "igl1",
  idOficial: "igl1",
  nombre: "Iglesia Central",
  asociacionId: "aso1",
  distritoId: "dis1",
  paisCodigo: "CL",
  fechaAlta: new Date("2023-01-01T00:00:00Z"),
  creadoEn: new Date("2023-01-01T00:00:00Z"),
};

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const iglesias = new InMemoryIglesiaRepository([IGLESIA_BASE]);
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { iglesias, auditoria };
}

describe("eliminar-iglesia.use-case", () => {
  it("admin_global elimina permanentemente la Iglesia (Property 9)", async () => {
    const deps = crearDeps();
    const execute = crearEliminarIglesiaUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, { id: "igl1" });

    expect(isOk(resultado)).toBe(true);
    expect(await deps.iglesias.findById("igl1")).toBeNull();
  });

  it("rechaza a cualquier actor cuyo rol no sea admin_global (Property 9)", async () => {
    const deps = crearDeps();
    const execute = crearEliminarIglesiaUseCase(deps);
    const adminAsociacion: CustomClaims = {
      uid: "actor2",
      role: "admin_asociacion",
      asociacionId: "aso1",
    };

    const resultado = await execute(adminAsociacion, { id: "igl1" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
    expect(await deps.iglesias.findById("igl1")).not.toBeNull();
  });
});

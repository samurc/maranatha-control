import { describe, expect, it } from "vitest";
import { crearEditarIglesiaUseCase } from "./editar-iglesia.use-case";
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

describe("editar-iglesia.use-case", () => {
  it("actualiza únicamente nombre/distrito_id/pais_codigo, preservando el resto (Property 10)", async () => {
    const deps = crearDeps();
    const execute = crearEditarIglesiaUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, {
      id: "igl1",
      nombre: "Iglesia Central Renovada",
    });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.nombre).toBe("Iglesia Central Renovada");
      expect(resultado.value.distritoId).toBe("dis1");
      expect(resultado.value.idOficial).toBe("igl1");
      expect(resultado.value.fechaAlta).toEqual(IGLESIA_BASE.fechaAlta);
    }
  });

  it("rechaza cuando la Iglesia no existe", async () => {
    const deps = crearDeps();
    const execute = crearEditarIglesiaUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, {
      id: "igl-inexistente",
      nombre: "X",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("no_encontrado");
    }
  });

  it("rechaza a un admin_asociacion de otra asociacion_id", async () => {
    const deps = crearDeps();
    const execute = crearEditarIglesiaUseCase(deps);
    const adminAsociacion: CustomClaims = {
      uid: "actor2",
      role: "admin_asociacion",
      asociacionId: "aso-otra",
    };

    const resultado = await execute(adminAsociacion, {
      id: "igl1",
      nombre: "Intento no autorizado",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("no_encontrado");
    }
  });
});

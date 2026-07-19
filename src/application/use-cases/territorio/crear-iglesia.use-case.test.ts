import { describe, expect, it } from "vitest";
import { crearCrearIglesiaUseCase } from "./crear-iglesia.use-case";
import { InMemoryIglesiaRepository, InMemoryAuditoriaRepository, FakeClockPort } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const iglesias = new InMemoryIglesiaRepository();
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { iglesias, auditoria, clock };
}

describe("crear-iglesia.use-case", () => {
  it("admin_global crea la Iglesia con fecha_alta igual al instante del reloj", async () => {
    const deps = crearDeps();
    const execute = crearCrearIglesiaUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, {
      idOficial: "IGL-001",
      nombre: "Iglesia Central",
      asociacionId: "aso1",
      distritoId: "dis1",
      paisCodigo: "CL",
    });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.fechaAlta).toEqual(new Date("2024-01-06T12:00:00Z"));
    }
    expect(await deps.auditoria.listar({})).toHaveLength(1);
  });

  it("rechaza id_oficial duplicado sin alterar la Iglesia existente (Property 8)", async () => {
    const deps = crearDeps();
    const execute = crearCrearIglesiaUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    await execute(adminGlobal, {
      idOficial: "IGL-001",
      nombre: "Iglesia Central",
      asociacionId: "aso1",
      distritoId: "dis1",
      paisCodigo: "CL",
    });

    const resultado = await execute(adminGlobal, {
      idOficial: "IGL-001",
      nombre: "Iglesia Duplicada",
      asociacionId: "aso2",
      distritoId: "dis2",
      paisCodigo: "AR",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("validacion");
    }
    const original = await deps.iglesias.findByIdOficial("IGL-001");
    expect(original?.nombre).toBe("Iglesia Central");
  });

  it("admin_asociacion fuera de su propia asociacion_id es rechazado", async () => {
    const deps = crearDeps();
    const execute = crearCrearIglesiaUseCase(deps);
    const adminAsociacion: CustomClaims = {
      uid: "actor2",
      role: "admin_asociacion",
      asociacionId: "aso-otra",
    };

    const resultado = await execute(adminAsociacion, {
      idOficial: "IGL-002",
      nombre: "Iglesia Norte",
      asociacionId: "aso1",
      distritoId: "dis1",
      paisCodigo: "CL",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

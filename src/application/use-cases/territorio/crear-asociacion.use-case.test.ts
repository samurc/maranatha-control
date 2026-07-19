import { describe, expect, it } from "vitest";
import { crearCrearAsociacionUseCase } from "./crear-asociacion.use-case";
import { InMemoryAsociacionRepository, InMemoryAuditoriaRepository, FakeClockPort } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const asociaciones = new InMemoryAsociacionRepository();
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { asociaciones, auditoria, clock, generarId: () => "aso-fixed" };
}

describe("crear-asociacion.use-case", () => {
  it("admin_global crea la Asociacion y se registra en auditoría", async () => {
    const deps = crearDeps();
    const execute = crearCrearAsociacionUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, {
      nombre: "Asociacion Central",
      paisCodigo: "CL",
    });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value).toMatchObject({
        id: "aso-fixed",
        nombre: "Asociacion Central",
        paisCodigo: "CL",
      });
    }
    expect(await deps.asociaciones.findById("aso-fixed")).not.toBeNull();
    expect(await deps.auditoria.listar({})).toHaveLength(1);
  });

  it("rechaza a un actor sin rol admin_global (Requirement 2.3)", async () => {
    const deps = crearDeps();
    const execute = crearCrearAsociacionUseCase(deps);
    const adminAsociacion: CustomClaims = {
      uid: "actor2",
      role: "admin_asociacion",
      asociacionId: "aso1",
    };

    const resultado = await execute(adminAsociacion, {
      nombre: "Asociacion Norte",
      paisCodigo: "CL",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
    expect(await deps.asociaciones.list()).toHaveLength(0);
  });
});

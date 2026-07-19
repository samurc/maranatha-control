import { describe, expect, it } from "vitest";
import { crearCrearUnidadAccionUseCase } from "./crear-unidad-accion.use-case";
import { InMemoryUnidadAccionRepository, InMemoryAuditoriaRepository, FakeClockPort } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const unidades = new InMemoryUnidadAccionRepository();
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { unidades, auditoria, clock, generarId: () => "ua-fixed" };
}

describe("crear-unidad-accion.use-case", () => {
  it("secretario crea la Unidad_Accion con estado=activa sobre su propia iglesia_id", async () => {
    const deps = crearDeps();
    const execute = crearCrearUnidadAccionUseCase(deps);
    const secretario: CustomClaims = { uid: "actor1", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, {
      iglesiaId: "igl1",
      nombre: "Clase de Jóvenes",
      maestroUid: "maestro1",
    });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.estado).toBe("activa");
    }
  });

  it("rechaza al secretario intentando crear en otra iglesia_id (Property 2)", async () => {
    const deps = crearDeps();
    const execute = crearCrearUnidadAccionUseCase(deps);
    const secretario: CustomClaims = { uid: "actor1", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, {
      iglesiaId: "igl2",
      nombre: "Clase de Jóvenes",
      maestroUid: "maestro1",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });

  it("rechaza a director_es (rol no operativo sobre Unidad_Accion, Property 14)", async () => {
    const deps = crearDeps();
    const execute = crearCrearUnidadAccionUseCase(deps);
    const directorEs: CustomClaims = { uid: "actor2", role: "director_es", iglesiaId: "igl1" };

    const resultado = await execute(directorEs, {
      iglesiaId: "igl1",
      nombre: "Clase de Jóvenes",
      maestroUid: "maestro1",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

import { describe, expect, it } from "vitest";
import { crearActualizarEstadoUnidadAccionUseCase } from "./actualizar-estado-unidad-accion.use-case";
import { InMemoryUnidadAccionRepository, InMemoryAuditoriaRepository, FakeClockPort } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { UnidadAccion } from "../../../domain/entities/unidad-accion.entity";

const UNIDAD_BASE: UnidadAccion = {
  id: "ua1",
  iglesiaId: "igl1",
  nombre: "Clase de Jóvenes",
  maestroUid: "maestro1",
  estado: "activa",
  creadoEn: new Date("2023-01-01T00:00:00Z"),
};

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const unidades = new InMemoryUnidadAccionRepository([UNIDAD_BASE]);
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { unidades, auditoria };
}

describe("actualizar-estado-unidad-accion.use-case", () => {
  it("secretario cambia el estado de activa a inactiva (Requirement 5.4)", async () => {
    const deps = crearDeps();
    const execute = crearActualizarEstadoUnidadAccionUseCase(deps);
    const secretario: CustomClaims = { uid: "actor1", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, { id: "ua1", estado: "inactiva" });

    expect(isOk(resultado)).toBe(true);
    const unidad = await deps.unidades.findById("ua1");
    expect(unidad?.estado).toBe("inactiva");
  });

  it("rechaza a un maestro (Requirement 5.4 restringe a Secretario)", async () => {
    const deps = crearDeps();
    const execute = crearActualizarEstadoUnidadAccionUseCase(deps);
    const maestro: CustomClaims = { uid: "maestro1", role: "maestro", iglesiaId: "igl1" };

    const resultado = await execute(maestro, { id: "ua1", estado: "inactiva" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

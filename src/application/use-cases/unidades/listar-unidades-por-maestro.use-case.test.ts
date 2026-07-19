import { describe, expect, it } from "vitest";
import { crearListarUnidadesPorMaestroUseCase } from "./listar-unidades-por-maestro.use-case";
import { InMemoryUnidadAccionRepository } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { UnidadAccion } from "../../../domain/entities/unidad-accion.entity";

const UNIDADES: UnidadAccion[] = [
  { id: "ua1", iglesiaId: "igl1", nombre: "A", maestroUid: "maestro1", estado: "activa", creadoEn: new Date() },
  { id: "ua2", iglesiaId: "igl1", nombre: "B", maestroUid: "maestro2", estado: "activa", creadoEn: new Date() },
  { id: "ua3", iglesiaId: "igl1", nombre: "C", maestroUid: "maestro1", estado: "inactiva", creadoEn: new Date() },
];

describe("listar-unidades-por-maestro.use-case", () => {
  it("retorna exactamente el subconjunto cuyo maestroUid coincide (Property 15)", async () => {
    const unidades = new InMemoryUnidadAccionRepository(UNIDADES);
    const execute = crearListarUnidadesPorMaestroUseCase({ unidades });
    const maestro: CustomClaims = { uid: "maestro1", role: "maestro", iglesiaId: "igl1" };

    const resultado = await execute(maestro, { maestroUid: "maestro1" });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.map((u) => u.id).sort()).toEqual(["ua1", "ua3"]);
    }
  });

  it("rechaza a un maestro intentando listar las Unidades de otro maestro", async () => {
    const unidades = new InMemoryUnidadAccionRepository(UNIDADES);
    const execute = crearListarUnidadesPorMaestroUseCase({ unidades });
    const maestro: CustomClaims = { uid: "maestro1", role: "maestro", iglesiaId: "igl1" };

    const resultado = await execute(maestro, { maestroUid: "maestro2" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

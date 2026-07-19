import { describe, expect, it } from "vitest";
import { crearBuscarIglesiaOficialUseCase } from "./buscar-iglesia-oficial.use-case";
import { InMemorySearchChurchPort } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";

describe("buscar-iglesia-oficial.use-case", () => {
  it("mapea cada resultado a un borrador de Iglesia con los mismos campos (Property 12)", async () => {
    const searchChurch = new InMemorySearchChurchPort([
      { idOficial: "IGL-100", nombre: "Iglesia Adventista Central", paisCodigo: "CL" },
    ]);
    const execute = crearBuscarIglesiaOficialUseCase({ searchChurch });
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, { criterio: "Central" });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value).toEqual([
        { idOficial: "IGL-100", nombre: "Iglesia Adventista Central", paisCodigo: "CL" },
      ]);
    }
  });

  it("rechaza a un actor sin rol admin_global ni admin_asociacion (Requirement 4.4)", async () => {
    const searchChurch = new InMemorySearchChurchPort([]);
    const execute = crearBuscarIglesiaOficialUseCase({ searchChurch });
    const secretario: CustomClaims = { uid: "actor2", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, { criterio: "Central" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });

  it("retorna un error de conflicto con alternativa de registro manual ante timeout (Requirement 4.3)", async () => {
    const searchChurch = new InMemorySearchChurchPort([], true);
    const execute = crearBuscarIglesiaOficialUseCase({ searchChurch });
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, { criterio: "Central" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("conflicto");
    }
  });
});

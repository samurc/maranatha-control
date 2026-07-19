import { describe, expect, it } from "vitest";
import { crearCrearDistritoUseCase } from "./crear-distrito.use-case";
import {
  InMemoryAsociacionRepository,
  InMemoryDistritoRepository,
  InMemoryAuditoriaRepository,
  FakeClockPort,
} from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const asociaciones = new InMemoryAsociacionRepository([
    { id: "aso1", nombre: "Asociacion Central", paisCodigo: "CL", creadoEn: new Date() },
  ]);
  const distritos = new InMemoryDistritoRepository();
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { asociaciones, distritos, auditoria, clock, generarId: () => "dis-fixed" };
}

describe("crear-distrito.use-case", () => {
  it("admin_global crea el Distrito cuando la asociacion_id existe", async () => {
    const deps = crearDeps();
    const execute = crearCrearDistritoUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, {
      nombre: "Distrito Sur",
      asociacionId: "aso1",
    });

    expect(isOk(resultado)).toBe(true);
    expect(await deps.distritos.findById("dis-fixed")).not.toBeNull();
    expect(await deps.auditoria.listar({})).toHaveLength(1);
  });

  it("rechaza la creación cuando la asociacion_id referenciada no existe (Requirement 2.4)", async () => {
    const deps = crearDeps();
    const execute = crearCrearDistritoUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, {
      nombre: "Distrito Fantasma",
      asociacionId: "aso-inexistente",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("validacion");
    }
    expect(await deps.distritos.listByAsociacion("aso-inexistente")).toHaveLength(0);
  });

  it("admin_asociacion fuera de su propia asociacion_id es rechazado", async () => {
    const deps = crearDeps();
    const execute = crearCrearDistritoUseCase(deps);
    const adminAsociacion: CustomClaims = {
      uid: "actor2",
      role: "admin_asociacion",
      asociacionId: "aso-otra",
    };

    const resultado = await execute(adminAsociacion, {
      nombre: "Distrito Sur",
      asociacionId: "aso1",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

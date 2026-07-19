import { describe, expect, it } from "vitest";
import { crearAsignarCustomClaimsUseCase } from "./asignar-custom-claims.use-case";
import {
  InMemoryAuditoriaRepository,
  InMemoryAuthAdminPort,
  FakeClockPort,
} from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const authAdmin = new InMemoryAuthAdminPort();
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { authAdmin, auditoria };
}

describe("asignar-custom-claims.use-case", () => {
  it("admin_global asigna Custom_Claims a cualquier usuario y se registra en auditoría", async () => {
    const deps = crearDeps();
    const execute = crearAsignarCustomClaimsUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, {
      targetUid: "user42",
      role: "secretario",
      iglesiaId: "igl1",
    });

    expect(isOk(resultado)).toBe(true);
    expect(deps.authAdmin.claimsAsignados).toEqual([
      { uid: "user42", claims: { role: "secretario", iglesiaId: "igl1", distritoId: undefined, asociacionId: undefined } },
    ]);
    // Invalidación de sesión exactamente una vez (Property 5).
    expect(deps.authAdmin.sesionesRevocadas).toEqual(["user42"]);
    const eventos = await deps.auditoria.listar({});
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.accion).toBe("asignar_custom_claims");
  });

  it("admin_asociacion fuera de su propia asociacion_id es rechazado sin efectos colaterales", async () => {
    const deps = crearDeps();
    const execute = crearAsignarCustomClaimsUseCase(deps);
    const adminAsociacion: CustomClaims = {
      uid: "actor2",
      role: "admin_asociacion",
      asociacionId: "aso1",
    };

    const resultado = await execute(adminAsociacion, {
      targetUid: "user42",
      role: "secretario",
      asociacionId: "aso2",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
    expect(deps.authAdmin.claimsAsignados).toHaveLength(0);
    expect(deps.authAdmin.sesionesRevocadas).toHaveLength(0);
    expect(await deps.auditoria.listar({})).toHaveLength(0);
  });

  it("rechaza un role inválido con error de validación y sin efectos colaterales (Property 4)", async () => {
    const deps = crearDeps();
    const execute = crearAsignarCustomClaimsUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, {
      targetUid: "user42",
      role: "super_admin",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("validacion");
    }
    expect(deps.authAdmin.claimsAsignados).toHaveLength(0);
  });
});

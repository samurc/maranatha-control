import { describe, expect, it } from "vitest";
import { decodificarClaimsOptimista } from "./session";

function crearJwtFalso(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode(payload)}.firma-no-verificada`;
}

describe("decodificarClaimsOptimista", () => {
  it("retorna null cuando no hay token", () => {
    expect(decodificarClaimsOptimista(undefined)).toBeNull();
  });

  it("retorna null cuando el token está malformado", () => {
    expect(decodificarClaimsOptimista("no-es-un-jwt")).toBeNull();
  });

  it("decodifica un JWT válido con role y uid", () => {
    const token = crearJwtFalso({
      sub: "user1",
      role: "secretario",
      iglesiaId: "igl1",
    });

    const claims = decodificarClaimsOptimista(token);

    expect(claims).toEqual({
      uid: "user1",
      role: "secretario",
      iglesiaId: "igl1",
      distritoId: undefined,
      asociacionId: undefined,
    });
  });

  it("retorna null cuando el token ya expiró", () => {
    const token = crearJwtFalso({
      sub: "user1",
      role: "secretario",
      exp: Math.floor(Date.now() / 1000) - 3600,
    });

    expect(decodificarClaimsOptimista(token)).toBeNull();
  });

  it("retorna null cuando falta el role", () => {
    const token = crearJwtFalso({ sub: "user1" });

    expect(decodificarClaimsOptimista(token)).toBeNull();
  });
});

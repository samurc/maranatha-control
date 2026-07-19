import { describe, expect, it } from "vitest";
import { construirMenuNavegacion } from "./nav-sections";
import type { CustomClaims } from "../domain/value-objects/custom-claims.vo";

describe("construirMenuNavegacion (Requirement 15.4)", () => {
  it("secretario ve la sección de Unidades de Acción", () => {
    const secretario: CustomClaims = { uid: "u1", role: "secretario", iglesiaId: "igl1" };

    const menu = construirMenuNavegacion(secretario);

    expect(menu.map((i) => i.resource)).toContain("unidad_accion");
    expect(menu.find((i) => i.resource === "unidad_accion")).toMatchObject({
      href: "/unidades",
    });
  });

  it("anciano no ve participante/registro_sabatico pero sí ve dashboard (Requirement 16.8)", () => {
    const anciano: CustomClaims = { uid: "u2", role: "anciano", distritoId: "dis1" };

    const menu = construirMenuNavegacion(anciano);
    const recursos = menu.map((i) => i.resource);

    expect(recursos).not.toContain("participante");
    expect(recursos).not.toContain("registro_sabatico");
    expect(recursos).toContain("dashboard");
  });

  it("alumno no ve ninguna sección de auditoría", () => {
    const alumno: CustomClaims = { uid: "u3", role: "alumno", iglesiaId: "igl1" };

    const menu = construirMenuNavegacion(alumno);

    expect(menu.map((i) => i.resource)).not.toContain("auditoria");
  });
});

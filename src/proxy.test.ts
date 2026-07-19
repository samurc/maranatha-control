import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { COOKIE_SESION } from "./presentation/session";

function crearJwtFalso(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode(payload)}.firma-no-verificada`;
}

describe("proxy (Requirement 15.1)", () => {
  it("redirige a /login cuando un usuario no autenticado accede a una ruta protegida", () => {
    const request = new NextRequest("https://example.com/dashboard");

    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("permite el paso cuando existe una cookie de sesión válida", () => {
    const token = crearJwtFalso({ sub: "user1", role: "secretario", iglesiaId: "igl1" });
    const request = new NextRequest("https://example.com/dashboard", {
      headers: { cookie: `${COOKIE_SESION}=${token}` },
    });

    const response = proxy(request);

    // NextResponse.next() no es una redirección: no tiene status 307/308.
    expect([307, 308]).not.toContain(response.status);
  });

  it("no interfiere con rutas fuera del segmento protegido (p. ej. /login)", () => {
    const request = new NextRequest("https://example.com/login");

    const response = proxy(request);

    expect([307, 308]).not.toContain(response.status);
  });
});

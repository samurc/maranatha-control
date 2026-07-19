import { describe, expect, it } from "vitest";
import { crearConsultarAuditoriaUseCase } from "./consultar-auditoria.use-case";
import { InMemoryAuditoriaRepository, InMemoryIglesiaRepository, FakeClockPort } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { Iglesia } from "../../../domain/entities/iglesia.entity";

const IGLESIA_PROPIA: Iglesia = {
  id: "igl1",
  idOficial: "igl1",
  nombre: "Iglesia Central",
  asociacionId: "aso1",
  distritoId: "dis1",
  paisCodigo: "CL",
  fechaAlta: new Date(),
  creadoEn: new Date(),
};
const IGLESIA_AJENA: Iglesia = { ...IGLESIA_PROPIA, id: "igl2", idOficial: "igl2", asociacionId: "aso2" };

async function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const auditoria = new InMemoryAuditoriaRepository(clock);
  const iglesias = new InMemoryIglesiaRepository([IGLESIA_PROPIA, IGLESIA_AJENA]);
  await auditoria.registrar({ uid: "u1", accion: "crear_participante", recursoAfectado: "p1", iglesiaId: "igl1" });
  await auditoria.registrar({ uid: "u2", accion: "crear_participante", recursoAfectado: "p2", iglesiaId: "igl2" });
  return { auditoria, iglesias };
}

describe("consultar-auditoria.use-case (Property 35, 36)", () => {
  it("admin_global consulta sin restricción de alcance", async () => {
    const deps = await crearDeps();
    const execute = crearConsultarAuditoriaUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, {});

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value).toHaveLength(2);
    }
  });

  it("admin_asociacion recibe únicamente eventos de Iglesias de su propia asociacion_id (Property 35)", async () => {
    const deps = await crearDeps();
    const execute = crearConsultarAuditoriaUseCase(deps);
    const adminAsociacion: CustomClaims = { uid: "actor2", role: "admin_asociacion", asociacionId: "aso1" };

    const resultado = await execute(adminAsociacion, {});

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value).toHaveLength(1);
      expect(resultado.value[0]?.iglesiaId).toBe("igl1");
    }
  });

  it("rechaza a roles no administrativos (Property 36)", async () => {
    const deps = await crearDeps();
    const execute = crearConsultarAuditoriaUseCase(deps);
    const secretario: CustomClaims = { uid: "actor3", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, {});

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

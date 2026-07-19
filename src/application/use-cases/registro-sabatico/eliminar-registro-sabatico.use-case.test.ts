import { describe, expect, it } from "vitest";
import { crearEliminarRegistroSabaticoUseCase } from "./eliminar-registro-sabatico.use-case";
import { InMemoryRegistroSabaticoRepository, InMemoryAuditoriaRepository, FakeClockPort } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { RegistroSabatico } from "../../../domain/entities/registro-sabatico.entity";

const REGISTRO: RegistroSabatico = {
  id: "igl1_ua1_2024_T1_S1",
  iglesiaId: "igl1",
  unidadId: "ua1",
  sabadoEclesiastico: { anio: 2024, numeroTrimestre: 1, numeroSabado: 1, fechaISO: "2024-01-06", timezone: "America/Santiago" },
  estado: "borrador",
  asistencia: {},
  totalesRapidos: { presentes: 0, ausentes: 0, visitas: 0 },
  creadoEn: new Date(),
  actualizadoEn: new Date(),
};

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const registros = new InMemoryRegistroSabaticoRepository([REGISTRO]);
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { registros, auditoria };
}

describe("eliminar-registro-sabatico.use-case (Property 9)", () => {
  it("admin_global elimina permanentemente el Registro_Sabatico", async () => {
    const deps = crearDeps();
    const execute = crearEliminarRegistroSabaticoUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor1", role: "admin_global" };

    const resultado = await execute(adminGlobal, { id: "igl1_ua1_2024_T1_S1" });

    expect(isOk(resultado)).toBe(true);
    expect(await deps.registros.findById("igl1_ua1_2024_T1_S1")).toBeNull();
  });

  it("rechaza a un Secretario (restringido a admin_global)", async () => {
    const deps = crearDeps();
    const execute = crearEliminarRegistroSabaticoUseCase(deps);
    const secretario: CustomClaims = { uid: "actor2", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, { id: "igl1_ua1_2024_T1_S1" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
    expect(await deps.registros.findById("igl1_ua1_2024_T1_S1")).not.toBeNull();
  });
});

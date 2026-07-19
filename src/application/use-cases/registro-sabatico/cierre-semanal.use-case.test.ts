import { describe, expect, it } from "vitest";
import { crearCerrarRegistroSabaticoUseCase } from "./cerrar-registro-sabatico.use-case";
import { crearReabrirRegistroSabaticoUseCase } from "./reabrir-registro-sabatico.use-case";
import { InMemoryRegistroSabaticoRepository, InMemoryAuditoriaRepository, FakeClockPort } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { RegistroSabatico } from "../../../domain/entities/registro-sabatico.entity";

const REGISTRO_BORRADOR: RegistroSabatico = {
  id: "igl1_ua1_2024_T1_S1",
  iglesiaId: "igl1",
  unidadId: "ua1",
  sabadoEclesiastico: { anio: 2024, numeroTrimestre: 1, numeroSabado: 1, fechaISO: "2024-01-06", timezone: "America/Santiago" },
  estado: "borrador",
  asistencia: {},
  totalesRapidos: { presentes: 0, ausentes: 0, visitas: 0 },
  creadoEn: new Date("2024-01-06T00:00:00Z"),
  actualizadoEn: new Date("2024-01-06T00:00:00Z"),
};

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-08T12:00:00Z"));
  const registros = new InMemoryRegistroSabaticoRepository([REGISTRO_BORRADOR]);
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { registros, auditoria, clock };
}

const SECRETARIO: CustomClaims = { uid: "sec1", role: "secretario", iglesiaId: "igl1" };
const MAESTRO: CustomClaims = { uid: "maestro1", role: "maestro", iglesiaId: "igl1" };

describe("cierre semanal del Registro_Sabatico (Property 20)", () => {
  it("secretario cierra un Registro en borrador, registrando cerradoPor y fechaCierre", async () => {
    const deps = crearDeps();
    const cerrar = crearCerrarRegistroSabaticoUseCase(deps);

    const resultado = await cerrar(SECRETARIO, { id: "igl1_ua1_2024_T1_S1" });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.estado).toBe("cerrado");
      expect(resultado.value.cerradoPor).toBe("sec1");
      expect(resultado.value.fechaCierre).toEqual(new Date("2024-01-08T12:00:00Z"));
    }
  });

  it("rechaza a un Maestro intentando cerrar (Requirement 8.2)", async () => {
    const deps = crearDeps();
    const cerrar = crearCerrarRegistroSabaticoUseCase(deps);

    const resultado = await cerrar(MAESTRO, { id: "igl1_ua1_2024_T1_S1" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });

  it("secretario reabre un Registro cerrado, devolviéndolo a borrador", async () => {
    const deps = crearDeps();
    const cerrar = crearCerrarRegistroSabaticoUseCase(deps);
    const reabrir = crearReabrirRegistroSabaticoUseCase(deps);

    await cerrar(SECRETARIO, { id: "igl1_ua1_2024_T1_S1" });
    const resultado = await reabrir(SECRETARIO, { id: "igl1_ua1_2024_T1_S1" });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.estado).toBe("borrador");
    }
  });

  it("rechaza a un Maestro intentando reabrir", async () => {
    const deps = crearDeps();
    const cerrar = crearCerrarRegistroSabaticoUseCase(deps);
    const reabrir = crearReabrirRegistroSabaticoUseCase(deps);

    await cerrar(SECRETARIO, { id: "igl1_ua1_2024_T1_S1" });
    const resultado = await reabrir(MAESTRO, { id: "igl1_ua1_2024_T1_S1" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

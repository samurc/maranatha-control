import { describe, expect, it } from "vitest";
import { crearConsultarDashboardUseCase } from "./consultar-dashboard.use-case";
import {
  InMemoryIglesiaRepository,
  InMemoryRegistroSabaticoRepository,
  InMemoryUnidadAccionRepository,
} from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { Iglesia } from "../../../domain/entities/iglesia.entity";
import type { UnidadAccion } from "../../../domain/entities/unidad-accion.entity";
import type { RegistroSabatico } from "../../../domain/entities/registro-sabatico.entity";

const IGLESIA_A: Iglesia = {
  id: "igl1",
  idOficial: "igl1",
  nombre: "Iglesia Central",
  asociacionId: "aso1",
  distritoId: "dis1",
  paisCodigo: "CL",
  timezone: "America/Santiago",
  fechaAlta: new Date(),
  creadoEn: new Date(),
};
const IGLESIA_B: Iglesia = {
  ...IGLESIA_A,
  id: "igl2",
  idOficial: "igl2",
  nombre: "Iglesia Norte",
  distritoId: "dis2",
};

const UNIDAD: UnidadAccion = {
  id: "ua1",
  iglesiaId: "igl1",
  nombre: "Clase",
  maestroUid: "maestro1",
  estado: "activa",
  creadoEn: new Date(),
};

const REGISTRO_CERRADO: RegistroSabatico = {
  id: "igl1_ua1_2024_T1_S1",
  iglesiaId: "igl1",
  unidadId: "ua1",
  sabadoEclesiastico: { anio: 2024, numeroTrimestre: 1, numeroSabado: 1, fechaISO: "2024-01-06", timezone: "America/Santiago" },
  estado: "cerrado",
  asistencia: {
    p1: { presente: true, diasEstudio: 6, autorregistrado: false, codigoVisual: "P6", seguimientoPastoral: [] },
    p2: { presente: false, diasEstudio: 0, autorregistrado: false, codigoVisual: "F", seguimientoPastoral: [] },
  },
  totalesRapidos: { presentes: 1, ausentes: 1, visitas: 0 },
  creadoEn: new Date(),
  actualizadoEn: new Date(),
};

const REGISTRO_BORRADOR: RegistroSabatico = {
  ...REGISTRO_CERRADO,
  id: "igl1_ua1_2024_T1_S2",
  sabadoEclesiastico: { anio: 2024, numeroTrimestre: 1, numeroSabado: 2, fechaISO: "2024-01-13", timezone: "America/Santiago" },
  estado: "borrador",
};

function crearDeps() {
  return {
    iglesias: new InMemoryIglesiaRepository([IGLESIA_A, IGLESIA_B]),
    registros: new InMemoryRegistroSabaticoRepository([REGISTRO_CERRADO, REGISTRO_BORRADOR]),
    unidades: new InMemoryUnidadAccionRepository([UNIDAD]),
  };
}

const PERIODO = {
  desde: new Date("2024-01-01T00:00:00Z"),
  hasta: new Date("2024-01-20T00:00:00Z"),
};

describe("consultar-dashboard.use-case (Property 30, 32)", () => {
  it("director_es recibe agregados únicamente de su propia iglesia_id", async () => {
    const deps = crearDeps();
    const execute = crearConsultarDashboardUseCase(deps);
    const directorEs: CustomClaims = { uid: "actor1", role: "director_es", iglesiaId: "igl1" };

    const resultado = await execute(directorEs, PERIODO);

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.iglesias).toHaveLength(1);
      expect(resultado.value.iglesias[0]?.iglesiaId).toBe("igl1");
    }
  });

  it("solo contabiliza Registros con estado=cerrado (Property 32) y señala sábados pendientes", async () => {
    const deps = crearDeps();
    const execute = crearConsultarDashboardUseCase(deps);
    const directorEs: CustomClaims = { uid: "actor1", role: "director_es", iglesiaId: "igl1" };

    const resultado = await execute(directorEs, PERIODO);

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      const agregado = resultado.value.iglesias[0];
      expect(agregado?.presentes).toBe(1);
      expect(agregado?.ausentes).toBe(1);
      // El sábado 2024-01-13 tiene un Registro en borrador, no cerrado:
      // debe aparecer como pendiente de cierre (Requirement 11.7).
      expect(agregado?.sabadosPendientesDeCierre).toContain("2024-01-13");
    }
  });

  it("admin_global recibe agregados de todas las Iglesias del Sistema", async () => {
    const deps = crearDeps();
    const execute = crearConsultarDashboardUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor2", role: "admin_global" };

    const resultado = await execute(adminGlobal, PERIODO);

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.iglesias.map((i) => i.iglesiaId).sort()).toEqual([
        "igl1",
        "igl2",
      ]);
    }
  });

  it("rechaza a secretario/maestro/alumno (Requirement 11.5)", async () => {
    const deps = crearDeps();
    const execute = crearConsultarDashboardUseCase(deps);
    const secretario: CustomClaims = { uid: "actor3", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, PERIODO);

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });

  it("el agregado nunca incluye ningún campo de menor de edad individual (Property 50)", async () => {
    const deps = crearDeps();
    const execute = crearConsultarDashboardUseCase(deps);
    const adminGlobal: CustomClaims = { uid: "actor2", role: "admin_global" };

    const resultado = await execute(adminGlobal, PERIODO);

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(JSON.stringify(resultado.value)).not.toContain("esMenorEdad");
    }
  });
});

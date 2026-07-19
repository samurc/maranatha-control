import { describe, expect, it } from "vitest";
import { crearRegistrarSeguimientoPastoralUseCase } from "./registrar-seguimiento-pastoral.use-case";
import {
  InMemoryRegistroSabaticoRepository,
  InMemoryUnidadAccionRepository,
  InMemoryAuditoriaRepository,
  FakeClockPort,
} from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { RegistroSabatico } from "../../../domain/entities/registro-sabatico.entity";
import type { UnidadAccion } from "../../../domain/entities/unidad-accion.entity";

const UNIDAD: UnidadAccion = {
  id: "ua1",
  iglesiaId: "igl1",
  nombre: "Clase",
  maestroUid: "maestro1",
  estado: "activa",
  creadoEn: new Date(),
};

const REGISTRO: RegistroSabatico = {
  id: "igl1_ua1_2024_T1_S1",
  iglesiaId: "igl1",
  unidadId: "ua1",
  sabadoEclesiastico: { anio: 2024, numeroTrimestre: 1, numeroSabado: 1, fechaISO: "2024-01-06", timezone: "America/Santiago" },
  estado: "borrador",
  asistencia: {
    p1: { presente: false, diasEstudio: 0, autorregistrado: false, codigoVisual: "F", seguimientoPastoral: [] },
  },
  totalesRapidos: { presentes: 0, ausentes: 1, visitas: 0 },
  creadoEn: new Date(),
  actualizadoEn: new Date(),
};

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-08T12:00:00Z"));
  const registros = new InMemoryRegistroSabaticoRepository([REGISTRO]);
  const unidades = new InMemoryUnidadAccionRepository([UNIDAD]);
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { registros, unidades, auditoria, clock };
}

const MAESTRO: CustomClaims = { uid: "maestro1", role: "maestro", iglesiaId: "igl1" };

describe("registrar-seguimiento-pastoral.use-case", () => {
  it("maestro a cargo registra el Seguimiento_Pastoral embebido en el Registro (Requirement 9.1)", async () => {
    const deps = crearDeps();
    const execute = crearRegistrarSeguimientoPastoralUseCase(deps);

    const resultado = await execute(MAESTRO, {
      registroId: "igl1_ua1_2024_T1_S1",
      participanteId: "p1",
      accion: "llamado_telefonico",
    });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.asistencia.p1?.seguimientoPastoral).toHaveLength(1);
      expect(resultado.value.asistencia.p1?.seguimientoPastoral[0]).toMatchObject({
        accion: "llamado_telefonico",
        registradoPor: "maestro1",
      });
    }
  });

  it("rechaza un valor de accion fuera del enum (Requirement 9.2, Property 24)", async () => {
    const deps = crearDeps();
    const execute = crearRegistrarSeguimientoPastoralUseCase(deps);

    const resultado = await execute(MAESTRO, {
      registroId: "igl1_ua1_2024_T1_S1",
      participanteId: "p1",
      accion: "visita_sorpresa",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("validacion");
    }
  });

  it("rechaza a un maestro cuya Unidad no está a su cargo (Requirement 9.1)", async () => {
    const deps = crearDeps();
    const execute = crearRegistrarSeguimientoPastoralUseCase(deps);
    const otroMaestro: CustomClaims = { uid: "maestro-otro", role: "maestro", iglesiaId: "igl1" };

    const resultado = await execute(otroMaestro, {
      registroId: "igl1_ua1_2024_T1_S1",
      participanteId: "p1",
      accion: "llamado_telefonico",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });

  it("rechaza a un rol distinto de maestro/admin_global (Requirement 9.3)", async () => {
    const deps = crearDeps();
    const execute = crearRegistrarSeguimientoPastoralUseCase(deps);
    const secretario: CustomClaims = { uid: "sec1", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, {
      registroId: "igl1_ua1_2024_T1_S1",
      participanteId: "p1",
      accion: "llamado_telefonico",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });

  it("rechaza el registro cuando el Registro_Sabatico está cerrado (Requirement 9.4, Property 19)", async () => {
    const deps = crearDeps();
    await deps.registros.save({ ...REGISTRO, estado: "cerrado" });
    const execute = crearRegistrarSeguimientoPastoralUseCase(deps);

    const resultado = await execute(MAESTRO, {
      registroId: "igl1_ua1_2024_T1_S1",
      participanteId: "p1",
      accion: "llamado_telefonico",
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("conflicto");
    }
  });
});

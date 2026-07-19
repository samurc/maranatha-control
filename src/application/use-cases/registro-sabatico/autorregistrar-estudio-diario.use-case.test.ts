import { describe, expect, it } from "vitest";
import { crearAutorregistrarEstudioDiarioUseCase } from "./autorregistrar-estudio-diario.use-case";
import {
  InMemoryRegistroSabaticoRepository,
  InMemoryParticipanteRepository,
  InMemoryIglesiaRepository,
  InMemoryAuditoriaRepository,
  FakeClockPort,
} from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { RegistroSabatico } from "../../../domain/entities/registro-sabatico.entity";
import type { Participante } from "../../../domain/entities/participante.entity";
import type { Iglesia } from "../../../domain/entities/iglesia.entity";

const FECHA_REFERENCIA = new Date("2024-01-06T15:00:00Z"); // sábado en America/Santiago

const IGLESIA: Iglesia = {
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

const PARTICIPANTE: Participante = {
  id: "p1",
  iglesiaId: "igl1",
  unidadId: "ua1",
  nombre: "Juan",
  apellido: "Pérez",
  esVisita: false,
  estado: "activo",
  userUid: "alumno1",
  creadoEn: new Date(),
};

const REGISTRO: RegistroSabatico = {
  id: "igl1_ua1_2024_T1_S1",
  iglesiaId: "igl1",
  unidadId: "ua1",
  sabadoEclesiastico: { anio: 2024, numeroTrimestre: 1, numeroSabado: 1, fechaISO: "2024-01-06", timezone: "America/Santiago" },
  estado: "borrador",
  asistencia: {
    p1: { presente: false, diasEstudio: 2, autorregistrado: false, codigoVisual: "F", seguimientoPastoral: [] },
  },
  totalesRapidos: { presentes: 0, ausentes: 1, visitas: 0 },
  creadoEn: new Date(),
  actualizadoEn: new Date(),
};

function crearDeps() {
  const clock = new FakeClockPort(FECHA_REFERENCIA);
  return {
    registros: new InMemoryRegistroSabaticoRepository([REGISTRO]),
    participantes: new InMemoryParticipanteRepository([PARTICIPANTE]),
    iglesias: new InMemoryIglesiaRepository([IGLESIA]),
    auditoria: new InMemoryAuditoriaRepository(clock),
  };
}

const ALUMNO: CustomClaims = { uid: "alumno1", role: "alumno" };

describe("autorregistrar-estudio-diario.use-case", () => {
  it("incrementa dias_estudio con autorregistrado=true (Property 26)", async () => {
    const deps = crearDeps();
    const execute = crearAutorregistrarEstudioDiarioUseCase(deps);

    const resultado = await execute(ALUMNO, {
      participanteId: "p1",
      fechaReferencia: FECHA_REFERENCIA,
    });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.asistencia.p1?.diasEstudio).toBe(3);
      expect(resultado.value.asistencia.p1?.autorregistrado).toBe(true);
    }
  });

  it("rechaza un segundo Autorregistro el mismo día calendario (Property 27)", async () => {
    const deps = crearDeps();
    const execute = crearAutorregistrarEstudioDiarioUseCase(deps);

    await execute(ALUMNO, { participanteId: "p1", fechaReferencia: FECHA_REFERENCIA });
    const segundoIntento = await execute(ALUMNO, {
      participanteId: "p1",
      fechaReferencia: new Date("2024-01-06T20:00:00Z"),
    });

    expect(isErr(segundoIntento)).toBe(true);
    if (isErr(segundoIntento)) {
      expect(segundoIntento.error.kind).toBe("conflicto");
    }
  });

  it("rechaza a un alumno cuyo user_uid no coincide con el Participante (Property 28)", async () => {
    const deps = crearDeps();
    const execute = crearAutorregistrarEstudioDiarioUseCase(deps);
    const otroAlumno: CustomClaims = { uid: "alumno-otro", role: "alumno" };

    const resultado = await execute(otroAlumno, {
      participanteId: "p1",
      fechaReferencia: FECHA_REFERENCIA,
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });

  it("rechaza el autorregistro cuando el Registro_Sabatico está cerrado (Requirement 10.5)", async () => {
    const deps = crearDeps();
    await deps.registros.save({ ...REGISTRO, estado: "cerrado" });
    const execute = crearAutorregistrarEstudioDiarioUseCase(deps);

    const resultado = await execute(ALUMNO, {
      participanteId: "p1",
      fechaReferencia: FECHA_REFERENCIA,
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("conflicto");
    }
  });
});

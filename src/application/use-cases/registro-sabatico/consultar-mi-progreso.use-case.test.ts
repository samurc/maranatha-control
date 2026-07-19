import { describe, expect, it } from "vitest";
import { crearConsultarMiProgresoUseCase } from "./consultar-mi-progreso.use-case";
import {
  InMemoryRegistroSabaticoRepository,
  InMemoryParticipanteRepository,
  InMemoryIglesiaRepository,
} from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { RegistroSabatico } from "../../../domain/entities/registro-sabatico.entity";
import type { Participante } from "../../../domain/entities/participante.entity";
import type { Iglesia } from "../../../domain/entities/iglesia.entity";

const FECHA_REFERENCIA = new Date("2024-01-06T15:00:00Z");

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
    p1: { presente: true, diasEstudio: 5, autorregistrado: true, codigoVisual: "P5", seguimientoPastoral: [] },
    p2: { presente: false, diasEstudio: 1, autorregistrado: false, codigoVisual: "F", seguimientoPastoral: [] },
  },
  totalesRapidos: { presentes: 1, ausentes: 1, visitas: 0 },
  creadoEn: new Date(),
  actualizadoEn: new Date(),
};

function crearDeps() {
  return {
    registros: new InMemoryRegistroSabaticoRepository([REGISTRO]),
    participantes: new InMemoryParticipanteRepository([PARTICIPANTE]),
    iglesias: new InMemoryIglesiaRepository([IGLESIA]),
  };
}

describe("consultar-mi-progreso.use-case (Property 29)", () => {
  it("retorna únicamente el propio estado más metas agregadas y anónimas de la Unidad", async () => {
    const deps = crearDeps();
    const execute = crearConsultarMiProgresoUseCase(deps);
    const alumno: CustomClaims = { uid: "alumno1", role: "alumno" };

    const resultado = await execute(alumno, { fechaReferencia: FECHA_REFERENCIA });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.miEstado).toEqual({
        presente: true,
        diasEstudio: 5,
        codigoVisual: "P5",
      });
      expect(resultado.value.metasAgregadas).toEqual({
        totalParticipantes: 2,
        promedioDiasEstudio: 3,
        proporcionPresentes: 0.5,
      });
      // No debe filtrar datos individuales de otros Participantes.
      expect(JSON.stringify(resultado.value)).not.toContain("p2");
    }
  });

  it("incluye la asistencia histórica del propio Alumno a través de todos los Registros de su Unidad (Requirement 15.3)", async () => {
    const registroAnterior: RegistroSabatico = {
      ...REGISTRO,
      id: "igl1_ua1_2023_T4_S13",
      sabadoEclesiastico: { anio: 2023, numeroTrimestre: 4, numeroSabado: 13, fechaISO: "2023-12-30", timezone: "America/Santiago" },
      estado: "cerrado",
      asistencia: {
        p1: { presente: false, diasEstudio: 2, autorregistrado: false, codigoVisual: "F", seguimientoPastoral: [] },
      },
    };
    const deps = {
      registros: new InMemoryRegistroSabaticoRepository([REGISTRO, registroAnterior]),
      participantes: new InMemoryParticipanteRepository([PARTICIPANTE]),
      iglesias: new InMemoryIglesiaRepository([IGLESIA]),
    };
    const execute = crearConsultarMiProgresoUseCase(deps);
    const alumno: CustomClaims = { uid: "alumno1", role: "alumno" };

    const resultado = await execute(alumno, { fechaReferencia: FECHA_REFERENCIA });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.asistenciaHistorica).toEqual([
        { fechaISO: "2023-12-30", presente: false, diasEstudio: 2, codigoVisual: "F" },
        { fechaISO: "2024-01-06", presente: true, diasEstudio: 5, codigoVisual: "P5" },
      ]);
      // Sin datos individuales de otros Participantes.
      expect(JSON.stringify(resultado.value.asistenciaHistorica)).not.toContain("p2");
    }
  });

  it("rechaza a un rol distinto de alumno", async () => {
    const deps = crearDeps();
    const execute = crearConsultarMiProgresoUseCase(deps);
    const secretario: CustomClaims = { uid: "sec1", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, { fechaReferencia: FECHA_REFERENCIA });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

import { describe, expect, it } from "vitest";
import { crearRegistrarAsistenciaUseCase } from "./registrar-asistencia.use-case";
import {
  InMemoryRegistroSabaticoRepository,
  InMemoryParticipanteRepository,
  InMemoryUnidadAccionRepository,
  InMemoryIglesiaRepository,
  InMemoryAuditoriaRepository,
  FakeClockPort,
} from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { Iglesia } from "../../../domain/entities/iglesia.entity";
import type { UnidadAccion } from "../../../domain/entities/unidad-accion.entity";
import type { Participante } from "../../../domain/entities/participante.entity";

// 2024-01-06 es sábado en UTC/America/Santiago.
const FECHA_REFERENCIA = new Date("2024-01-06T12:00:00Z");

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

const UNIDAD: UnidadAccion = {
  id: "ua1",
  iglesiaId: "igl1",
  nombre: "Clase",
  maestroUid: "maestro1",
  estado: "activa",
  creadoEn: new Date(),
};

function crearDeps(participantesSeed: Participante[]) {
  const clock = new FakeClockPort(FECHA_REFERENCIA);
  return {
    registros: new InMemoryRegistroSabaticoRepository(),
    participantes: new InMemoryParticipanteRepository(participantesSeed),
    unidades: new InMemoryUnidadAccionRepository([UNIDAD]),
    iglesias: new InMemoryIglesiaRepository([IGLESIA]),
    auditoria: new InMemoryAuditoriaRepository(clock),
    clock,
  };
}

const P_ACTIVO: Participante = {
  id: "p1",
  iglesiaId: "igl1",
  unidadId: "ua1",
  nombre: "Juan",
  apellido: "Pérez",
  esVisita: false,
  estado: "activo",
  creadoEn: new Date(),
};
const P_INACTIVO: Participante = {
  id: "p2",
  iglesiaId: "igl1",
  unidadId: "ua1",
  nombre: "Ana",
  apellido: "Gómez",
  esVisita: false,
  estado: "inactivo",
  creadoEn: new Date(),
};
const P_VISITA: Participante = {
  id: "p3",
  iglesiaId: "igl1",
  unidadId: "ua1",
  nombre: "Carlos",
  apellido: "Ruiz",
  esVisita: true,
  estado: "activo",
  creadoEn: new Date(),
};

const MAESTRO: CustomClaims = { uid: "maestro1", role: "maestro", iglesiaId: "igl1" };

describe("registrar-asistencia.use-case — camino de creación (Property 21)", () => {
  it("crea el Registro con ID determinístico, estado=borrador y excluye Participantes inactivos (Property 17)", async () => {
    const deps = crearDeps([P_ACTIVO, P_INACTIVO, P_VISITA]);
    const execute = crearRegistrarAsistenciaUseCase(deps);

    const resultado = await execute(MAESTRO, {
      iglesiaId: "igl1",
      unidadId: "ua1",
      fechaReferencia: FECHA_REFERENCIA,
      cambios: [
        { participanteId: "p1", presente: true, diasEstudio: 5 },
        { participanteId: "p3", presente: true, diasEstudio: 0 },
      ],
    });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.id).toBe("igl1_ua1_2024_T1_S1");
      expect(resultado.value.estado).toBe("borrador");
      expect(Object.keys(resultado.value.asistencia).sort()).toEqual(["p1", "p3"]);
      expect(resultado.value.asistencia.p1?.codigoVisual).toBe("P5");
      expect(resultado.value.asistencia.p3?.codigoVisual).toBe("V");
      // Invariante contable (Property 18).
      expect(resultado.value.totalesRapidos).toEqual({
        presentes: 2,
        ausentes: 0,
        visitas: 1,
      });
    }
  });

  it("rechaza cuando la Iglesia no tiene zona horaria configurada (Requirement 20.3, Property 49)", async () => {
    const deps = crearDeps([P_ACTIVO]);
    await deps.iglesias.save({ ...IGLESIA, timezone: undefined });
    const execute = crearRegistrarAsistenciaUseCase(deps);

    const resultado = await execute(MAESTRO, {
      iglesiaId: "igl1",
      unidadId: "ua1",
      fechaReferencia: FECHA_REFERENCIA,
      cambios: [{ participanteId: "p1", presente: true, diasEstudio: 3 }],
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("validacion");
    }
  });

  it("rechaza a un Maestro cuya Unidad_Accion no está a su cargo (Requirement 7.3)", async () => {
    const deps = crearDeps([P_ACTIVO]);
    const otroMaestro: CustomClaims = { uid: "maestro-otro", role: "maestro", iglesiaId: "igl1" };
    const execute = crearRegistrarAsistenciaUseCase(deps);

    const resultado = await execute(otroMaestro, {
      iglesiaId: "igl1",
      unidadId: "ua1",
      fechaReferencia: FECHA_REFERENCIA,
      cambios: [{ participanteId: "p1", presente: true, diasEstudio: 3 }],
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });

  it("rechaza dias_estudio fuera de rango (Requirement 7.5, Property 23)", async () => {
    const deps = crearDeps([P_ACTIVO]);
    const execute = crearRegistrarAsistenciaUseCase(deps);

    const resultado = await execute(MAESTRO, {
      iglesiaId: "igl1",
      unidadId: "ua1",
      fechaReferencia: FECHA_REFERENCIA,
      cambios: [{ participanteId: "p1", presente: true, diasEstudio: 9 }],
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("validacion");
    }
  });
});

describe("registrar-asistencia.use-case — camino de actualización (Property 22)", () => {
  it("recalcula codigo_visual y totales_rapidos tras la actualización", async () => {
    const deps = crearDeps([P_ACTIVO, P_VISITA]);
    const execute = crearRegistrarAsistenciaUseCase(deps);

    await execute(MAESTRO, {
      iglesiaId: "igl1",
      unidadId: "ua1",
      fechaReferencia: FECHA_REFERENCIA,
      cambios: [
        { participanteId: "p1", presente: false, diasEstudio: 0 },
        { participanteId: "p3", presente: false, diasEstudio: 0 },
      ],
    });

    const resultado = await execute(MAESTRO, {
      iglesiaId: "igl1",
      unidadId: "ua1",
      fechaReferencia: FECHA_REFERENCIA,
      cambios: [{ participanteId: "p1", presente: true, diasEstudio: 7 }],
    });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.asistencia.p1?.codigoVisual).toBe("P7");
      expect(resultado.value.totalesRapidos).toEqual({
        presentes: 1,
        ausentes: 1,
        visitas: 0,
      });
    }
  });

  it("rechaza la modificación de un Registro cerrado (Property 19)", async () => {
    const deps = crearDeps([P_ACTIVO]);
    const execute = crearRegistrarAsistenciaUseCase(deps);

    await execute(MAESTRO, {
      iglesiaId: "igl1",
      unidadId: "ua1",
      fechaReferencia: FECHA_REFERENCIA,
      cambios: [{ participanteId: "p1", presente: true, diasEstudio: 3 }],
    });
    const registro = await deps.registros.findById("igl1_ua1_2024_T1_S1");
    if (registro) {
      await deps.registros.save({ ...registro, estado: "cerrado" });
    }

    const resultado = await execute(MAESTRO, {
      iglesiaId: "igl1",
      unidadId: "ua1",
      fechaReferencia: FECHA_REFERENCIA,
      cambios: [{ participanteId: "p1", presente: false, diasEstudio: 0 }],
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("conflicto");
    }
  });
});

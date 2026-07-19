import { describe, expect, it } from "vitest";
import { crearCrearParticipanteUseCase } from "./crear-participante.use-case";
import {
  InMemoryParticipanteRepository,
  InMemoryUnidadAccionRepository,
  InMemoryAuditoriaRepository,
  FakeClockPort,
} from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { UnidadAccion } from "../../../domain/entities/unidad-accion.entity";

const UNIDAD: UnidadAccion = {
  id: "ua1",
  iglesiaId: "igl1",
  nombre: "Clase",
  maestroUid: "maestro1",
  estado: "activa",
  creadoEn: new Date(),
};

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const participantes = new InMemoryParticipanteRepository();
  const unidades = new InMemoryUnidadAccionRepository([UNIDAD]);
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { participantes, unidades, auditoria, clock, generarId: () => "p-fixed" };
}

describe("crear-participante.use-case", () => {
  it("secretario crea el Participante con estado=activo", async () => {
    const deps = crearDeps();
    const execute = crearCrearParticipanteUseCase(deps);
    const secretario: CustomClaims = { uid: "actor1", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, {
      iglesiaId: "igl1",
      unidadId: "ua1",
      nombre: "Juan",
      apellido: "Pérez",
      esVisita: false,
    });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.estado).toBe("activo");
    }
  });

  it("rechaza cuando unidad_id pertenece a otra iglesia_id (Property 16)", async () => {
    const deps = crearDeps();
    const execute = crearCrearParticipanteUseCase(deps);
    const secretario: CustomClaims = { uid: "actor1", role: "secretario", iglesiaId: "igl2" };

    const resultado = await execute(secretario, {
      iglesiaId: "igl2",
      unidadId: "ua1",
      nombre: "Juan",
      apellido: "Pérez",
      esVisita: false,
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("validacion");
    }
  });

  it("rechaza al secretario creando fuera de su propia iglesia_id (Property 2)", async () => {
    const deps = crearDeps();
    const execute = crearCrearParticipanteUseCase(deps);
    const secretario: CustomClaims = { uid: "actor1", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, {
      iglesiaId: "igl2",
      unidadId: "ua1",
      nombre: "Juan",
      apellido: "Pérez",
      esVisita: false,
    });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

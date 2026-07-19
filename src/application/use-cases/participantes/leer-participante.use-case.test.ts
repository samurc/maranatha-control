import { describe, expect, it } from "vitest";
import { crearLeerParticipanteUseCase, CAMPO_OFUSCADO } from "./leer-participante.use-case";
import { InMemoryParticipanteRepository, InMemoryIglesiaRepository } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { Participante } from "../../../domain/entities/participante.entity";
import type { Iglesia } from "../../../domain/entities/iglesia.entity";

const IGLESIA: Iglesia = {
  id: "igl1",
  idOficial: "igl1",
  nombre: "Iglesia Central",
  asociacionId: "aso1",
  distritoId: "dis1",
  paisCodigo: "CL",
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

function crearDeps() {
  const participantes = new InMemoryParticipanteRepository([PARTICIPANTE]);
  const iglesias = new InMemoryIglesiaRepository([IGLESIA]);
  return { participantes, iglesias };
}

describe("leer-participante.use-case", () => {
  it("secretario de la misma iglesia ve nombre/apellido sin ofuscar", async () => {
    const deps = crearDeps();
    const execute = crearLeerParticipanteUseCase(deps);
    const secretario: CustomClaims = { uid: "actor1", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, { id: "p1" });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.nombre).toBe("Juan");
    }
  });

  it("el alumno vinculado lee su propio Participante", async () => {
    const deps = crearDeps();
    const execute = crearLeerParticipanteUseCase(deps);
    const alumno: CustomClaims = { uid: "alumno1", role: "alumno" };

    const resultado = await execute(alumno, { id: "p1" });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.nombre).toBe("Juan");
    }
  });

  it("rechaza a un alumno cuyo user_uid no coincide (Requirement 6.6)", async () => {
    const deps = crearDeps();
    const execute = crearLeerParticipanteUseCase(deps);
    const otroAlumno: CustomClaims = { uid: "alumno-otro", role: "alumno" };

    const resultado = await execute(otroAlumno, { id: "p1" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });

  it("admin_asociacion autorizado territorialmente ve nombre/apellido ofuscados (Property 51)", async () => {
    const deps = crearDeps();
    const execute = crearLeerParticipanteUseCase(deps);
    const adminAsociacion: CustomClaims = {
      uid: "actor2",
      role: "admin_asociacion",
      asociacionId: "aso1",
    };

    const resultado = await execute(adminAsociacion, { id: "p1" });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value.nombre).toBe(CAMPO_OFUSCADO);
      expect(resultado.value.apellido).toBe(CAMPO_OFUSCADO);
    }
  });

  it("rechaza totalmente a un pastor_distrital (dato individual de Participante, Requirement 16.8)", async () => {
    const deps = crearDeps();
    const execute = crearLeerParticipanteUseCase(deps);
    const pastorDistrital: CustomClaims = {
      uid: "actor3",
      role: "pastor_distrital",
      distritoId: "dis1",
    };

    const resultado = await execute(pastorDistrital, { id: "p1" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

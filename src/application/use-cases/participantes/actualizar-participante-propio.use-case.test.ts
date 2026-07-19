import { describe, expect, it } from "vitest";
import { crearActualizarParticipantePropioUseCase } from "./actualizar-participante-propio.use-case";
import { InMemoryParticipanteRepository, InMemoryAuditoriaRepository, FakeClockPort } from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { Participante } from "../../../domain/entities/participante.entity";

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
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const participantes = new InMemoryParticipanteRepository([PARTICIPANTE]);
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { participantes, auditoria };
}

describe("actualizar-participante-propio.use-case", () => {
  it("el alumno vinculado edita nombre/apellido de su propio Participante", async () => {
    const deps = crearDeps();
    const execute = crearActualizarParticipantePropioUseCase(deps);
    const alumno: CustomClaims = { uid: "alumno1", role: "alumno", iglesiaId: "igl1" };

    const resultado = await execute(alumno, { id: "p1", nombre: "Juan Carlos" });

    expect(isOk(resultado)).toBe(true);
    const participante = await deps.participantes.findById("p1");
    expect(participante?.nombre).toBe("Juan Carlos");
  });

  it("rechaza a un alumno cuyo user_uid no coincide (Requirement 6.6)", async () => {
    const deps = crearDeps();
    const execute = crearActualizarParticipantePropioUseCase(deps);
    const otroAlumno: CustomClaims = { uid: "alumno-otro", role: "alumno", iglesiaId: "igl1" };

    const resultado = await execute(otroAlumno, { id: "p1", nombre: "Hackeado" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
    const participante = await deps.participantes.findById("p1");
    expect(participante?.nombre).toBe("Juan");
  });

  it("rechaza a un secretario (solo el propio Alumno puede editar vía este caso de uso)", async () => {
    const deps = crearDeps();
    const execute = crearActualizarParticipantePropioUseCase(deps);
    const secretario: CustomClaims = { uid: "sec1", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, { id: "p1", nombre: "X" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

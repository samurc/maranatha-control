import { describe, expect, it } from "vitest";
import { crearActualizarEstadoParticipanteUseCase } from "./actualizar-estado-participante.use-case";
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
  creadoEn: new Date(),
};

function crearDeps() {
  const clock = new FakeClockPort(new Date("2024-01-06T12:00:00Z"));
  const participantes = new InMemoryParticipanteRepository([PARTICIPANTE]);
  const auditoria = new InMemoryAuditoriaRepository(clock);
  return { participantes, auditoria };
}

describe("actualizar-estado-participante.use-case", () => {
  it("secretario marca el Participante como inactivo (Requirement 6.4)", async () => {
    const deps = crearDeps();
    const execute = crearActualizarEstadoParticipanteUseCase(deps);
    const secretario: CustomClaims = { uid: "actor1", role: "secretario", iglesiaId: "igl1" };

    const resultado = await execute(secretario, { id: "p1", estado: "inactivo" });

    expect(isOk(resultado)).toBe(true);
    const participante = await deps.participantes.findById("p1");
    expect(participante?.estado).toBe("inactivo");
  });

  it("rechaza a un secretario de otra iglesia_id", async () => {
    const deps = crearDeps();
    const execute = crearActualizarEstadoParticipanteUseCase(deps);
    const secretario: CustomClaims = { uid: "actor2", role: "secretario", iglesiaId: "igl2" };

    const resultado = await execute(secretario, { id: "p1", estado: "inactivo" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("no_encontrado");
    }
  });
});

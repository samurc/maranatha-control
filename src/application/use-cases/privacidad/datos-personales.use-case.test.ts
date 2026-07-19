import { describe, expect, it } from "vitest";
import { crearExportarDatosParticipanteUseCase } from "./exportar-datos-participante.use-case";
import { crearEliminarDatosParticipanteUseCase } from "./eliminar-datos-participante.use-case";
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

const ADMIN_GLOBAL: CustomClaims = { uid: "actor1", role: "admin_global" };
const SECRETARIO: CustomClaims = { uid: "actor2", role: "secretario", iglesiaId: "igl1" };

describe("exportar-datos-participante.use-case (Property 52, 53)", () => {
  it("admin_global exporta exactamente los campos personales almacenados", async () => {
    const deps = crearDeps();
    const execute = crearExportarDatosParticipanteUseCase(deps);

    const resultado = await execute(ADMIN_GLOBAL, { participanteId: "p1" });

    expect(isOk(resultado)).toBe(true);
    if (isOk(resultado)) {
      expect(resultado.value).toEqual(PARTICIPANTE);
    }
    expect(await deps.auditoria.listar({})).toHaveLength(1);
  });

  it("rechaza a un rol distinto de admin_global (Property 53)", async () => {
    const deps = crearDeps();
    const execute = crearExportarDatosParticipanteUseCase(deps);

    const resultado = await execute(SECRETARIO, { participanteId: "p1" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
  });
});

describe("eliminar-datos-participante.use-case (Property 52, 53)", () => {
  it("admin_global elimina permanentemente los datos del Participante", async () => {
    const deps = crearDeps();
    const execute = crearEliminarDatosParticipanteUseCase(deps);

    const resultado = await execute(ADMIN_GLOBAL, { participanteId: "p1" });

    expect(isOk(resultado)).toBe(true);
    expect(await deps.participantes.findById("p1")).toBeNull();
    expect(await deps.auditoria.listar({})).toHaveLength(1);
  });

  it("rechaza a un rol distinto de admin_global sin eliminar nada (Property 53)", async () => {
    const deps = crearDeps();
    const execute = crearEliminarDatosParticipanteUseCase(deps);

    const resultado = await execute(SECRETARIO, { participanteId: "p1" });

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("autorizacion");
    }
    expect(await deps.participantes.findById("p1")).not.toBeNull();
  });
});

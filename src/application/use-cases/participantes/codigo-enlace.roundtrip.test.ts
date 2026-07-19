import { describe, expect, it } from "vitest";
import { crearGenerarCodigoEnlaceUseCase } from "./generar-codigo-enlace.use-case";
import { crearCanjearCodigoEnlaceUseCase } from "../auth/canjear-codigo-enlace.use-case";
import {
  InMemoryParticipanteRepository,
  InMemoryAuditoriaRepository,
  InMemoryAuthAdminPort,
  FakeClockPort,
} from "../../testing";
import { isErr, isOk } from "../../../domain/shared";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import type { Participante } from "../../../domain/entities/participante.entity";

const PARTICIPANTE_SIN_CUENTA: Participante = {
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
  const participantes = new InMemoryParticipanteRepository([PARTICIPANTE_SIN_CUENTA]);
  const auditoria = new InMemoryAuditoriaRepository(clock);
  const authAdmin = new InMemoryAuthAdminPort();
  return { participantes, auditoria, authAdmin, clock, generarCodigo: () => "codigo-fijo" };
}

describe("round-trip de código de enlace (Property 6)", () => {
  it("generar + canjear vincula el user_uid y asigna role=alumno con la iglesia_id del Participante", async () => {
    const deps = crearDeps();
    const secretario: CustomClaims = { uid: "sec1", role: "secretario", iglesiaId: "igl1" };
    const generar = crearGenerarCodigoEnlaceUseCase(deps);
    const canjear = crearCanjearCodigoEnlaceUseCase(deps);

    const generado = await generar(secretario, { participanteId: "p1" });
    expect(isOk(generado)).toBe(true);

    const alumnoActor: CustomClaims = { uid: "alumno1", role: "alumno" };
    const canjeado = await canjear(alumnoActor, {
      codigo: "codigo-fijo",
      alumnoUid: "alumno1",
    });

    expect(isOk(canjeado)).toBe(true);
    const participante = await deps.participantes.findById("p1");
    expect(participante?.userUid).toBe("alumno1");
    expect(deps.authAdmin.claimsAsignados).toEqual([
      { uid: "alumno1", claims: { role: "alumno", iglesiaId: "igl1", distritoId: undefined, asociacionId: undefined } },
    ]);
  });

  it("rechaza el canje de un código ya usado sin modificar ningún Participante", async () => {
    const deps = crearDeps();
    const secretario: CustomClaims = { uid: "sec1", role: "secretario", iglesiaId: "igl1" };
    const generar = crearGenerarCodigoEnlaceUseCase(deps);
    const canjear = crearCanjearCodigoEnlaceUseCase(deps);

    await generar(secretario, { participanteId: "p1" });
    const alumnoActor: CustomClaims = { uid: "alumno1", role: "alumno" };
    await canjear(alumnoActor, { codigo: "codigo-fijo", alumnoUid: "alumno1" });

    const segundoIntento = await canjear(
      { uid: "alumno2", role: "alumno" },
      { codigo: "codigo-fijo", alumnoUid: "alumno2" }
    );

    expect(isErr(segundoIntento)).toBe(true);
    if (isErr(segundoIntento)) {
      expect(segundoIntento.error.kind).toBe("conflicto");
    }
    const participante = await deps.participantes.findById("p1");
    expect(participante?.userUid).toBe("alumno1");
  });

  it("rechaza el canje de un código inexistente", async () => {
    const deps = crearDeps();
    const canjear = crearCanjearCodigoEnlaceUseCase(deps);

    const resultado = await canjear(
      { uid: "alumno3", role: "alumno" },
      { codigo: "codigo-inexistente", alumnoUid: "alumno3" }
    );

    expect(isErr(resultado)).toBe(true);
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe("no_encontrado");
    }
  });
});

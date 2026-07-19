import { describe, expect, it } from "vitest";
import { gridReducer, calcularDiff, type GridState } from "./grid-state";

describe("gridReducer (Property 37: aislamiento de celdas)", () => {
  it("SET_CELDA reemplaza únicamente la entrada del participanteId afectado", () => {
    const estadoInicial: GridState = {
      p1: { presente: false, diasEstudio: 0 },
      p2: { presente: true, diasEstudio: 3 },
    };

    const estadoNuevo = gridReducer(estadoInicial, {
      type: "SET_CELDA",
      participanteId: "p1",
      celda: { presente: true, diasEstudio: 5 },
    });

    expect(estadoNuevo.p1).toEqual({ presente: true, diasEstudio: 5 });
    // La entrada de p2 preserva la MISMA referencia (no fue recreada).
    expect(estadoNuevo.p2).toBe(estadoInicial.p2);
  });

  it("RESET reemplaza el estado completo", () => {
    const estadoInicial: GridState = { p1: { presente: false, diasEstudio: 0 } };
    const nuevoEstado: GridState = { p2: { presente: true, diasEstudio: 1 } };

    const resultado = gridReducer(estadoInicial, {
      type: "RESET",
      estadoInicial: nuevoEstado,
    });

    expect(resultado).toBe(nuevoEstado);
  });
});

describe("calcularDiff (Requirement 14.4)", () => {
  it("incluye únicamente los Participantes cuyo estado cambió", () => {
    const estadoGuardado: GridState = {
      p1: { presente: false, diasEstudio: 0 },
      p2: { presente: true, diasEstudio: 3 },
    };
    const estadoActual: GridState = {
      p1: { presente: true, diasEstudio: 2 }, // cambió
      p2: { presente: true, diasEstudio: 3 }, // sin cambio
    };

    const diff = calcularDiff(estadoGuardado, estadoActual);

    expect(diff.size).toBe(1);
    expect(diff.get("p1")).toEqual({
      participanteId: "p1",
      presente: true,
      diasEstudio: 2,
    });
  });

  it("retorna un diff vacío cuando no hay cambios (N=0)", () => {
    const estado: GridState = { p1: { presente: true, diasEstudio: 5 } };

    const diff = calcularDiff(estado, estado);

    expect(diff.size).toBe(0);
  });
});

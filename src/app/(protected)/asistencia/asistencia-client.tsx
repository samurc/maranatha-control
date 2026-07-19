"use client";

import { useState, useTransition } from "react";
import { guardarAsistencia } from "./actions";

interface Participante {
  id: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
}

// Celda de la grilla: presente + días de estudio combinados
// "F" = faltó, "P0"-"P7" = presente + días de estudio
type CeldaValor = string; // "F", "P0", "P1"..."P7", "" (vacío)

interface AsistenciaClientProps {
  participantes: Participante[];
  nombreUnidad: string;
  nombreIglesia: string;
  trimestre: 1 | 2 | 3 | 4;
  anio: number;
  iglesiaId: string;
  unidadId: string;
  registrosExistentes: Record<string, Record<string, { presente: boolean; diasEstudio: number }>>;
}

const SABADOS = Array.from({ length: 13 }, (_, i) => i + 1);

function valorACelda(presente: boolean, diasEstudio: number): CeldaValor {
  return presente ? `P${diasEstudio}` : "F";
}

function celdaAValor(celda: CeldaValor): { presente: boolean; diasEstudio: number } {
  if (celda === "F") return { presente: false, diasEstudio: 0 };
  if (celda.startsWith("P")) {
    const dias = parseInt(celda.slice(1), 10);
    return { presente: true, diasEstudio: isNaN(dias) ? 0 : dias };
  }
  return { presente: false, diasEstudio: 0 };
}

export function AsistenciaClient({
  participantes,
  nombreUnidad,
  nombreIglesia,
  trimestre,
  anio,
  iglesiaId,
  unidadId,
  registrosExistentes,
}: AsistenciaClientProps) {
  // Estado: grilla[participanteId][`S${sabado}`] = CeldaValor
  const [grilla, setGrilla] = useState<Record<string, Record<string, CeldaValor>>>(() => {
    const inicial: Record<string, Record<string, CeldaValor>> = {};
    for (const p of participantes) {
      inicial[p.id] = {};
      for (const s of SABADOS) {
        const clave = `S${s}`;
        const registro = registrosExistentes[clave]?.[p.id];
        inicial[p.id]![clave] = registro
          ? valorACelda(registro.presente, registro.diasEstudio)
          : "";
      }
    }
    return inicial;
  });

  const [isPending, startTransition] = useTransition();
  const [guardado, setGuardado] = useState<string | null>(null);

  function actualizarCelda(participanteId: string, sabado: number, valor: CeldaValor) {
    setGrilla((prev) => ({
      ...prev,
      [participanteId]: {
        ...prev[participanteId],
        [`S${sabado}`]: valor,
      },
    }));

    // Autoguardar cuando el valor es completo (F o P0-P7)
    if (valor === "F" || /^P[0-7]$/.test(valor)) {
      guardarSabado(sabado, { ...grilla, [participanteId]: { ...grilla[participanteId], [`S${sabado}`]: valor } });
    }
  }

  function guardarSabado(sabado: number, grillaActual?: typeof grilla) {
    const datos = grillaActual ?? grilla;
    const clave = `S${sabado}`;
    const asistencia: Record<string, { presente: boolean; diasEstudio: number }> = {};
    for (const p of participantes) {
      const celda = datos[p.id]?.[clave];
      if (celda && celda !== "" && (celda === "F" || /^P[0-7]$/.test(celda))) {
        asistencia[p.id] = celdaAValor(celda);
      }
    }

    if (Object.keys(asistencia).length === 0) return;

    const formData = new FormData();
    formData.set("data", JSON.stringify({
      iglesiaId,
      unidadId,
      anio,
      trimestre,
      sabado,
      asistencia,
    }));

    startTransition(async () => {
      await guardarAsistencia(formData);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Control de Asistencia y Estudio Diario</h1>
        <p className="mt-1 text-sm text-foreground/60">
          {nombreIglesia} — {nombreUnidad} — {trimestre}° Trimestre {anio}
        </p>
        <p className="mt-1 text-xs text-foreground/40">
          Anotar &quot;P&quot; + número de días que estudió la lección (Ej: P7) y &quot;F&quot; si faltó
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-foreground/10">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-foreground/[0.05]">
              <th className="sticky left-0 bg-foreground/[0.05] px-2 py-2 text-left font-semibold text-foreground/80 border-r border-foreground/10 min-w-[40px]">#</th>
              <th className="sticky left-[40px] bg-foreground/[0.05] px-2 py-2 text-left font-semibold text-foreground/80 border-r border-foreground/10 min-w-[180px]">Nombre y apellido</th>
              <th className="sticky left-[220px] bg-foreground/[0.05] px-2 py-2 text-center font-semibold text-foreground/80 border-r border-foreground/10 min-w-[50px]">F. Nac.</th>
              {SABADOS.map((s) => (
                <th key={s} className="px-1 py-2 text-center font-semibold text-foreground/70 min-w-[42px] border-l border-foreground/5">
                  {s}°
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {participantes.map((p, idx) => (
              <tr key={p.id} className="hover:bg-foreground/[0.02] transition-colors">
                <td className="sticky left-0 bg-background px-2 py-1.5 text-foreground/50 border-r border-foreground/10 text-center">
                  {idx + 1}
                </td>
                <td className="sticky left-[40px] bg-background px-2 py-1.5 text-foreground font-medium border-r border-foreground/10 whitespace-nowrap">
                  {p.nombre} {p.apellido}
                </td>
                <td className="sticky left-[220px] bg-background px-2 py-1.5 text-center text-foreground/50 border-r border-foreground/10">
                  {p.fechaNacimiento || "—"}
                </td>
                {SABADOS.map((s) => {
                  const clave = `S${s}`;
                  const valor = grilla[p.id]?.[clave] ?? "";
                  const esPresente = valor.startsWith("P");
                  const esFalta = valor === "F";
                  return (
                    <td key={s} className="px-0.5 py-0.5 border-l border-foreground/5">
                      <input
                        type="text"
                        data-row={idx}
                        data-col={s}
                        value={valor}
                        onChange={(e) => {
                          const v = e.target.value.toUpperCase();
                          // Validar: vacío, F, o P seguido de 0-7
                          if (v === "" || v === "F" || v === "P" || /^P[0-7]$/.test(v)) {
                            actualizarCelda(p.id, s, v);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Tab") {
                            e.preventDefault();
                            // Saltar a la celda inferior (mismo sábado, siguiente participante)
                            const nextRow = idx + 1 < participantes.length ? idx + 1 : 0;
                            const nextInput = document.querySelector<HTMLInputElement>(
                              `input[data-row="${nextRow}"][data-col="${s}"]`
                            );
                            nextInput?.focus();
                            nextInput?.select();
                          }
                        }}
                        className={`w-full h-7 text-center text-xs font-medium rounded border transition-colors outline-none focus:ring-1 focus:ring-blue-500/50 ${
                          esPresente
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                            : esFalta
                              ? "bg-red-500/10 border-red-500/30 text-red-400"
                              : "bg-background border-foreground/10 text-foreground/60"
                        }`}
                        placeholder="—"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {/* Fila de totales */}
          <tfoot>
            <tr className="bg-foreground/[0.03] font-semibold">
              <td className="sticky left-0 bg-foreground/[0.03] px-2 py-2 border-r border-foreground/10"></td>
              <td className="sticky left-[40px] bg-foreground/[0.03] px-2 py-2 text-foreground/70 border-r border-foreground/10">TOTAL</td>
              <td className="sticky left-[220px] bg-foreground/[0.03] px-2 py-2 border-r border-foreground/10"></td>
              {SABADOS.map((s) => {
                const clave = `S${s}`;
                let presentes = 0;
                for (const p of participantes) {
                  const valor = grilla[p.id]?.[clave] ?? "";
                  if (valor.startsWith("P")) presentes++;
                }
                return (
                  <td key={s} className="px-1 py-2 text-center text-foreground/60 border-l border-foreground/5">
                    {presentes > 0 ? presentes : ""}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { guardarAsistencia } from "./actions";
import { ModalAsistenciaMobile } from "./modal-asistencia-mobile";

interface Participante {
  id: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  fotoUrl?: string;
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
  indicadoresExistentes: Record<string, string>;
  fechaHoy: string; // "YYYY-MM-DD"
}

const SABADOS = Array.from({ length: 13 }, (_, i) => i + 1);

/** Calcula la fecha ISO del sábado N dentro del trimestre (misma lógica que actions.ts). */
function calcularFechaSabado(anio: number, trimestre: number, numeroSabado: number): string {
  const inicio = new Date(anio, (trimestre - 1) * 3, 1);
  while (inicio.getDay() !== 6) {
    inicio.setDate(inicio.getDate() + 1);
  }
  inicio.setDate(inicio.getDate() + (numeroSabado - 1) * 7);
  return inicio.toISOString().split("T")[0]!;
}

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
  indicadoresExistentes,
  fechaHoy,
}: AsistenciaClientProps) {
  // Sábados cuya fecha ya pasó son read-only
  const sabadosCerrados = new Set<number>(
    SABADOS.filter((s) => calcularFechaSabado(anio, trimestre, s) < fechaHoy)
  );

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

  const [, startTransition] = useTransition();
  const [indicadores, setIndicadores] = useState<Record<string, string>>(indicadoresExistentes);

  const [celdaMobile, setCeldaMobile] = useState<{ pIdx: number, sabado: number } | null>(null);

  const avanzarAlumno = (actualIdx: number) => {
    if (actualIdx < participantes.length - 1) {
      setCeldaMobile(prev => prev ? { ...prev, pIdx: actualIdx + 1 } : null);
    } else {
      setCeldaMobile(null); // Cerrar si es el último
    }
  };

  const retrocederAlumno = (actualIdx: number) => {
    if (actualIdx > 0) {
      setCeldaMobile(prev => prev ? { ...prev, pIdx: actualIdx - 1 } : null);
    }
  };

  function actualizarCelda(participanteId: string, sabado: number, valor: CeldaValor) {
    setGrilla((prev) => ({
      ...prev,
      [participanteId]: {
        ...prev[participanteId],
        [`S${sabado}`]: valor,
      },
    }));

    // Si el valor es vacío, enviar borrado de forma individual
    if (valor === "") {
      // Guardar solo este registro
      guardarRegistroIndividual(participanteId, sabado, valor);
      return;
    }

    // Autoguardar cuando el valor es completo (F, P0-P7)
    if (valor === "F" || /^P[0-7]$/.test(valor)) {
      guardarSabado(sabado, { ...grilla, [participanteId]: { ...grilla[participanteId], [`S${sabado}`]: valor } });
    }
  }

  function guardarRegistroIndividual(participanteId: string, sabado: number, valor: CeldaValor) {
    const asistencia = valor === "" ? {} : { [participanteId]: celdaAValor(valor) };
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

  function actualizarIndicador(clave: string, valor: string) {
    setIndicadores((prev) => ({ ...prev, [clave]: valor }));
    // Autoguardar indicador
    const formData = new FormData();
    formData.set("indicador", JSON.stringify({ iglesiaId, unidadId, anio, trimestre, clave, valor }));
    startTransition(async () => {
      await guardarAsistencia(formData);
    });
  }

  function guardarSabado(sabado: number, grillaActual?: typeof grilla) {
    const datos = grillaActual ?? grilla;
    const clave = `S${sabado}`;
    const asistencia: Record<string, { presente: boolean; diasEstudio: number }> = {};
    for (const p of participantes) {
      const celda = datos[p.id]?.[clave];
      if (celda !== undefined) {
        // Include even empty string to signal deletion
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
          Anotar el número de días que estudió la lección (Ej: 7) o &quot;F&quot; si faltó
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-foreground/10">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-foreground/[0.05]">
              <th className="sticky left-0 bg-foreground/[0.05] z-10 px-2 py-2 text-left font-semibold text-foreground/80 border-r border-foreground/10 min-w-[40px]">#</th>
              <th className="sticky left-[40px] bg-foreground/[0.05] z-10 px-2 py-2 text-left font-semibold text-foreground/80 border-r border-foreground/10 min-w-[120px] max-w-[120px] md:min-w-[180px] md:max-w-none truncate">Nombre y apellido</th>
              {SABADOS.map((s) => (
                <th key={s} className={`px-1 py-2 text-center font-semibold min-w-[42px] border-l border-foreground/5 ${
                  sabadosCerrados.has(s) ? "text-foreground/30" : "text-foreground/70"
                }`}>
                  {s}°
                  {sabadosCerrados.has(s) && (
                    <span className="block text-[8px] text-foreground/25 leading-none">🔒</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {participantes.map((p, idx) => (
              <tr key={p.id} className="hover:bg-foreground/[0.02] transition-colors">
                <td className="sticky left-0 bg-background z-10 px-2 py-1.5 text-foreground/50 border-r border-foreground/10 text-center">
                  {idx + 1}
                </td>
                <td className="sticky left-[40px] bg-background z-10 px-2 py-1.5 text-foreground font-medium border-r border-foreground/10 truncate min-w-[120px] max-w-[120px] md:min-w-[180px] md:max-w-none" title={`${p.nombre} ${p.apellido}`}>
                  {p.nombre} {p.apellido}
                </td>
                {SABADOS.map((s) => {
                  const clave = `S${s}`;
                  const valor = grilla[p.id]?.[clave] ?? "";
                  const esPresente = valor.startsWith("P");
                  const esFalta = valor === "F";
                  const cerrado = sabadosCerrados.has(s);
                  return (
                    <td key={s} className="px-0.5 py-0.5 border-l border-foreground/5">
                      <input
                        type="text"
                        data-row={idx}
                        data-col={s}
                        value={valor}
                        readOnly={cerrado}
                        onClick={(e) => {
                          if (cerrado) return;
                          if (window.innerWidth < 768) {
                            e.preventDefault();
                            e.currentTarget.blur();
                            setCeldaMobile({ pIdx: idx, sabado: s });
                          }
                        }}
                        onFocus={(e) => {
                          if (window.innerWidth < 768) {
                            e.currentTarget.blur();
                          }
                        }}
                        onChange={(e) => {
                          if (cerrado) return;
                          let v = e.target.value.toUpperCase();
                          // Si el usuario ingresa un número del 0 al 7 directamente, anteponemos la "P"
                          if (/^[0-7]$/.test(v)) {
                            v = "P" + v;
                          }
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
                        className={`w-full h-7 text-center text-xs font-medium rounded border transition-colors outline-none ${
                          cerrado
                            ? "bg-foreground/[0.02] border-foreground/5 text-foreground/30 cursor-not-allowed"
                            : esPresente
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-400 focus:ring-1 focus:ring-blue-500/50"
                              : esFalta
                                ? "bg-red-500/10 border-red-500/30 text-red-400 focus:ring-1 focus:ring-blue-500/50"
                                : "bg-background border-foreground/10 text-foreground/60 focus:ring-1 focus:ring-blue-500/50"
                        }`}
                        placeholder={cerrado ? "" : "—"}
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
              <td className="sticky left-0 bg-foreground/[0.03] z-10 px-2 py-1.5 border-r border-foreground/10 text-center text-foreground/50 text-[10px]">1</td>
              <td className="sticky left-[40px] bg-foreground/[0.03] z-10 px-2 py-1.5 text-foreground/70 border-r border-foreground/10 text-[10px] md:text-xs leading-tight min-w-[120px] max-w-[120px] md:min-w-[180px] md:max-w-none whitespace-normal break-words">N° alumnos presentes</td>
              {SABADOS.map((s) => {
                const clave = `S${s}`;
                let presentes = 0;
                for (const p of participantes) {
                  const valor = grilla[p.id]?.[clave] ?? "";
                  if (valor.startsWith("P")) presentes++;
                }
                return (
                  <td key={s} className="px-1 py-1.5 text-center text-foreground/60 border-l border-foreground/5 text-xs">
                    {presentes > 0 ? presentes : ""}
                  </td>
                );
              })}
            </tr>
            <tr className="bg-foreground/[0.02]">
              <td className="sticky left-0 bg-foreground/[0.02] z-10 px-2 py-1.5 border-r border-foreground/10 text-center text-foreground/50 text-[10px]">2</td>
              <td className="sticky left-[40px] bg-foreground/[0.02] z-10 px-2 py-1.5 text-foreground/70 border-r border-foreground/10 text-[10px] md:text-xs leading-tight min-w-[120px] max-w-[120px] md:min-w-[180px] md:max-w-none whitespace-normal break-words">N° alumnos que estudiaron diariamente la lección</td>
              {SABADOS.map((s) => {
                const clave = `S${s}`;
                let estudiaron = 0;
                for (const p of participantes) {
                  const valor = grilla[p.id]?.[clave] ?? "";
                  if (/^P7$/.test(valor)) estudiaron++;
                }
                return (
                  <td key={s} className="px-1 py-1.5 text-center text-foreground/60 border-l border-foreground/5 text-xs">
                    {estudiaron > 0 ? estudiaron : ""}
                  </td>
                );
              })}
            </tr>
            <tr className="bg-foreground/[0.03]">
              <td className="sticky left-0 bg-foreground/[0.03] z-10 px-2 py-1.5 border-r border-foreground/10 text-center text-foreground/50 text-[10px]">3</td>
              <td className="sticky left-[40px] bg-foreground/[0.03] z-10 px-2 py-1.5 text-foreground/70 border-r border-foreground/10 text-[10px] md:text-xs leading-tight min-w-[120px] max-w-[120px] md:min-w-[180px] md:max-w-none whitespace-normal break-words">N° de discípulos dando estudios bíblicos</td>
              {SABADOS.map((s) => {
                const cerrado = sabadosCerrados.has(s);
                return (
                  <td key={s} className="px-0.5 py-0.5 border-l border-foreground/5">
                    <input
                      type="number"
                      min="0"
                      data-indicador={`eb-${s}`}
                      defaultValue={indicadores[`eb-${s}`] ?? ""}
                      readOnly={cerrado}
                      onChange={(e) => { if (!cerrado) actualizarIndicador(`eb-${s}`, e.target.value); }}
                      className={`w-full h-6 text-center text-xs rounded border outline-none ${cerrado ? "bg-foreground/[0.02] border-foreground/5 text-foreground/30 cursor-not-allowed" : "border-foreground/10 bg-background text-foreground/60 focus:ring-1 focus:ring-blue-500/50"}`}
                    />
                  </td>
                );
              })}
            </tr>
            <tr className="bg-foreground/[0.02]">
              <td className="sticky left-0 bg-foreground/[0.02] z-10 px-2 py-1.5 border-r border-foreground/10 text-center text-foreground/50 text-[10px]">4</td>
              <td className="sticky left-[40px] bg-foreground/[0.02] z-10 px-2 py-1.5 text-foreground/70 border-r border-foreground/10 text-[10px] md:text-xs leading-tight min-w-[120px] max-w-[120px] md:min-w-[180px] md:max-w-none whitespace-normal break-words">N° personas que recibieron estudios bíblicos</td>
              {SABADOS.map((s) => {
                const cerrado = sabadosCerrados.has(s);
                return (
                  <td key={s} className="px-0.5 py-0.5 border-l border-foreground/5">
                    <input
                      type="number"
                      min="0"
                      data-indicador={`re-${s}`}
                      defaultValue={indicadores[`re-${s}`] ?? ""}
                      readOnly={cerrado}
                      onChange={(e) => { if (!cerrado) actualizarIndicador(`re-${s}`, e.target.value); }}
                      className={`w-full h-6 text-center text-xs rounded border outline-none ${cerrado ? "bg-foreground/[0.02] border-foreground/5 text-foreground/30 cursor-not-allowed" : "border-foreground/10 bg-background text-foreground/60 focus:ring-1 focus:ring-blue-500/50"}`}
                    />
                  </td>
                );
              })}
            </tr>
            <tr className="bg-foreground/[0.03]">
              <td className="sticky left-0 bg-foreground/[0.03] z-10 px-2 py-1.5 border-r border-foreground/10 text-center text-foreground/50 text-[10px]">5</td>
              <td className="sticky left-[40px] bg-foreground/[0.03] z-10 px-2 py-1.5 text-foreground/70 border-r border-foreground/10 text-[10px] md:text-xs leading-tight min-w-[120px] max-w-[120px] md:min-w-[180px] md:max-w-none whitespace-normal break-words">N° discípulos que asistieron a G.P.</td>
              {SABADOS.map((s) => {
                const cerrado = sabadosCerrados.has(s);
                return (
                  <td key={s} className="px-0.5 py-0.5 border-l border-foreground/5">
                    <input
                      type="number"
                      min="0"
                      data-indicador={`gp-${s}`}
                      defaultValue={indicadores[`gp-${s}`] ?? ""}
                      readOnly={cerrado}
                      onChange={(e) => { if (!cerrado) actualizarIndicador(`gp-${s}`, e.target.value); }}
                      className={`w-full h-6 text-center text-xs rounded border outline-none ${cerrado ? "bg-foreground/[0.02] border-foreground/5 text-foreground/30 cursor-not-allowed" : "border-foreground/10 bg-background text-foreground/60 focus:ring-1 focus:ring-blue-500/50"}`}
                    />
                  </td>
                );
              })}
            </tr>
            <tr className="bg-foreground/[0.02]">
              <td className="sticky left-0 bg-foreground/[0.02] z-10 px-2 py-1.5 border-r border-foreground/10 text-center text-foreground/50 text-[10px]">6</td>
              <td className="sticky left-[40px] bg-foreground/[0.02] z-10 px-2 py-1.5 text-foreground/70 border-r border-foreground/10 text-[10px] md:text-xs leading-tight min-w-[120px] max-w-[120px] md:min-w-[180px] md:max-w-none whitespace-normal break-words">N° discípulos que participaron de los 365 días con el espíritu santo</td>
              {SABADOS.map((s) => {
                const cerrado = sabadosCerrados.has(s);
                return (
                  <td key={s} className="px-0.5 py-0.5 border-l border-foreground/5">
                    <input
                      type="number"
                      min="0"
                      data-indicador={`ep-${s}`}
                      defaultValue={indicadores[`ep-${s}`] ?? ""}
                      readOnly={cerrado}
                      onChange={(e) => { if (!cerrado) actualizarIndicador(`ep-${s}`, e.target.value); }}
                      className={`w-full h-6 text-center text-xs rounded border outline-none ${cerrado ? "bg-foreground/[0.02] border-foreground/5 text-foreground/30 cursor-not-allowed" : "border-foreground/10 bg-background text-foreground/60 focus:ring-1 focus:ring-blue-500/50"}`}
                    />
                  </td>
                );
              })}
            </tr>
            <tr className="bg-foreground/[0.03]">
              <td className="sticky left-0 bg-foreground/[0.03] z-10 px-2 py-1.5 border-r border-foreground/10 text-center text-foreground/50 text-[10px]">7</td>
              <td className="sticky left-[40px] bg-foreground/[0.03] z-10 px-2 py-1.5 text-foreground/70 border-r border-foreground/10 text-[10px] md:text-xs leading-tight min-w-[120px] max-w-[120px] md:min-w-[180px] md:max-w-none whitespace-normal break-words">Ofrenda</td>
              {SABADOS.map((s) => {
                const cerrado = sabadosCerrados.has(s);
                return (
                  <td key={s} className="px-0.5 py-0.5 border-l border-foreground/5">
                    <input
                      type="text"
                      data-indicador={`of-${s}`}
                      defaultValue={indicadores[`of-${s}`] ?? ""}
                      readOnly={cerrado}
                      onChange={(e) => { if (!cerrado) actualizarIndicador(`of-${s}`, e.target.value); }}
                      placeholder={cerrado ? "" : "$"}
                      className={`w-full h-6 text-center text-xs rounded border outline-none ${cerrado ? "bg-foreground/[0.02] border-foreground/5 text-foreground/30 cursor-not-allowed" : "border-foreground/10 bg-background text-foreground/60 focus:ring-1 focus:ring-blue-500/50"}`}
                    />
                  </td>
                );
              })}
            </tr>
            <tr className="bg-foreground/[0.02]">
              <td className="sticky left-0 bg-foreground/[0.02] z-10 px-2 py-1.5 border-r border-foreground/10 text-center text-foreground/50 text-[10px]">8</td>
              <td className="sticky left-[40px] bg-foreground/[0.02] z-10 px-2 py-1.5 text-foreground/70 border-r border-foreground/10 text-[10px] md:text-xs leading-tight min-w-[120px] max-w-[120px] md:min-w-[180px] md:max-w-none whitespace-normal break-words">N° visitas</td>
              {SABADOS.map((s) => {
                const cerrado = sabadosCerrados.has(s);
                return (
                  <td key={s} className="px-0.5 py-0.5 border-l border-foreground/5">
                    <input
                      type="number"
                      min="0"
                      data-indicador={`vi-${s}`}
                      defaultValue={indicadores[`vi-${s}`] ?? ""}
                      readOnly={cerrado}
                      onChange={(e) => { if (!cerrado) actualizarIndicador(`vi-${s}`, e.target.value); }}
                      className={`w-full h-6 text-center text-xs rounded border outline-none ${cerrado ? "bg-foreground/[0.02] border-foreground/5 text-foreground/30 cursor-not-allowed" : "border-foreground/10 bg-background text-foreground/60 focus:ring-1 focus:ring-blue-500/50"}`}
                    />
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {celdaMobile && (
        <ModalAsistenciaMobile
          participantes={participantes}
          participanteActivoIdx={celdaMobile.pIdx}
          sabado={celdaMobile.sabado}
          valorActual={grilla[participantes[celdaMobile.pIdx]?.id ?? ""]?.[`S${celdaMobile.sabado}`] ?? ""}
          indicadores={indicadores}
          onClose={() => setCeldaMobile(null)}
          onSelect={(pIdx, val) => {
            const pid = participantes[pIdx]?.id;
            if (pid) actualizarCelda(pid, celdaMobile.sabado, val);
          }}
          onAvanzar={avanzarAlumno}
          onRetroceder={retrocederAlumno}
          onUpdateIndicador={actualizarIndicador}
        />
      )}
    </div>
  );
}

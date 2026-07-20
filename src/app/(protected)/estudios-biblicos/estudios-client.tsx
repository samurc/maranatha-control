"use client";

import { useState, useTransition, useRef } from "react";
import { guardarAvanceEstudio, marcarCandidatoBautismo, eliminarEstudianteBiblico, eliminarInstructorBiblico, actualizarMiembrosInstructor } from "./actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Participante {
  id: string;
  nombre: string;
  apellido: string;
}

export interface InstructorBiblico {
  id: string;
  nombre: string;
  miembros: string[];
}

export interface EstudianteBiblico {
  id: string;
  nombre: string;
  apellido: string;
  estadoCivil: string | null;
  grupoEtareo: string | null;
  cursoBiblico: string | null;
  instructorId: string | null;
  candidatoBautismo: boolean;
}

export interface AvanceEstudio {
  estudianteId: string;
  lecciones: Record<string, boolean>; // leccion_1..leccion_20
}

interface EstudiosClientProps {
  instructores: InstructorBiblico[];
  estudiantes: EstudianteBiblico[];
  avances: AvanceEstudio[];
  participantes: Participante[];
}

const TOTAL_LECCIONES = 20;

const ESTADO_CIVIL_LABELS: Record<string, string> = {
  soltero: "Soltero/a",
  casado: "Casado/a",
  viudo: "Viudo/a",
};

const GRUPO_ETAREO_LABELS: Record<string, string> = {
  nino: "Niño",
  adolescente: "Adolescente",
  joven: "Joven",
  adulto: "Adulto",
};

const CURSO_LABELS: Record<string, string> = {
  "fe-de-jesus": "La fe de Jesús",
  "yo-creo": "Yo Creo",
  descubra: "Descubra",
};

// ---------------------------------------------------------------------------
// Celda de avance (checkbox inline)
// ---------------------------------------------------------------------------

function CeldaAvance({
  estudianteId,
  leccion,
  completada,
}: {
  estudianteId: string;
  leccion: number;
  completada: boolean;
}) {
  const [valor, setValor] = useState(completada);
  const [, startTransition] = useTransition();

  function toggle() {
    const nuevoValor = !valor;
    setValor(nuevoValor);
    const fd = new FormData();
    fd.set("estudianteId", estudianteId);
    fd.set("avance", JSON.stringify({ leccion, completada: nuevoValor }));
    startTransition(async () => {
      await guardarAvanceEstudio(fd);
    });
  }

  return (
    <td
      onClick={toggle}
      role="checkbox"
      aria-checked={valor}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } }}
      className={`w-6 h-7 border-l border-foreground/5 cursor-pointer text-center transition-colors select-none
        ${valor
          ? "bg-blue-500/20 text-blue-400"
          : "hover:bg-foreground/5 text-transparent"
        }`}
    >
      <span className="text-[10px] leading-none">{valor ? "✓" : "·"}</span>
    </td>
  );
}

// ---------------------------------------------------------------------------
// Botón candidato a bautismo
// ---------------------------------------------------------------------------

function BotónCandidato({
  estudianteId,
  candidato,
}: {
  estudianteId: string;
  candidato: boolean;
}) {
  const [valor, setValor] = useState(candidato);
  const [, startTransition] = useTransition();

  function toggle() {
    const nuevoValor = !valor;
    setValor(nuevoValor);
    const fd = new FormData();
    fd.set("id", estudianteId);
    fd.set("candidato", String(nuevoValor));
    startTransition(async () => {
      await marcarCandidatoBautismo(fd);
    });
  }

  return (
    <td
      onClick={toggle}
      role="checkbox"
      aria-checked={valor}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } }}
      className={`px-2 border-l border-foreground/10 cursor-pointer text-center transition-colors select-none
        ${valor
          ? "bg-amber-500/15 text-amber-400"
          : "hover:bg-foreground/5 text-foreground/30"
        }`}
    >
      <span className="text-xs">{valor ? "✓" : "—"}</span>
    </td>
  );
}

// ---------------------------------------------------------------------------
// Panel de gestión de instructores
// ---------------------------------------------------------------------------

function PanelInstructor({
  instructor,
  participantes,
}: {
  instructor: InstructorBiblico;
  participantes: Participante[];
}) {
  const [miembros, setMiembros] = useState<string[]>(instructor.miembros ?? []);
  const [, startTransition] = useTransition();

  function toggleMiembro(participanteId: string) {
    const nuevosMiembros = miembros.includes(participanteId)
      ? miembros.filter((m) => m !== participanteId)
      : [...miembros, participanteId];
    setMiembros(nuevosMiembros);
    const fd = new FormData();
    fd.set("id", instructor.id);
    fd.set("miembros", JSON.stringify(nuevosMiembros));
    startTransition(async () => {
      await actualizarMiembrosInstructor(fd);
    });
  }

  function handleEliminar() {
    const fd = new FormData();
    fd.set("id", instructor.id);
    startTransition(async () => {
      await eliminarInstructorBiblico(fd);
    });
  }

  return (
    <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{instructor.nombre}</h3>
        <ConfirmDeleteButton
          entityName={instructor.nombre}
          onConfirm={handleEliminar}
        />
      </div>
      <p className="text-xs text-foreground/50">Selecciona los miembros del equipo instructor ({miembros.length} seleccionados):</p>
      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
        {participantes.map((p) => {
          const activo = miembros.includes(p.id);
          return (
            <label
              key={p.id}
              className={`flex items-center gap-2 rounded px-2 py-1 cursor-pointer text-xs transition-colors
                ${activo ? "bg-blue-500/10 text-blue-400" : "text-foreground/60 hover:bg-foreground/5"}`}
            >
              <input
                type="checkbox"
                checked={activo}
                onChange={() => toggleMiembro(p.id)}
                className="accent-blue-500"
              />
              {p.nombre} {p.apellido}
            </label>
          );
        })}
        {participantes.length === 0 && (
          <p className="text-xs text-foreground/40 col-span-2">Sin participantes disponibles</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function EstudiosClient({
  instructores,
  estudiantes,
  avances,
  participantes,
}: EstudiosClientProps) {
  const avancesMap = new Map(avances.map((a) => [a.estudianteId, a.lecciones]));

  // Agrupar estudiantes por instructor
  const porInstructor = new Map<string | null, EstudianteBiblico[]>();
  for (const est of estudiantes) {
    const key = est.instructorId ?? null;
    if (!porInstructor.has(key)) porInstructor.set(key, []);
    porInstructor.get(key)!.push(est);
  }

  const instructorMap = new Map(instructores.map((i) => [i.id, i]));

  return (
    <div className="space-y-8">

      {/* ---- Tabla principal ---- */}
      <div className="overflow-x-auto rounded-lg border border-foreground/10">
        <table className="text-xs border-collapse" style={{ minWidth: "max-content" }}>
          <thead>
            <tr className="bg-foreground/[0.05]">
              {/* Columna instructores */}
              <th
                rowSpan={2}
                className="border border-foreground/10 px-3 py-2 text-center font-semibold text-foreground/80 bg-orange-500/10 text-orange-300 w-32 align-middle"
              >
                Instructores<br />Bíblicos
              </th>
              {/* Columna N° */}
              <th
                rowSpan={2}
                className="border border-foreground/10 px-2 py-2 text-center font-semibold text-foreground/70 w-8 align-middle"
              >
                N°
              </th>
              {/* Columna estudiantes */}
              <th
                rowSpan={2}
                className="border border-foreground/10 px-3 py-2 text-center font-semibold text-foreground/80 w-36 align-middle"
              >
                Estudiantes<br />de la Biblia
              </th>
              {/* Datos */}
              <th
                colSpan={3}
                className="border border-foreground/10 px-3 py-2 text-center font-semibold text-foreground/80"
              >
                Datos
              </th>
              {/* Avance */}
              <th
                colSpan={TOTAL_LECCIONES}
                className="border border-foreground/10 px-3 py-2 text-center font-semibold text-foreground/80 bg-orange-500/10 text-orange-300"
              >
                Avance de Estudio Bíblico — Trimestre
              </th>
              {/* Bautismo */}
              <th
                rowSpan={2}
                className="border border-foreground/10 px-2 py-2 text-center font-semibold text-amber-400/80 w-16 align-middle text-[10px]"
              >
                Cand.<br />Bautismo
              </th>
            </tr>
            <tr className="bg-foreground/[0.03]">
              {/* Sub-cabeceras datos */}
              <th className="border border-foreground/10 px-2 py-1.5 text-center text-foreground/60 w-20">Curso</th>
              <th className="border border-foreground/10 px-2 py-1.5 text-center text-foreground/60 w-20">Grupo</th>
              <th className="border border-foreground/10 px-2 py-1.5 text-center text-foreground/60 w-20">E. Civil</th>
              {/* Números de lección */}
              {Array.from({ length: TOTAL_LECCIONES }, (_, i) => (
                <th
                  key={i}
                  className="border border-foreground/5 px-0 py-1.5 text-center text-foreground/50 w-6"
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {instructores.length === 0 && estudiantes.length === 0 && (
              <tr>
                <td colSpan={4 + TOTAL_LECCIONES + 2} className="px-4 py-8 text-center text-foreground/50">
                  Sin datos registrados. Crea instructores y estudiantes para comenzar.
                </td>
              </tr>
            )}

            {/* Filas agrupadas por instructor */}
            {instructores.map((instructor) => {
              const estudiantesDelInstructor = porInstructor.get(instructor.id) ?? [];
              if (estudiantesDelInstructor.length === 0) {
                return (
                  <tr key={instructor.id} className="hover:bg-foreground/[0.02]">
                    <td className="border border-foreground/10 px-3 py-2 font-medium text-foreground/70 bg-orange-500/5 align-top">
                      {instructor.nombre}
                    </td>
                    <td className="border border-foreground/10 px-2 py-2 text-center text-foreground/30">—</td>
                    <td colSpan={3 + TOTAL_LECCIONES + 1} className="border border-foreground/10 px-3 py-2 text-foreground/30 italic">
                      Sin estudiantes asignados
                    </td>
                  </tr>
                );
              }

              return estudiantesDelInstructor.map((est, idx) => (
                <tr key={est.id} className="hover:bg-foreground/[0.02] transition-colors">
                  {/* Celda de instructor solo en la primera fila del grupo */}
                  {idx === 0 && (
                    <td
                      rowSpan={estudiantesDelInstructor.length}
                      className="border border-foreground/10 px-3 py-2 font-medium text-foreground/80 bg-orange-500/5 align-top text-center"
                    >
                      {instructor.nombre}
                    </td>
                  )}
                  <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/40">{idx + 1}</td>
                  <td className="border border-foreground/5 px-3 py-1.5 text-foreground font-medium whitespace-nowrap">
                    {est.nombre} {est.apellido}
                  </td>
                  {/* Datos */}
                  <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">
                    {est.cursoBiblico ? CURSO_LABELS[est.cursoBiblico] ?? est.cursoBiblico : "—"}
                  </td>
                  <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">
                    {est.grupoEtareo ? GRUPO_ETAREO_LABELS[est.grupoEtareo] ?? est.grupoEtareo : "—"}
                  </td>
                  <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">
                    {est.estadoCivil ? ESTADO_CIVIL_LABELS[est.estadoCivil] ?? est.estadoCivil : "—"}
                  </td>
                  {/* Avance */}
                  {Array.from({ length: TOTAL_LECCIONES }, (_, i) => {
                    const lecciones = avancesMap.get(est.id) ?? {};
                    const completada = lecciones[`leccion_${i + 1}`] ?? false;
                    return (
                      <CeldaAvance
                        key={i}
                        estudianteId={est.id}
                        leccion={i + 1}
                        completada={completada}
                      />
                    );
                  })}
                  {/* Candidato bautismo */}
                  <BotónCandidato estudianteId={est.id} candidato={est.candidatoBautismo} />
                </tr>
              ));
            })}

            {/* Estudiantes sin instructor */}
            {(porInstructor.get(null) ?? []).map((est, idx) => (
              <tr key={est.id} className="hover:bg-foreground/[0.02] transition-colors">
                {idx === 0 && (
                  <td
                    rowSpan={(porInstructor.get(null) ?? []).length}
                    className="border border-foreground/10 px-3 py-2 text-foreground/30 italic text-center align-top"
                  >
                    Sin instructor
                  </td>
                )}
                <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/40">{idx + 1}</td>
                <td className="border border-foreground/5 px-3 py-1.5 text-foreground font-medium whitespace-nowrap">
                  {est.nombre} {est.apellido}
                </td>
                <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">
                  {est.cursoBiblico ? CURSO_LABELS[est.cursoBiblico] ?? est.cursoBiblico : "—"}
                </td>
                <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">
                  {est.grupoEtareo ? GRUPO_ETAREO_LABELS[est.grupoEtareo] ?? est.grupoEtareo : "—"}
                </td>
                <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">
                  {est.estadoCivil ? ESTADO_CIVIL_LABELS[est.estadoCivil] ?? est.estadoCivil : "—"}
                </td>
                {Array.from({ length: TOTAL_LECCIONES }, (_, i) => {
                  const lecciones = avancesMap.get(est.id) ?? {};
                  const completada = lecciones[`leccion_${i + 1}`] ?? false;
                  return (
                    <CeldaAvance
                      key={i}
                      estudianteId={est.id}
                      leccion={i + 1}
                      completada={completada}
                    />
                  );
                })}
                <BotónCandidato estudianteId={est.id} candidato={est.candidatoBautismo} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Gestión de instructores ---- */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Conformación de Instructores Bíblicos</h2>
        {instructores.length === 0 && (
          <p className="text-sm text-foreground/40">Sin instructores registrados.</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instructores.map((instructor) => (
            <PanelInstructor
              key={instructor.id}
              instructor={instructor}
              participantes={participantes}
            />
          ))}
        </div>
      </div>

      {/* ---- Lista de estudiantes con acciones ---- */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Estudiantes de la Biblia</h2>
        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Curso</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Grupo etáreo</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">E. Civil</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Instructor</th>
                <th className="px-4 py-3 text-center font-medium text-foreground/70">Bautismo</th>
                <th className="px-4 py-3 text-right font-medium text-foreground/70">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {estudiantes.map((est) => {
                const instructor = est.instructorId ? instructorMap.get(est.instructorId) : null;
                return (
                  <tr key={est.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-2.5 text-foreground font-medium">{est.nombre} {est.apellido}</td>
                    <td className="px-4 py-2.5 text-foreground/70 text-xs">
                      {est.cursoBiblico ? CURSO_LABELS[est.cursoBiblico] ?? est.cursoBiblico : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-foreground/70 text-xs">
                      {est.grupoEtareo ? GRUPO_ETAREO_LABELS[est.grupoEtareo] ?? est.grupoEtareo : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-foreground/70 text-xs">
                      {est.estadoCivil ? ESTADO_CIVIL_LABELS[est.estadoCivil] ?? est.estadoCivil : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-foreground/70 text-xs">{instructor?.nombre ?? "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      {est.candidatoBautismo && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400">
                          Candidato
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ConfirmDeleteButton
                        entityName={`${est.nombre} ${est.apellido}`}
                        onConfirm={() => {
                          const fd = new FormData();
                          fd.set("id", est.id);
                          eliminarEstudianteBiblico(fd);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
              {estudiantes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-foreground/50">
                    Sin estudiantes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Botón eliminar con dialog de confirmación (reutilizable en este módulo)
function ConfirmDeleteButton({
  onConfirm,
  label,
  entityName,
}: {
  onConfirm: () => void;
  label?: string;
  entityName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(() => {
      onConfirm();
      dialogRef.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs text-red-400 hover:text-red-300 transition-colors"
      >
        {label ?? "Eliminar"}
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-sm shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <span className="text-red-400 text-lg">⚠</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Confirmar eliminación</h3>
              <p className="mt-1 text-xs text-foreground/60">
                ¿Estás seguro de eliminar <strong>{entityName}</strong>? Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={isPending}
              className="rounded-lg border border-foreground/20 px-3 py-2 text-xs font-medium text-foreground/70 hover:bg-foreground/5 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

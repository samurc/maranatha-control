"use client";

import { useState, useTransition, useRef } from "react";
import { guardarAvanceEstudio, marcarCandidatoBautismo, eliminarEstudianteBiblico, eliminarInstructorBiblico, actualizarMiembrosInstructor, editarEstudianteBiblico } from "./actions";

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
  lecciones: Record<string, boolean>;
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
// ConfirmDeleteButton
// ---------------------------------------------------------------------------

function ConfirmDeleteButton({ onConfirm, label, entityName }: { onConfirm: () => void; label?: string; entityName: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(() => { onConfirm(); dialogRef.current?.close(); });
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="text-xs text-red-400 hover:text-red-300 transition-colors">
        {label ?? "Eliminar"}
      </button>
      <dialog ref={dialogRef} className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-sm shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <span className="text-red-400 text-lg">⚠</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Confirmar eliminación</h3>
              <p className="mt-1 text-xs text-foreground/60">¿Estás seguro de eliminar <strong>{entityName}</strong>? Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => dialogRef.current?.close()} disabled={isPending} className="rounded-lg border border-foreground/20 px-3 py-2 text-xs font-medium text-foreground/70 hover:bg-foreground/5 transition-colors disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={handleConfirm} disabled={isPending} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50">
              {isPending ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Modal de conformación de instructor (abre al hacer clic en la celda)
// ---------------------------------------------------------------------------

function ModalInstructor({ instructor, participantes, onEliminar }: { instructor: InstructorBiblico; participantes: Participante[]; onEliminar: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [miembros, setMiembros] = useState<string[]>(instructor.miembros ?? []);
  const [, startTransition] = useTransition();

  function toggleMiembro(participanteId: string) {
    const nuevo = miembros.includes(participanteId) ? miembros.filter((m) => m !== participanteId) : [...miembros, participanteId];
    setMiembros(nuevo);
    const fd = new FormData();
    fd.set("id", instructor.id);
    fd.set("miembros", JSON.stringify(nuevo));
    startTransition(async () => { await actualizarMiembrosInstructor(fd); });
  }

  return (
    <>
      {/* Celda clickeable */}
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="w-full text-left font-medium text-foreground/80 hover:text-orange-300 transition-colors leading-tight"
        title="Clic para gestionar conformación"
      >
        {instructor.nombre}
        <span className="block text-[9px] text-foreground/30 font-normal mt-0.5">{miembros.length} miembro{miembros.length !== 1 ? "s" : ""} · editar ✎</span>
      </button>

      <dialog ref={dialogRef} className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-md shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">{instructor.nombre}</h2>
            <button type="button" onClick={() => dialogRef.current?.close()} className="text-foreground/40 hover:text-foreground text-xl leading-none" aria-label="Cerrar">×</button>
          </div>
          <p className="text-xs text-foreground/50">Selecciona los miembros del equipo instructor ({miembros.length} seleccionados):</p>
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
            {participantes.map((p) => {
              const activo = miembros.includes(p.id);
              return (
                <label key={p.id} className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer text-xs transition-colors ${activo ? "bg-blue-500/10 text-blue-400" : "text-foreground/60 hover:bg-foreground/5"}`}>
                  <input type="checkbox" checked={activo} onChange={() => toggleMiembro(p.id)} className="accent-blue-500" />
                  {p.nombre} {p.apellido}
                </label>
              );
            })}
            {participantes.length === 0 && <p className="text-xs text-foreground/40 col-span-2">Sin participantes disponibles</p>}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
            <ConfirmDeleteButton entityName={instructor.nombre} onConfirm={onEliminar} label="Eliminar instructor" />
            <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors">Listo</button>
          </div>
        </div>
      </dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Modal de edición de estudiante
// ---------------------------------------------------------------------------

function ModalEditarEstudiante({ est, instructores }: { est: EstudianteBiblico; instructores: InstructorBiblico[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", est.id);
    startTransition(async () => {
      await editarEstudianteBiblico(fd);
      dialogRef.current?.close();
    });
  }

  const selectClass = "w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors";
  const inputClass = "w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors";

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Editar</button>
      <dialog ref={dialogRef} className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-md shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Editar estudiante</h2>
            <button type="button" onClick={() => dialogRef.current?.close()} className="text-foreground/40 hover:text-foreground text-xl leading-none" aria-label="Cerrar">×</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-foreground/70">Nombre</label>
                <input name="nombre" required defaultValue={est.nombre} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-foreground/70">Apellido</label>
                <input name="apellido" required defaultValue={est.apellido} className={inputClass} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground/70">Estado Civil</label>
              <select name="estadoCivil" defaultValue={est.estadoCivil ?? ""} className={selectClass}>
                <option value="">Seleccionar...</option>
                <option value="soltero">Soltero/a</option>
                <option value="casado">Casado/a</option>
                <option value="viudo">Viudo/a</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground/70">Grupo Etáreo</label>
              <select name="grupoEtareo" defaultValue={est.grupoEtareo ?? ""} className={selectClass}>
                <option value="">Seleccionar...</option>
                <option value="nino">Niño</option>
                <option value="adolescente">Adolescente</option>
                <option value="joven">Joven</option>
                <option value="adulto">Adulto</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground/70">Curso Bíblico</label>
              <select name="cursoBiblico" defaultValue={est.cursoBiblico ?? ""} className={selectClass}>
                <option value="">Seleccionar...</option>
                <option value="fe-de-jesus">La fe de Jesús</option>
                <option value="yo-creo">Yo Creo</option>
                <option value="descubra">Descubra</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground/70">Instructor</label>
              <select name="instructorId" defaultValue={est.instructorId ?? ""} className={selectClass}>
                <option value="">Sin asignar</option>
                {instructores.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
            <button type="submit" disabled={isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2">
              {isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// CeldaAvance
// ---------------------------------------------------------------------------

function CeldaAvance({ estudianteId, leccion, completada }: { estudianteId: string; leccion: number; completada: boolean }) {
  const [valor, setValor] = useState(completada);
  const [, startTransition] = useTransition();

  function toggle() {
    const nuevo = !valor;
    setValor(nuevo);
    const fd = new FormData();
    fd.set("estudianteId", estudianteId);
    fd.set("avance", JSON.stringify({ leccion, completada: nuevo }));
    startTransition(async () => { await guardarAvanceEstudio(fd); });
  }

  return (
    <td onClick={toggle} role="checkbox" aria-checked={valor} tabIndex={0}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } }}
      className={`w-6 h-7 border-l border-foreground/5 cursor-pointer text-center transition-colors select-none ${valor ? "bg-blue-500/20 text-blue-400" : "hover:bg-foreground/5 text-transparent"}`}>
      <span className="text-[10px] leading-none">{valor ? "✓" : "·"}</span>
    </td>
  );
}

// ---------------------------------------------------------------------------
// BotónCandidato
// ---------------------------------------------------------------------------

function BotónCandidato({ estudianteId, candidato }: { estudianteId: string; candidato: boolean }) {
  const [valor, setValor] = useState(candidato);
  const [, startTransition] = useTransition();

  function toggle() {
    const nuevo = !valor;
    setValor(nuevo);
    const fd = new FormData();
    fd.set("id", estudianteId);
    fd.set("candidato", String(nuevo));
    startTransition(async () => { await marcarCandidatoBautismo(fd); });
  }

  return (
    <td onClick={toggle} role="checkbox" aria-checked={valor} tabIndex={0}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } }}
      className={`px-2 border-l border-foreground/10 cursor-pointer text-center transition-colors select-none ${valor ? "bg-amber-500/15 text-amber-400" : "hover:bg-foreground/5 text-foreground/30"}`}>
      <span className="text-xs">{valor ? "✓" : "—"}</span>
    </td>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function EstudiosClient({ instructores, estudiantes, avances, participantes }: EstudiosClientProps) {
  const avancesMap = new Map(avances.map((a) => [a.estudianteId, a.lecciones]));

  const porInstructor = new Map<string | null, EstudianteBiblico[]>();
  for (const est of estudiantes) {
    const key = est.instructorId ?? null;
    if (!porInstructor.has(key)) porInstructor.set(key, []);
    porInstructor.get(key)!.push(est);
  }

  const instructorMap = new Map(instructores.map((i) => [i.id, i]));

  function handleEliminarInstructor(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    eliminarInstructorBiblico(fd);
  }

  return (
    <div className="space-y-8">

      {/* ---- Tabla principal ---- */}
      <div className="overflow-x-auto rounded-lg border border-foreground/10">
        <table className="text-xs border-collapse" style={{ minWidth: "max-content" }}>
          <thead>
            <tr className="bg-foreground/[0.05]">
              <th rowSpan={2} className="border border-foreground/10 px-3 py-2 text-center font-semibold bg-orange-500/10 text-orange-300 w-32 align-middle">Instructores<br />Bíblicos</th>
              <th rowSpan={2} className="border border-foreground/10 px-2 py-2 text-center font-semibold text-foreground/70 w-8 align-middle">N°</th>
              <th rowSpan={2} className="border border-foreground/10 px-3 py-2 text-center font-semibold text-foreground/80 w-36 align-middle">Estudiantes<br />de la Biblia</th>
              <th colSpan={3} className="border border-foreground/10 px-3 py-2 text-center font-semibold text-foreground/80">Datos</th>
              <th colSpan={TOTAL_LECCIONES} className="border border-foreground/10 px-3 py-2 text-center font-semibold bg-orange-500/10 text-orange-300">Avance de Estudio Bíblico — Trimestre</th>
              <th rowSpan={2} className="border border-foreground/10 px-2 py-2 text-center font-semibold text-amber-400/80 w-16 align-middle text-[10px]">Cand.<br />Bautismo</th>
            </tr>
            <tr className="bg-foreground/[0.03]">
              <th className="border border-foreground/10 px-2 py-1.5 text-center text-foreground/60 w-20">Curso</th>
              <th className="border border-foreground/10 px-2 py-1.5 text-center text-foreground/60 w-20">Grupo</th>
              <th className="border border-foreground/10 px-2 py-1.5 text-center text-foreground/60 w-20">E. Civil</th>
              {Array.from({ length: TOTAL_LECCIONES }, (_, i) => (
                <th key={i} className="border border-foreground/5 px-0 py-1.5 text-center text-foreground/50 w-6">{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {instructores.length === 0 && estudiantes.length === 0 && (
              <tr><td colSpan={4 + TOTAL_LECCIONES + 2} className="px-4 py-8 text-center text-foreground/50">Sin datos registrados. Crea instructores y estudiantes para comenzar.</td></tr>
            )}
            {instructores.map((instructor) => {
              const lista = porInstructor.get(instructor.id) ?? [];
              if (lista.length === 0) {
                return (
                  <tr key={instructor.id} className="hover:bg-foreground/[0.02]">
                    <td className="border border-foreground/10 px-3 py-2 bg-orange-500/5 align-middle text-center">
                      <ModalInstructor instructor={instructor} participantes={participantes} onEliminar={() => handleEliminarInstructor(instructor.id)} />
                    </td>
                    <td className="border border-foreground/10 px-2 py-2 text-center text-foreground/30">—</td>
                    <td colSpan={3 + TOTAL_LECCIONES + 1} className="border border-foreground/10 px-3 py-2 text-foreground/30 italic">Sin estudiantes asignados</td>
                  </tr>
                );
              }
              return lista.map((est, idx) => (
                <tr key={est.id} className="hover:bg-foreground/[0.02] transition-colors">
                  {idx === 0 && (
                    <td rowSpan={lista.length} className="border border-foreground/10 px-3 py-2 bg-orange-500/5 align-middle text-center">
                      <ModalInstructor instructor={instructor} participantes={participantes} onEliminar={() => handleEliminarInstructor(instructor.id)} />
                    </td>
                  )}
                  <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/40">{idx + 1}</td>
                  <td className="border border-foreground/5 px-3 py-1.5 text-foreground font-medium whitespace-nowrap">{est.nombre} {est.apellido}</td>
                  <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">{est.cursoBiblico ? CURSO_LABELS[est.cursoBiblico] ?? est.cursoBiblico : "—"}</td>
                  <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">{est.grupoEtareo ? GRUPO_ETAREO_LABELS[est.grupoEtareo] ?? est.grupoEtareo : "—"}</td>
                  <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">{est.estadoCivil ? ESTADO_CIVIL_LABELS[est.estadoCivil] ?? est.estadoCivil : "—"}</td>
                  {Array.from({ length: TOTAL_LECCIONES }, (_, i) => {
                    const lecciones = avancesMap.get(est.id) ?? {};
                    return <CeldaAvance key={i} estudianteId={est.id} leccion={i + 1} completada={lecciones[`leccion_${i + 1}`] ?? false} />;
                  })}
                  <BotónCandidato estudianteId={est.id} candidato={est.candidatoBautismo} />
                </tr>
              ));
            })}
            {(porInstructor.get(null) ?? []).map((est, idx) => (
              <tr key={est.id} className="hover:bg-foreground/[0.02] transition-colors">
                {idx === 0 && (
                  <td rowSpan={(porInstructor.get(null) ?? []).length} className="border border-foreground/10 px-3 py-2 text-foreground/30 italic text-center align-top">Sin instructor</td>
                )}
                <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/40">{idx + 1}</td>
                <td className="border border-foreground/5 px-3 py-1.5 text-foreground font-medium whitespace-nowrap">{est.nombre} {est.apellido}</td>
                <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">{est.cursoBiblico ? CURSO_LABELS[est.cursoBiblico] ?? est.cursoBiblico : "—"}</td>
                <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">{est.grupoEtareo ? GRUPO_ETAREO_LABELS[est.grupoEtareo] ?? est.grupoEtareo : "—"}</td>
                <td className="border border-foreground/5 px-2 py-1.5 text-center text-foreground/60">{est.estadoCivil ? ESTADO_CIVIL_LABELS[est.estadoCivil] ?? est.estadoCivil : "—"}</td>
                {Array.from({ length: TOTAL_LECCIONES }, (_, i) => {
                  const lecciones = avancesMap.get(est.id) ?? {};
                  return <CeldaAvance key={i} estudianteId={est.id} leccion={i + 1} completada={lecciones[`leccion_${i + 1}`] ?? false} />;
                })}
                <BotónCandidato estudianteId={est.id} candidato={est.candidatoBautismo} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Lista de estudiantes con Editar y Eliminar ---- */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Estudiantes de la Biblia</h2>
        
        {/* Tabla (Desktop) */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-foreground/10">
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
                    <td className="px-4 py-2.5 text-foreground/70 text-xs">{est.cursoBiblico ? CURSO_LABELS[est.cursoBiblico] ?? est.cursoBiblico : "—"}</td>
                    <td className="px-4 py-2.5 text-foreground/70 text-xs">{est.grupoEtareo ? GRUPO_ETAREO_LABELS[est.grupoEtareo] ?? est.grupoEtareo : "—"}</td>
                    <td className="px-4 py-2.5 text-foreground/70 text-xs">{est.estadoCivil ? ESTADO_CIVIL_LABELS[est.estadoCivil] ?? est.estadoCivil : "—"}</td>
                    <td className="px-4 py-2.5 text-foreground/70 text-xs">{instructor?.nombre ?? "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      {est.candidatoBautismo && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400">Candidato</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-3">
                      <ModalEditarEstudiante est={est} instructores={instructores} />
                      <ConfirmDeleteButton
                        entityName={`${est.nombre} ${est.apellido}`}
                        onConfirm={() => { const fd = new FormData(); fd.set("id", est.id); eliminarEstudianteBiblico(fd); }}
                      />
                    </td>
                  </tr>
                );
              })}
              {estudiantes.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-foreground/50">Sin estudiantes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Tarjetas (Mobile) */}
        <div className="md:hidden space-y-4">
          {estudiantes.map((est) => {
            const instructor = est.instructorId ? instructorMap.get(est.instructorId) : null;
            return (
              <div key={est.id} className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4 space-y-3">
                <div className="flex justify-between items-start border-b border-foreground/5 pb-3">
                  <div>
                    <p className="font-medium text-foreground text-sm">{est.nombre} {est.apellido}</p>
                    <p className="text-xs text-foreground/60 mt-1">Instructor: {instructor?.nombre ?? "—"}</p>
                  </div>
                  {est.candidatoBautismo && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400">
                      Candidato
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-foreground/40 block mb-0.5">Curso</span>
                    <span className="text-foreground/70">{est.cursoBiblico ? CURSO_LABELS[est.cursoBiblico] ?? est.cursoBiblico : "—"}</span>
                  </div>
                  <div>
                    <span className="text-foreground/40 block mb-0.5">Grupo</span>
                    <span className="text-foreground/70">{est.grupoEtareo ? GRUPO_ETAREO_LABELS[est.grupoEtareo] ?? est.grupoEtareo : "—"}</span>
                  </div>
                  <div>
                    <span className="text-foreground/40 block mb-0.5">E. Civil</span>
                    <span className="text-foreground/70">{est.estadoCivil ? ESTADO_CIVIL_LABELS[est.estadoCivil] ?? est.estadoCivil : "—"}</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-foreground/5 mt-3">
                  <ModalEditarEstudiante est={est} instructores={instructores} />
                  <ConfirmDeleteButton
                    entityName={`${est.nombre} ${est.apellido}`}
                    onConfirm={() => { const fd = new FormData(); fd.set("id", est.id); eliminarEstudianteBiblico(fd); }}
                  />
                </div>
              </div>
            );
          })}
          {estudiantes.length === 0 && (
            <div className="p-8 text-center text-sm text-foreground/50 border border-foreground/10 rounded-lg">
              Sin estudiantes registrados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

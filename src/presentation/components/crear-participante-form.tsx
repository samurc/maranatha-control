"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

interface CrearParticipanteFormProps {
  action: (formData: FormData) => void;
  iglesiaId?: string;
  unidadId?: string;
  esRolOperativo: boolean;
  iglesias: { id: string; nombre: string }[];
  unidades: { id: string; nombre: string }[];
}

function validarFechaDDMM(valor: string): boolean {
  if (!/^\d{2}-\d{2}$/.test(valor)) return false;
  const [dd, mm] = valor.split("-").map(Number);
  return dd! >= 1 && dd! <= 31 && mm! >= 1 && mm! <= 12;
}

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Guardando...
        </span>
      ) : (
        "Guardar"
      )}
    </button>
  );
}

export function CrearParticipanteForm({
  action,
  iglesiaId,
  unidadId,
  esRolOperativo,
  iglesias,
  unidades,
}: CrearParticipanteFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  const camposValidos =
    nombre.trim().length > 0 &&
    apellido.trim().length > 0 &&
    validarFechaDDMM(fechaNacimiento);

  async function handleAction(formData: FormData) {
    await action(formData);
    dialogRef.current?.close();
    setNombre("");
    setApellido("");
    setFechaNacimiento("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        + Nuevo
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-2xl shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Nuevo Participante</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-foreground/40 hover:text-foreground transition-colors text-xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <form action={handleAction} className="space-y-4">
            {esRolOperativo && iglesiaId && (
              <>
                <input type="hidden" name="iglesiaId" value={iglesiaId} />
                <input type="hidden" name="unidadId" value={unidadId ?? ""} />
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="nombre" className="block text-sm font-medium text-foreground/80">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Juan"
                  className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="apellido" className="block text-sm font-medium text-foreground/80">
                  Apellido <span className="text-red-400">*</span>
                </label>
                <input
                  id="apellido"
                  name="apellido"
                  required
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Ej: Pérez"
                  className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="fechaNacimiento" className="block text-sm font-medium text-foreground/80">
                  Fecha de nacimiento (DD-MM) <span className="text-red-400">*</span>
                </label>
                <input
                  id="fechaNacimiento"
                  name="fechaNacimiento"
                  required
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  placeholder="Ej: 25-12"
                  pattern="\d{2}-\d{2}"
                  className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="esVisita" className="block text-sm font-medium text-foreground/80">Tipo</label>
                <select id="esVisita" name="esVisita" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                  <option value="false">Miembro</option>
                  <option value="true">Visita</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="celular" className="block text-sm font-medium text-foreground/80">Celular</label>
                <input id="celular" name="celular" placeholder="Ej: +56912345678" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="correo" className="block text-sm font-medium text-foreground/80">Correo electrónico</label>
                <input id="correo" name="correo" type="email" placeholder="Ej: participante@ejemplo.com" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="distritoResidencia" className="block text-sm font-medium text-foreground/80">Distrito (zona/barrio)</label>
                <input id="distritoResidencia" name="distritoResidencia" placeholder="Ej: Providencia" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="direccion" className="block text-sm font-medium text-foreground/80">Dirección domiciliaria</label>
                <input id="direccion" name="direccion" placeholder="Ej: Av. Principal 123" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
              </div>
              {!esRolOperativo && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="iglesiaId" className="block text-sm font-medium text-foreground/80">Iglesia</label>
                    <select id="iglesiaId" name="iglesiaId" required className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                      <option value="">Seleccionar...</option>
                      {iglesias.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="unidadId" className="block text-sm font-medium text-foreground/80">Unidad de Acción</label>
                    <select id="unidadId" name="unidadId" required className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                      <option value="">Seleccionar...</option>
                      {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div className="md:col-span-2 space-y-1.5">
                <label htmlFor="comentario" className="block text-sm font-medium text-foreground/80">Comentario</label>
                <input id="comentario" name="comentario" placeholder="Notas adicionales..." className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
              </div>
            </div>

            <SubmitBtn disabled={!camposValidos} />
          </form>
        </div>
      </dialog>
    </>
  );
}

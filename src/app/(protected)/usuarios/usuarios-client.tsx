"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { crearUsuario, actualizarRol, eliminarUsuario, type UserRecord } from "./actions";
import { DeleteButton } from "../../../presentation/components/delete-button";

const ROLES = [
  { value: "admin_global", label: "Admin Global" },
  { value: "admin_asociacion", label: "Admin Asociación" },
  { value: "pastor_distrital", label: "Pastor Distrital" },
  { value: "anciano", label: "Anciano" },
  { value: "director_es", label: "Director ES" },
  { value: "secretario", label: "Secretario" },
  { value: "maestro", label: "Maestro" },
  { value: "alumno", label: "Alumno" },
] as const;

function rolLabel(role: string | undefined): string {
  return ROLES.find((r) => r.value === role)?.label ?? role ?? "Sin rol";
}

function rolBadgeColor(role: string | undefined): string {
  switch (role) {
    case "admin_global": return "bg-purple-500/10 text-purple-400";
    case "admin_asociacion": return "bg-indigo-500/10 text-indigo-400";
    case "pastor_distrital": return "bg-blue-500/10 text-blue-400";
    case "anciano": return "bg-sky-500/10 text-sky-400";
    case "director_es": return "bg-teal-500/10 text-teal-400";
    case "secretario": return "bg-green-500/10 text-green-400";
    case "maestro": return "bg-amber-500/10 text-amber-400";
    case "alumno": return "bg-foreground/5 text-foreground/60";
    default: return "bg-red-500/10 text-red-400";
  }
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Procesando...
        </span>
      ) : label}
    </button>
  );
}

interface Props {
  usuarios: UserRecord[];
  asociaciones: { id: string; nombre: string }[];
  distritos: { id: string; nombre: string }[];
  iglesias: { id: string; nombre: string }[];
  unidades: { id: string; nombre: string }[];
}

export function UsuariosClient({ usuarios, asociaciones, distritos, iglesias, unidades }: Props) {
  const crearRef = useRef<HTMLDialogElement>(null);
  const editarRef = useRef<HTMLDialogElement>(null);
  const [editando, setEditando] = useState<UserRecord | null>(null);
  const [rolSeleccionado, setRolSeleccionado] = useState("");

  function abrirEditar(user: UserRecord) {
    setEditando(user);
    setRolSeleccionado(user.customClaims?.role ?? "");
    editarRef.current?.showModal();
  }

  async function handleCrear(formData: FormData) {
    await crearUsuario(formData);
    crearRef.current?.close();
  }

  async function handleEditar(formData: FormData) {
    await actualizarRol(formData);
    editarRef.current?.close();
    setEditando(null);
  }

  // Determinar qué campos territoriales mostrar según el rol
  const necesitaAsociacion = ["admin_asociacion", "pastor_distrital", "anciano", "director_es", "secretario", "maestro", "alumno"].includes(rolSeleccionado);
  const necesitaDistrito = ["pastor_distrital", "anciano", "director_es", "secretario", "maestro", "alumno"].includes(rolSeleccionado);
  const necesitaIglesia = ["director_es", "secretario", "maestro", "alumno"].includes(rolSeleccionado);
  const necesitaUnidad = ["secretario", "maestro", "alumno"].includes(rolSeleccionado);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Gestión de usuarios y asignación de roles (Custom Claims)
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setRolSeleccionado(""); crearRef.current?.showModal(); }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Nuevo usuario
        </button>
      </div>

      {/* Tabla de usuarios */}
      <div className="overflow-x-auto rounded-lg border border-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
              <th className="px-4 py-3 text-left font-medium text-foreground/70">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-foreground/70">Rol</th>
              <th className="px-4 py-3 text-left font-medium text-foreground/70">Alcance territorial</th>
              <th className="px-4 py-3 text-left font-medium text-foreground/70">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-foreground/70">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {usuarios.map((user) => (
              <tr key={user.uid} className="hover:bg-foreground/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-foreground font-medium">{user.displayName || user.email}</p>
                  <p className="text-xs text-foreground/50">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${rolBadgeColor(user.customClaims?.role)}`}>
                    {rolLabel(user.customClaims?.role)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-foreground/60 space-y-0.5">
                  {user.customClaims?.asociacionId && <p>Asoc: {user.customClaims.asociacionId}</p>}
                  {user.customClaims?.distritoId && <p>Dist: {user.customClaims.distritoId}</p>}
                  {user.customClaims?.iglesiaId && <p>Igl: {user.customClaims.iglesiaId}</p>}
                  {(user.customClaims as Record<string, string> | null)?.unidadId && <p>Unid: {(user.customClaims as Record<string, string>).unidadId}</p>}
                  {!user.customClaims?.asociacionId && !user.customClaims?.distritoId && !user.customClaims?.iglesiaId && !(user.customClaims as Record<string, string> | null)?.unidadId && (
                    <p className="text-foreground/30">—</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.disabled ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-500"
                  }`}>
                    {user.disabled ? "Inactivo" : "Activo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button
                    type="button"
                    onClick={() => abrirEditar(user)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Editar rol
                  </button>
                  <DeleteButton id={user.uid} action={eliminarUsuario} entityName={user.email} />
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-foreground/50">Sin usuarios registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Crear usuario */}
      <dialog
        ref={crearRef}
        className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-lg shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Nuevo Usuario</h2>
            <button type="button" onClick={() => crearRef.current?.close()} className="text-foreground/40 hover:text-foreground text-xl">×</button>
          </div>
          <form action={handleCrear} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground/80">Correo electrónico</label>
              <input name="email" type="email" required placeholder="usuario@ejemplo.com" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground/80">Contraseña</label>
              <input name="password" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground/80">Nombre completo</label>
              <input name="displayName" placeholder="Ej: Juan Pérez" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground/80">Rol</label>
              <select name="role" required value={rolSeleccionado} onChange={(e) => setRolSeleccionado(e.target.value)} className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                <option value="">Seleccionar rol...</option>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {necesitaAsociacion && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Asociación</label>
                <select name="asociacionId" required className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                  <option value="">Seleccionar...</option>
                  {asociaciones.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
            )}

            {necesitaDistrito && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Distrito</label>
                <select name="distritoId" required className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                  <option value="">Seleccionar...</option>
                  {distritos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
            )}

            {necesitaIglesia && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Iglesia</label>
                <select name="iglesiaId" required className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                  <option value="">Seleccionar...</option>
                  {iglesias.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
              </div>
            )}

            {necesitaUnidad && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Unidad de Acción</label>
                <select name="unidadId" required className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                  <option value="">Seleccionar...</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
            )}

            <SubmitBtn label="Crear Usuario" />
          </form>
        </div>
      </dialog>

      {/* Modal: Editar rol */}
      <dialog
        ref={editarRef}
        className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-lg shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Editar Custom Claims</h2>
            <button type="button" onClick={() => editarRef.current?.close()} className="text-foreground/40 hover:text-foreground text-xl">×</button>
          </div>
          {editando && (
            <div className="mb-4 rounded-lg bg-foreground/[0.03] border border-foreground/10 p-3">
              <p className="text-sm font-medium text-foreground">{editando.displayName || editando.email}</p>
              <p className="text-xs text-foreground/50">{editando.email} — UID: {editando.uid.slice(0, 12)}...</p>
            </div>
          )}
          <form action={handleEditar} className="space-y-4">
            <input type="hidden" name="uid" value={editando?.uid ?? ""} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground/80">Rol</label>
              <select name="role" required value={rolSeleccionado} onChange={(e) => setRolSeleccionado(e.target.value)} className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                <option value="">Seleccionar rol...</option>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {necesitaAsociacion && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Asociación</label>
                <select name="asociacionId" required defaultValue={editando?.customClaims?.asociacionId ?? ""} className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                  <option value="">Seleccionar...</option>
                  {asociaciones.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
            )}

            {necesitaDistrito && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Distrito</label>
                <select name="distritoId" required defaultValue={editando?.customClaims?.distritoId ?? ""} className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                  <option value="">Seleccionar...</option>
                  {distritos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
            )}

            {necesitaIglesia && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Iglesia</label>
                <select name="iglesiaId" required defaultValue={editando?.customClaims?.iglesiaId ?? ""} className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                  <option value="">Seleccionar...</option>
                  {iglesias.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
              </div>
            )}

            {necesitaUnidad && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Unidad de Acción</label>
                <select name="unidadId" required defaultValue={(editando?.customClaims as Record<string, string> | null)?.unidadId ?? ""} className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                  <option value="">Seleccionar...</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
            )}

            <SubmitBtn label="Guardar Claims" />
          </form>
        </div>
      </dialog>
    </div>
  );
}

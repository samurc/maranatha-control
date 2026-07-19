import { SectionGuard } from "../../../presentation/components/section-guard";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { ModalForm, FormField } from "../../../presentation/components/modal-form";
import { DeleteButton } from "../../../presentation/components/delete-button";
import { crearUnidad, eliminarUnidad } from "./actions";

export default async function UnidadesPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  let contenido: React.JSX.Element;
  if (claims === null) {
    contenido = <></>;
  } else {
    const db = obtenerFirestoreAdmin();
    const [unidadesSnap, iglesiasSnap] = await Promise.all([
      db.collection("unidades_accion").get(),
      db.collection("iglesias").get(),
    ]);
    const unidades = unidadesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const iglesias = iglesiasSnap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre }));

    contenido = (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Unidades de Acción</h1>
            <p className="mt-1 text-sm text-foreground/60">
              Grupos pequeños de Escuela Sabática
            </p>
          </div>
          <ModalForm
            id="crear-unidad"
            title="Nueva Unidad de Acción"
            action={crearUnidad}
            trigger={
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                + Nueva
              </button>
            }
          >
            <FormField label="Nombre" name="nombre" required placeholder="Ej: Adultos - Grupo 1" />
            <div className="space-y-1.5">
              <label htmlFor="iglesiaId" className="block text-sm font-medium text-foreground/80">Iglesia</label>
              <select id="iglesiaId" name="iglesiaId" required className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                <option value="">Seleccionar...</option>
                {iglesias.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
            <FormField label="UID del Maestro (opcional)" name="maestroUid" placeholder="UID de Firebase Auth" />
          </ModalForm>
        </div>

        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Iglesia</th>
                <th className="px-4 py-3 text-right font-medium text-foreground/70">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {unidades.map((u: Record<string, unknown>) => (
                <tr key={u.id as string} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">{u.nombre as string}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.estado === "activa" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"
                    }`}>
                      {u.estado as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground/70 font-mono text-xs">{u.iglesiaId as string}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton id={u.id as string} action={eliminarUnidad} entityName={u.nombre as string} />
                  </td>
                </tr>
              ))}
              {unidades.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-foreground/50">Sin unidades registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <SectionGuard resource="unidad_accion">{contenido}</SectionGuard>;
}

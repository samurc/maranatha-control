import { SectionGuard } from "../../../presentation/components/section-guard";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { ModalForm, FormField } from "../../../presentation/components/modal-form";
import { DeleteButton } from "../../../presentation/components/delete-button";
import { crearDistrito, eliminarDistrito } from "./actions";

export default async function DistritosPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  let contenido: React.JSX.Element;
  if (claims === null) {
    contenido = <></>;
  } else {
    const db = obtenerFirestoreAdmin();
    const [distritosSnap, asociacionesSnap] = await Promise.all([
      db.collection("distritos").get(),
      db.collection("asociaciones").get(),
    ]);
    const distritos = distritosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const asociaciones = asociacionesSnap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre }));

    contenido = (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Distritos</h1>
            <p className="mt-1 text-sm text-foreground/60">
              Gestión de Distritos pastorales
            </p>
          </div>
          <ModalForm
            id="crear-distrito"
            title="Nuevo Distrito"
            action={crearDistrito}
            trigger={
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                + Nuevo
              </button>
            }
          >
            <FormField label="Nombre" name="nombre" required placeholder="Ej: Distrito Santiago Centro" />
            <div className="space-y-1.5">
              <label htmlFor="asociacionId" className="block text-sm font-medium text-foreground/80">Asociación</label>
              <select
                id="asociacionId"
                name="asociacionId"
                required
                className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
              >
                <option value="">Seleccionar...</option>
                {asociaciones.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          </ModalForm>
        </div>

        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Asociación</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">ID</th>
                <th className="px-4 py-3 text-right font-medium text-foreground/70">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {distritos.map((d: Record<string, unknown>) => (
                <tr key={d.id as string} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">{d.nombre as string}</td>
                  <td className="px-4 py-3 text-foreground/70 text-xs">{d.asociacionId as string}</td>
                  <td className="px-4 py-3 text-foreground/50 font-mono text-xs">{d.id as string}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton id={d.id as string} action={eliminarDistrito} entityName={d.nombre as string} />
                  </td>
                </tr>
              ))}
              {distritos.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-foreground/50">Sin distritos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <SectionGuard resource="distrito">{contenido}</SectionGuard>;
}

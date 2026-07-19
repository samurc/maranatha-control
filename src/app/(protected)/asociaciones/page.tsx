import { SectionGuard } from "../../../presentation/components/section-guard";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { ModalForm, FormField } from "../../../presentation/components/modal-form";
import { DeleteButton } from "../../../presentation/components/delete-button";
import { crearAsociacion, eliminarAsociacion } from "./actions";

export default async function AsociacionesPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  let contenido: React.JSX.Element;
  if (claims === null) {
    contenido = <></>;
  } else {
    const db = obtenerFirestoreAdmin();
    const snap = await db.collection("asociaciones").get();
    const asociaciones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    contenido = (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Asociaciones</h1>
            <p className="mt-1 text-sm text-foreground/60">
              Gestión de Asociaciones y Misiones
            </p>
          </div>
          <ModalForm
            id="crear-asociacion"
            title="Nueva Asociación"
            action={crearAsociacion}
            trigger={
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                + Nueva
              </button>
            }
          >
            <FormField label="Nombre" name="nombre" required placeholder="Ej: Asociación Central Sur" />
            <FormField label="Código de país" name="paisCodigo" required placeholder="Ej: CL, MX, AR" />
          </ModalForm>
        </div>

        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">País</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">ID</th>
                <th className="px-4 py-3 text-right font-medium text-foreground/70">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {asociaciones.map((a: Record<string, unknown>) => (
                <tr key={a.id as string} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">{a.nombre as string}</td>
                  <td className="px-4 py-3 text-foreground/70">{a.paisCodigo as string}</td>
                  <td className="px-4 py-3 text-foreground/50 font-mono text-xs">{a.id as string}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton id={a.id as string} action={eliminarAsociacion} entityName={a.nombre as string} />
                  </td>
                </tr>
              ))}
              {asociaciones.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-foreground/50">Sin asociaciones registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <SectionGuard resource="asociacion">{contenido}</SectionGuard>;
}

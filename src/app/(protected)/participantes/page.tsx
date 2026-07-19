import { SectionGuard } from "../../../presentation/components/section-guard";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { ModalForm, FormField } from "../../../presentation/components/modal-form";
import { DeleteButton } from "../../../presentation/components/delete-button";
import { crearParticipante, eliminarParticipante } from "./actions";

export default async function ParticipantesPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  let contenido: React.JSX.Element;
  if (claims === null) {
    contenido = <></>;
  } else {
    const db = obtenerFirestoreAdmin();
    const [participantesSnap, unidadesSnap, iglesiasSnap] = await Promise.all([
      db.collection("participantes").limit(100).get(),
      db.collection("unidades_accion").get(),
      db.collection("iglesias").get(),
    ]);
    const participantes = participantesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const unidades = unidadesSnap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre, iglesiaId: d.data().iglesiaId }));
    const iglesias = iglesiasSnap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre }));

    contenido = (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Participantes</h1>
            <p className="mt-1 text-sm text-foreground/60">
              Miembros y visitas de las Unidades de Acción
            </p>
          </div>
          <ModalForm
            id="crear-participante"
            title="Nuevo Participante"
            action={crearParticipante}
            trigger={
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                + Nuevo
              </button>
            }
          >
            <FormField label="Nombre" name="nombre" required placeholder="Ej: Juan" />
            <FormField label="Apellido" name="apellido" required placeholder="Ej: Pérez" />
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
            <div className="space-y-1.5">
              <label htmlFor="esVisita" className="block text-sm font-medium text-foreground/80">Tipo</label>
              <select id="esVisita" name="esVisita" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                <option value="false">Miembro</option>
                <option value="true">Visita</option>
              </select>
            </div>
          </ModalForm>
        </div>

        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Unidad</th>
                <th className="px-4 py-3 text-right font-medium text-foreground/70">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {participantes.map((p: Record<string, unknown>) => (
                <tr key={p.id as string} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">{p.nombre as string} {p.apellido as string}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.estado === "activo" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"
                    }`}>
                      {p.estado as string}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.esVisita ? "bg-blue-500/10 text-blue-400" : "bg-foreground/5 text-foreground/60"
                    }`}>
                      {p.esVisita ? "Visita" : "Miembro"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground/70 font-mono text-xs">{p.unidadId as string}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton id={p.id as string} action={eliminarParticipante} entityName={`${p.nombre as string} ${p.apellido as string}`} />
                  </td>
                </tr>
              ))}
              {participantes.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-foreground/50">Sin participantes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <SectionGuard resource="participante">{contenido}</SectionGuard>;
}

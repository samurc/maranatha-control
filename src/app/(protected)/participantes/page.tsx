import { SectionGuard } from "../../../presentation/components/section-guard";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { DeleteButton } from "../../../presentation/components/delete-button";
import { CrearParticipanteForm } from "../../../presentation/components/crear-participante-form";
import { EditarParticipanteForm } from "../../../presentation/components/editar-participante-form";
import { crearParticipante, eliminarParticipante, editarParticipante } from "./actions";

export default async function ParticipantesPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  let contenido: React.JSX.Element;
  if (claims === null) {
    contenido = <></>;
  } else {
    const db = obtenerFirestoreAdmin();
    const esRolOperativo = claims.role === "secretario" || claims.role === "maestro";

    // Si es secretario/maestro, solo mostrar participantes de su unidad
    const participantesQuery = esRolOperativo && claims.unidadId
      ? db.collection("participantes").where("unidadId", "==", claims.unidadId).limit(100)
      : esRolOperativo && claims.iglesiaId
        ? db.collection("participantes").where("iglesiaId", "==", claims.iglesiaId).limit(100)
        : db.collection("participantes").limit(100);

    const [participantesSnap, unidadesSnap, iglesiasSnap] = await Promise.all([
      participantesQuery.get(),
      esRolOperativo && claims.iglesiaId
        ? db.collection("unidades_accion").where("iglesiaId", "==", claims.iglesiaId).get()
        : db.collection("unidades_accion").get(),
      db.collection("iglesias").get(),
    ]);

    const participantes = participantesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const unidades = unidadesSnap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre, iglesiaId: d.data().iglesiaId }));
    const iglesias = iglesiasSnap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre }));

    // Resolver nombre de iglesia y unidad para mostrar en la info del secretario/maestro
    const iglesiaActual = iglesias.find((i) => i.id === claims.iglesiaId);
    const unidadActual = unidades.find((u) => u.id === claims.unidadId);

    contenido = (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Participantes</h1>
            <p className="mt-1 text-sm text-foreground/60">
              {esRolOperativo && unidadActual
                ? `${iglesiaActual?.nombre ?? ""} — ${unidadActual.nombre}`
                : esRolOperativo && iglesiaActual
                  ? `Miembros y visitas de ${iglesiaActual.nombre}`
                  : "Miembros y visitas de las Unidades de Acción"}
            </p>
          </div>
          <CrearParticipanteForm
            action={crearParticipante}
            esRolOperativo={esRolOperativo}
            iglesiaId={claims.iglesiaId}
            unidadId={claims.unidadId}
            iglesias={iglesias}
            unidades={unidades}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">F. Nacimiento</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Comentario</th>
                <th className="px-4 py-3 text-right font-medium text-foreground/70">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {participantes.map((p: Record<string, unknown>) => (
                <tr key={p.id as string} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">{p.nombre as string} {p.apellido as string}</td>
                  <td className="px-4 py-3 text-foreground/70 text-xs">{(p.fechaNacimiento as string) ?? "—"}</td>
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
                  <td className="px-4 py-3 text-foreground/70 text-xs">{(p.comentario as string) ?? "—"}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <EditarParticipanteForm
                      participante={{
                        id: p.id as string,
                        nombre: p.nombre as string,
                        apellido: p.apellido as string,
                        esVisita: p.esVisita as boolean,
                        estado: p.estado as string | undefined,
                        fechaNacimiento: p.fechaNacimiento as string | undefined,
                        celular: p.celular as string | undefined,
                        correo: p.correo as string | undefined,
                        distritoResidencia: p.distritoResidencia as string | undefined,
                        direccion: p.direccion as string | undefined,
                        comentario: p.comentario as string | undefined,
                      }}
                      action={editarParticipante}
                    />
                    <DeleteButton id={p.id as string} action={eliminarParticipante} entityName={`${p.nombre as string} ${p.apellido as string}`} />
                  </td>
                </tr>
              ))}
              {participantes.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-foreground/50">Sin participantes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <SectionGuard resource="participante">{contenido}</SectionGuard>;
}

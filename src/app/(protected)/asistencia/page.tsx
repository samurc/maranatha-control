import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { redirect } from "next/navigation";
import { AsistenciaClient } from "./asistencia-client";

export default async function AsistenciaPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  if (claims === null) {
    redirect("/login");
  }

  const esRolOperativo = claims.role === "secretario" || claims.role === "maestro";
  if (!esRolOperativo) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-foreground/50">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  const db = obtenerFirestoreAdmin();

  // Obtener participantes activos de la unidad
  const participantesQuery = claims.unidadId
    ? db.collection("participantes").where("unidadId", "==", claims.unidadId).where("estado", "==", "activo")
    : claims.iglesiaId
      ? db.collection("participantes").where("iglesiaId", "==", claims.iglesiaId).where("estado", "==", "activo")
      : null;

  if (!participantesQuery) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-foreground/50">No tienes una unidad o iglesia asignada.</p>
      </div>
    );
  }

  const participantesSnap = await participantesQuery.get();
  const participantes = participantesSnap.docs.map((d) => ({
    id: d.id,
    nombre: d.data().nombre as string,
    apellido: d.data().apellido as string,
    fechaNacimiento: (d.data().fechaNacimiento as string) ?? "",
  }));

  // Obtener nombre de unidad e iglesia
  let nombreUnidad = "";
  let nombreIglesia = "";
  if (claims.unidadId) {
    const unidadDoc = await db.collection("unidades_accion").doc(claims.unidadId).get();
    nombreUnidad = unidadDoc.exists ? (unidadDoc.data()?.nombre as string) : "";
  }
  if (claims.iglesiaId) {
    const iglesiaDoc = await db.collection("iglesias").doc(claims.iglesiaId).get();
    nombreIglesia = iglesiaDoc.exists ? (iglesiaDoc.data()?.nombre as string) : "";
  }

  // Obtener registros sabáticos existentes para esta unidad (trimestre actual)
  const ahora = new Date();
  const trimestre = Math.ceil((ahora.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;
  const anio = ahora.getFullYear();

  const registrosQuery = claims.unidadId
    ? db.collection("registros_sabaticos").where("unidadId", "==", claims.unidadId)
    : null;

  let registrosExistentes: Record<string, Record<string, { presente: boolean; diasEstudio: number }>> = {};

  if (registrosQuery) {
    const registrosSnap = await registrosQuery.get();
    for (const doc of registrosSnap.docs) {
      const data = doc.data();
      const sabado = data.sabadoEclesiastico as { anio: number; numeroTrimestre: number; numeroSabado: number } | undefined;
      if (sabado && sabado.anio === anio && sabado.numeroTrimestre === trimestre) {
        const clave = `S${sabado.numeroSabado}`;
        const asistencia = (data.asistencia ?? {}) as Record<string, { presente: boolean; diasEstudio: number }>;
        registrosExistentes[clave] = {};
        for (const [pid, entry] of Object.entries(asistencia)) {
          registrosExistentes[clave]![pid] = {
            presente: entry.presente,
            diasEstudio: entry.diasEstudio,
          };
        }
      }
    }
  }

  return (
    <AsistenciaClient
      participantes={participantes}
      nombreUnidad={nombreUnidad}
      nombreIglesia={nombreIglesia}
      trimestre={trimestre}
      anio={anio}
      iglesiaId={claims.iglesiaId ?? ""}
      unidadId={claims.unidadId ?? ""}
      registrosExistentes={registrosExistentes}
    />
  );
}

import { redirect } from "next/navigation";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import {
  EncargadosClient,
  type ParticipanteActivo,
} from "./encargados-client";
import {
  CANTIDAD_SABADOS,
  proximosSabados,
  type EstadoSabado,
} from "./sabados";

export default async function EncargadosPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  if (claims === null) {
    redirect("/login");
  }

  if (claims.role !== "secretario") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-foreground/50">
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    );
  }

  const db = obtenerFirestoreAdmin();

  // Participantes activos acotados por unidad (o iglesia si no hay unidad).
  const participantesQuery = claims.unidadId
    ? db
        .collection("participantes")
        .where("unidadId", "==", claims.unidadId)
        .where("estado", "==", "activo")
    : claims.iglesiaId
      ? db
          .collection("participantes")
          .where("iglesiaId", "==", claims.iglesiaId)
          .where("estado", "==", "activo")
      : null;

  if (!participantesQuery) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-foreground/50">
          No tienes una unidad o iglesia asignada.
        </p>
      </div>
    );
  }

  const participantesSnap = await participantesQuery.get();
  const participantes: ParticipanteActivo[] = participantesSnap.docs
    .map((d) => ({
      id: d.id,
      nombre: (d.data().nombre as string) ?? "",
      apellido: (d.data().apellido as string) ?? "",
      fotoUrl: d.data().fotoUrl as string | undefined,
      comentario: (d.data().comentario as string | undefined) || undefined,
    }))
    .sort((a, b) =>
      `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, "es")
    );

  // Nombres de unidad e iglesia (para el encabezado).
  let nombreUnidad = "";
  let nombreIglesia = "";
  if (claims.unidadId) {
    const unidadDoc = await db.collection("unidades_accion").doc(claims.unidadId).get();
    nombreUnidad = unidadDoc.exists ? ((unidadDoc.data()?.nombre as string) ?? "") : "";
  }
  if (claims.iglesiaId) {
    const iglesiaDoc = await db.collection("iglesias").doc(claims.iglesiaId).get();
    nombreIglesia = iglesiaDoc.exists ? ((iglesiaDoc.data()?.nombre as string) ?? "") : "";
  }

  const sabados = proximosSabados(new Date(), CANTIDAD_SABADOS);

  // Asignaciones existentes de encargados dentro del alcance del secretario
  // y limitadas a las fechas visibles.
  const unidadKey = claims.unidadId ?? "";
  const fechasVisibles = new Set(sabados.map((s) => s.fechaISO));

  const encargadosQuery = claims.unidadId
    ? db
        .collection("encargados")
        .where("iglesiaId", "==", claims.iglesiaId)
        .where("unidadId", "==", unidadKey)
    : db.collection("encargados").where("iglesiaId", "==", claims.iglesiaId);

  const asignacionesIniciales: Record<string, string> = {};
  const estadosIniciales: Record<string, EstadoSabado> = {};
  const encargadosSnap = await encargadosQuery.get();
  for (const doc of encargadosSnap.docs) {
    const data = doc.data();
    const fechaISO = data.fechaISO as string | undefined;
    if (!fechaISO || !fechasVisibles.has(fechaISO)) continue;

    // Documento de estado del sábado.
    if (data.tipo === "estado") {
      const estado = data.estado as string | undefined;
      if (estado === "por_confirmar" || estado === "confirmado") {
        estadosIniciales[fechaISO] = estado;
      }
      continue;
    }

    // Documento de asignación de casillero.
    const slot = data.slot as number | undefined;
    const participanteId = data.participanteId as string | undefined;
    if (typeof slot === "number" && participanteId) {
      asignacionesIniciales[`${fechaISO}_slot${slot}`] = participanteId;
    }
  }

  return (
    <EncargadosClient
      participantes={participantes}
      sabados={sabados}
      nombreUnidad={nombreUnidad}
      nombreIglesia={nombreIglesia}
      asignacionesIniciales={asignacionesIniciales}
      estadosIniciales={estadosIniciales}
    />
  );
}

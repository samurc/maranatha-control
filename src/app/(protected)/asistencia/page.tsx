import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { redirect } from "next/navigation";
import { AsistenciaClient } from "./asistencia-client";
import { SelectorTrimestre } from "../../../presentation/components/selector-trimestre";

/** Normaliza un valor de search param a entero dentro de [min, max]; si no, devuelve el fallback. */
function paramEntero(
  valor: string | string[] | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  const raw = Array.isArray(valor) ? valor[0] : valor;
  const n = raw != null ? parseInt(raw, 10) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<React.JSX.Element> {
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
  const participantes = participantesSnap.docs
    // Excluir participantes marcados con excluir_asistencia (ausencia justificada).
    .filter((d) => d.data().excluir_asistencia !== true)
    .map((d) => ({
      id: d.id,
      nombre: d.data().nombre as string,
      apellido: d.data().apellido as string,
      fechaNacimiento: (d.data().fechaNacimiento as string) ?? "",
      fotoUrl: d.data().fotoUrl as string | undefined,
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

  // Periodo: por defecto el trimestre/año actuales; se puede cambiar con el
  // selector, que refleja su estado en los search params (?anio=&trimestre=).
  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const trimestreActual = Math.ceil((ahora.getMonth() + 1) / 3);
  const sp = await searchParams;
  const anio = paramEntero(sp.anio, anioActual - 5, anioActual + 1, anioActual);
  const trimestre = paramEntero(sp.trimestre, 1, 4, trimestreActual) as 1 | 2 | 3 | 4;
  // Años ofrecidos en el selector: actual y los cinco anteriores.
  const aniosDisponibles = Array.from({ length: 6 }, (_, i) => anioActual - i);

  const registrosQuery = claims.unidadId
    ? db.collection("registros_sabaticos").where("unidadId", "==", claims.unidadId)
    : null;

  const registrosExistentes: Record<string, Record<string, { presente: boolean; diasEstudio: number; justificado: boolean }>> = {};
  const indicadoresExistentes: Record<string, string> = {};

  if (registrosQuery) {
    const registrosSnap = await registrosQuery.get();
    for (const doc of registrosSnap.docs) {
      const data = doc.data();
      const sabado = data.sabadoEclesiastico as { anio: number; numeroTrimestre: number; numeroSabado: number } | undefined;
      if (sabado && sabado.anio === anio && sabado.numeroTrimestre === trimestre) {
        const clave = `S${sabado.numeroSabado}`;
        const asistencia = (data.asistencia ?? {}) as Record<string, { presente: boolean; diasEstudio: number; justificado?: boolean }>;
        registrosExistentes[clave] = {};
        for (const [pid, entry] of Object.entries(asistencia)) {
          registrosExistentes[clave]![pid] = {
            presente: entry.presente,
            diasEstudio: entry.diasEstudio,
            justificado: entry.justificado === true,
          };
        }
      }
    }
  }

  // Cargar indicadores semanales
  if (claims.unidadId && claims.iglesiaId) {
    const indicadorDocId = `${claims.iglesiaId}_${claims.unidadId}_${anio}_T${trimestre}_indicadores`;
    const indicadorDoc = await db.collection("indicadores_semanales").doc(indicadorDocId).get();
    if (indicadorDoc.exists) {
      const data = indicadorDoc.data()!;
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === "string" && k !== "iglesiaId" && k !== "unidadId" && k !== "actualizadoEn") {
          indicadoresExistentes[k] = v;
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
      indicadoresExistentes={indicadoresExistentes}
      fechaHoy={ahora.toISOString().split("T")[0]!}
      selector={
        <SelectorTrimestre anio={anio} trimestre={trimestre} anios={aniosDisponibles} />
      }
    />
  );
}

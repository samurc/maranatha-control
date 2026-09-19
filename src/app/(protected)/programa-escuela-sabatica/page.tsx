import { redirect } from "next/navigation";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { proximosSabados } from "../encargados/sabados";
import { ProgramaClient } from "./programa-client";

/**
 * `/programa-escuela-sabatica` — Monitoreo del programa en tiempo real.
 *
 * El cronograma y los countdowns son lógica de cliente (hora local, sin
 * persistencia). Lo único que se carga en el servidor son los ENCARGADOS
 * del sábado en curso/próximo, leídos de la colección `encargados` (misma
 * fuente que el módulo /encargados), para mostrar quién dirige cada momento.
 */
export default async function ProgramaEscuelaSabaticaPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  if (claims === null) {
    redirect("/login");
  }

  // Sábado objetivo: el próximo (o el de hoy si ya es sábado), igual criterio
  // que /encargados.
  const sabado = proximosSabados(new Date(), 1)[0]!;

  // Encargados por slot (índice de momento del programa) -> {nombre, fotoUrl}.
  // Se acota al alcance territorial del actor, igual que /encargados.
  const encargadosPorSlot: Record<number, { nombre: string; fotoUrl: string | null }> = {};

  // Himnos del sábado objetivo (misma fuente: doc `tipo: "himnos"`).
  let himnoInicial = "";
  let himnoFinal = "";

  if (claims.iglesiaId) {
    const db = obtenerFirestoreAdmin();
    const unidadId = claims.unidadId ?? "";

    const encargadosQuery = claims.unidadId
      ? db
        .collection("encargados")
        .where("iglesiaId", "==", claims.iglesiaId)
        .where("unidadId", "==", unidadId)
      : db.collection("encargados").where("iglesiaId", "==", claims.iglesiaId);

    const snap = await encargadosQuery.get();

    // slot -> participanteId (asignaciones) e himnos, solo para el sábado
    // objetivo. Los documentos de tipo "estado" se ignoran aquí.
    const slotAParticipante = new Map<number, string>();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.fechaISO !== sabado.fechaISO) continue;
      if (data.tipo === "himnos") {
        himnoInicial = (data.himnoInicial as string | null) ?? "";
        himnoFinal = (data.himnoFinal as string | null) ?? "";
        continue;
      }
      const slot = data.slot as number | undefined;
      const participanteId = data.participanteId as string | undefined;
      if (typeof slot === "number" && participanteId) {
        slotAParticipante.set(slot, participanteId);
      }
    }

    // Resolver nombre y foto de los participantes asignados (una lectura por id).
    const ids = Array.from(new Set(slotAParticipante.values()));
    const datosPorId = new Map<string, { nombre: string; fotoUrl: string | null }>();
    await Promise.all(
      ids.map(async (id) => {
        const p = await db.collection("participantes").doc(id).get();
        if (p.exists) {
          const d = p.data()!;
          datosPorId.set(id, {
            nombre: `${(d.nombre as string) ?? ""} ${(d.apellido as string) ?? ""}`.trim(),
            fotoUrl: (d.fotoUrl as string | undefined) ?? null,
          });
        }
      })
    );

    for (const [slot, participanteId] of slotAParticipante) {
      const datos = datosPorId.get(participanteId);
      if (datos) encargadosPorSlot[slot] = datos;
    }
  }

  return (
    <ProgramaClient
      encargadosPorSlot={encargadosPorSlot}
      sabadoEtiqueta={sabado.etiqueta}
      himnoInicial={himnoInicial}
      himnoFinal={himnoFinal}
    />
  );
}

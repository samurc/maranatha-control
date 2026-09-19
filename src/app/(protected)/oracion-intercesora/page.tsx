import { SectionGuard } from "../../../presentation/components/section-guard";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { OracionClient, type PresenteOracion, type SabadoOpcion } from "./oracion-client";
import { guardarGruposOracion } from "./actions";

export default async function OracionIntercesoraPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  let contenido: React.JSX.Element;
  if (claims === null) {
    contenido = <></>;
  } else {
    const db = obtenerFirestoreAdmin();

    const esRolOperativo = claims.role === "secretario" || claims.role === "maestro";

    // Registros del ámbito (mismo criterio que /registros).
    const registrosQuery = esRolOperativo && claims.unidadId
      ? db.collection("registros_sabaticos").where("unidadId", "==", claims.unidadId)
      : esRolOperativo && claims.iglesiaId
        ? db.collection("registros_sabaticos").where("iglesiaId", "==", claims.iglesiaId)
        : db.collection("registros_sabaticos").orderBy("creadoEn", "desc").limit(20);

    const snap = await registrosQuery.get();
    const registros = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const sabA = (a as Record<string, unknown>).sabadoEclesiastico as { anio?: number; numeroTrimestre?: number; numeroSabado?: number } | undefined;
        const sabB = (b as Record<string, unknown>).sabadoEclesiastico as { anio?: number; numeroTrimestre?: number; numeroSabado?: number } | undefined;
        const keyA = ((sabA?.anio ?? 0) * 10000) + ((sabA?.numeroTrimestre ?? 0) * 100) + (sabA?.numeroSabado ?? 0);
        const keyB = ((sabB?.anio ?? 0) * 10000) + ((sabB?.numeroTrimestre ?? 0) * 100) + (sabB?.numeroSabado ?? 0);
        return keyB - keyA;
      });

    const sabados: SabadoOpcion[] = registros.map((r) => {
      const sab = (r as Record<string, unknown>).sabadoEclesiastico as { fechaISO?: string; numeroSabado?: number; numeroTrimestre?: number } | undefined;
      return {
        registroId: r.id as string,
        label: `${sab?.fechaISO ?? "—"} (T${sab?.numeroTrimestre} S${sab?.numeroSabado})`,
      };
    });

    // Cargar participantes del ámbito una sola vez (para resolver presentes).
    const participantesQuery = esRolOperativo && claims.unidadId
      ? db.collection("participantes").where("unidadId", "==", claims.unidadId).limit(500)
      : esRolOperativo && claims.iglesiaId
        ? db.collection("participantes").where("iglesiaId", "==", claims.iglesiaId).limit(500)
        : db.collection("participantes").limit(500);
    const participantesSnap = await participantesQuery.get();
    const participantePorId = new Map<string, PresenteOracion>();
    for (const doc of participantesSnap.docs) {
      const p = doc.data() as { nombre?: string; apellido?: string; fotoUrl?: string; genero?: string };
      participantePorId.set(doc.id, {
        id: doc.id,
        nombre: `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || doc.id,
        fotoUrl: typeof p.fotoUrl === "string" && p.fotoUrl.length > 0 ? p.fotoUrl : null,
        genero: p.genero === "hombre" || p.genero === "mujer" ? p.genero : null,
      });
    }

    // Presentes por registro (para todos los sábados).
    const presentesPorRegistro: Record<string, PresenteOracion[]> = {};
    for (const r of registros) {
      const asistencia = ((r as Record<string, unknown>).asistencia ?? {}) as Record<string, { presente?: boolean }>;
      const lista: PresenteOracion[] = [];
      for (const [pid, e] of Object.entries(asistencia)) {
        if (e?.presente !== true) continue;
        const p = participantePorId.get(pid);
        if (p) lista.push(p);
      }
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      presentesPorRegistro[r.id as string] = lista;
    }

    // Grupos guardados por registro (todos los que existan en el ámbito).
    const norm = (v: unknown): string[][] =>
      Array.isArray(v)
        ? v
          .map((g) =>
            g && typeof g === "object" && Array.isArray((g as { ids?: unknown }).ids)
              ? (g as { ids: unknown[] }).ids.filter((x): x is string => typeof x === "string")
              : []
          )
          .filter((g) => g.length > 0)
        : [];
    const gruposPorRegistro: Record<string, { hombres: string[][]; mujeres: string[][]; mixtos: string[][]; mixto: boolean }> = {};
    if (registros.length > 0) {
      const refs = registros.map((r) => db.collection("oracion_intercesora").doc(r.id as string));
      const docs = await db.getAll(...refs);
      for (const doc of docs) {
        if (!doc.exists) continue;
        const d = doc.data()!;
        gruposPorRegistro[doc.id] = {
          hombres: norm(d.hombres),
          mujeres: norm(d.mujeres),
          mixtos: norm(d.mixtos),
          mixto: d.mixto === true,
        };
      }
    }

    contenido = (
      <OracionClient
        sabados={sabados}
        presentesPorRegistro={presentesPorRegistro}
        gruposPorRegistro={gruposPorRegistro}
        guardarGrupos={guardarGruposOracion}
      />
    );
  }

  return <SectionGuard resource="registro_sabatico">{contenido}</SectionGuard>;
}

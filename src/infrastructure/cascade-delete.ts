/**
 * Eliminación en cascada para Firestore.
 *
 * Sigue la jerarquía territorial:
 *   Asociación → Distritos → Iglesias → Unidades → Participantes → Registros
 *
 * Cada función elimina el documento raíz y todos sus descendientes.
 * Firestore no soporta cascada nativa, así que se implementa manualmente.
 */
import "server-only";
import type { Firestore } from "firebase-admin/firestore";

/** Elimina todos los documentos de una colección que coincidan con un filtro. */
async function eliminarConFiltro(
  db: Firestore,
  coleccion: string,
  campo: string,
  valor: string
): Promise<string[]> {
  const snap = await db.collection(coleccion).where(campo, "==", valor).get();
  const ids = snap.docs.map((d) => d.id);
  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
  }
  if (snap.docs.length > 0) {
    await batch.commit();
  }
  return ids;
}

/** Elimina un Participante y sus referencias en enlaces_pendientes. */
export async function eliminarParticipanteCascada(
  db: Firestore,
  participanteId: string
): Promise<void> {
  // Eliminar enlaces pendientes asociados
  const enlacesSnap = await db
    .collection("enlaces_pendientes")
    .where("participanteId", "==", participanteId)
    .get();
  const batch = db.batch();
  for (const doc of enlacesSnap.docs) {
    batch.delete(doc.ref);
  }
  batch.delete(db.collection("participantes").doc(participanteId));
  await batch.commit();
}

/** Elimina una Unidad de Acción y todos sus Participantes y Registros Sabáticos. */
export async function eliminarUnidadCascada(
  db: Firestore,
  unidadId: string
): Promise<void> {
  // Eliminar participantes de esta unidad
  const participantesSnap = await db
    .collection("participantes")
    .where("unidadId", "==", unidadId)
    .get();
  for (const doc of participantesSnap.docs) {
    await eliminarParticipanteCascada(db, doc.id);
  }

  // Eliminar registros sabáticos de esta unidad
  await eliminarConFiltro(db, "registros_sabaticos", "unidadId", unidadId);

  // Eliminar la unidad
  await db.collection("unidades_accion").doc(unidadId).delete();
}

/** Elimina una Iglesia y todas sus Unidades, Participantes, Registros y Auditoría. */
export async function eliminarIglesiaCascada(
  db: Firestore,
  iglesiaId: string
): Promise<void> {
  // Eliminar unidades de acción de esta iglesia
  const unidadesSnap = await db
    .collection("unidades_accion")
    .where("iglesiaId", "==", iglesiaId)
    .get();
  for (const doc of unidadesSnap.docs) {
    await eliminarUnidadCascada(db, doc.id);
  }

  // Eliminar participantes directamente asociados a esta iglesia (por si hay huérfanos)
  await eliminarConFiltro(db, "participantes", "iglesiaId", iglesiaId);

  // Eliminar registros sabáticos de esta iglesia
  await eliminarConFiltro(db, "registros_sabaticos", "iglesiaId", iglesiaId);

  // Eliminar eventos de auditoría de esta iglesia
  await eliminarConFiltro(db, "auditoria", "iglesiaId", iglesiaId);

  // Eliminar la iglesia
  await db.collection("iglesias").doc(iglesiaId).delete();
}

/** Elimina un Distrito y todas sus Iglesias (con cascada). */
export async function eliminarDistritoCascada(
  db: Firestore,
  distritoId: string
): Promise<void> {
  // Eliminar iglesias de este distrito
  const iglesiasSnap = await db
    .collection("iglesias")
    .where("distritoId", "==", distritoId)
    .get();
  for (const doc of iglesiasSnap.docs) {
    await eliminarIglesiaCascada(db, doc.id);
  }

  // Eliminar el distrito
  await db.collection("distritos").doc(distritoId).delete();
}

/** Elimina una Asociación y todos sus Distritos (con cascada). */
export async function eliminarAsociacionCascada(
  db: Firestore,
  asociacionId: string
): Promise<void> {
  // Eliminar distritos de esta asociación
  const distritosSnap = await db
    .collection("distritos")
    .where("asociacionId", "==", asociacionId)
    .get();
  for (const doc of distritosSnap.docs) {
    await eliminarDistritoCascada(db, doc.id);
  }

  // Eliminar iglesias directamente asociadas (por si hay iglesias sin distrito)
  const iglesiasSnap = await db
    .collection("iglesias")
    .where("asociacionId", "==", asociacionId)
    .get();
  for (const doc of iglesiasSnap.docs) {
    await eliminarIglesiaCascada(db, doc.id);
  }

  // Eliminar la asociación
  await db.collection("asociaciones").doc(asociacionId).delete();
}

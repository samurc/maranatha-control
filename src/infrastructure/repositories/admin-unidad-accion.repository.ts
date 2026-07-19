/**
 * Repositorio de UnidadAccion usando firebase-admin SDK (para Server Components).
 */
import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { UnidadAccion } from "../../domain/entities/unidad-accion.entity";
import type { UnidadAccionRepositoryPort } from "../../application/ports/unidad-accion.repository.port";

const COLECCION = "unidades_accion";

function aEntidad(id: string, data: FirebaseFirestore.DocumentData): UnidadAccion {
  return {
    id,
    iglesiaId: data.iglesiaId,
    nombre: data.nombre,
    maestroUid: data.maestroUid,
    estado: data.estado,
    creadoEn: data.creadoEn?.toDate() ?? new Date(),
  };
}

export class AdminUnidadAccionRepository implements UnidadAccionRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<UnidadAccion | null> {
    const snap = await this.db.collection(COLECCION).doc(id).get();
    if (!snap.exists) return null;
    return aEntidad(snap.id, snap.data()!);
  }

  async save(unidad: UnidadAccion): Promise<UnidadAccion> {
    await this.db.collection(COLECCION).doc(unidad.id).set({
      iglesiaId: unidad.iglesiaId,
      nombre: unidad.nombre,
      maestroUid: unidad.maestroUid,
      estado: unidad.estado,
      creadoEn: unidad.creadoEn,
    });
    return unidad;
  }

  async listByIglesia(iglesiaId: string): Promise<readonly UnidadAccion[]> {
    const snap = await this.db
      .collection(COLECCION)
      .where("iglesiaId", "==", iglesiaId)
      .get();
    return snap.docs.map((d) => aEntidad(d.id, d.data()));
  }

  async listByMaestro(maestroUid: string): Promise<readonly UnidadAccion[]> {
    const snap = await this.db
      .collection(COLECCION)
      .where("maestroUid", "==", maestroUid)
      .get();
    return snap.docs.map((d) => aEntidad(d.id, d.data()));
  }
}

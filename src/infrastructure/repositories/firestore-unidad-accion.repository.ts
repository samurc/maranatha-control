/**
 * `FirestoreUnidadAccionRepository` (Requerimiento 19.2, tarea 26.2).
 */

import {
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import type { UnidadAccion } from "../../domain/entities/unidad-accion.entity";
import type { UnidadAccionRepositoryPort } from "../../application/ports/unidad-accion.repository.port";

const COLECCION = "unidades_accion";

interface UnidadAccionDocumento {
  readonly iglesiaId: string;
  readonly nombre: string;
  readonly maestroUid: string;
  readonly estado: "activa" | "inactiva";
  readonly creadoEn: Timestamp;
}

function aDocumento(unidad: UnidadAccion): UnidadAccionDocumento {
  return {
    iglesiaId: unidad.iglesiaId,
    nombre: unidad.nombre,
    maestroUid: unidad.maestroUid,
    estado: unidad.estado,
    creadoEn: Timestamp.fromDate(unidad.creadoEn),
  };
}

function aEntidad(id: string, data: UnidadAccionDocumento): UnidadAccion {
  return {
    id,
    iglesiaId: data.iglesiaId,
    nombre: data.nombre,
    maestroUid: data.maestroUid,
    estado: data.estado,
    creadoEn: data.creadoEn.toDate(),
  };
}

export class FirestoreUnidadAccionRepository
  implements UnidadAccionRepositoryPort
{
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<UnidadAccion | null> {
    const snapshot = await getDoc(doc(this.db, COLECCION, id));
    if (!snapshot.exists()) {
      return null;
    }
    return aEntidad(snapshot.id, snapshot.data() as UnidadAccionDocumento);
  }

  async save(unidad: UnidadAccion): Promise<UnidadAccion> {
    await setDoc(doc(this.db, COLECCION, unidad.id), aDocumento(unidad));
    return unidad;
  }

  async listByIglesia(iglesiaId: string): Promise<readonly UnidadAccion[]> {
    const snapshot = await getDocs(
      query(collection(this.db, COLECCION), where("iglesiaId", "==", iglesiaId))
    );
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as UnidadAccionDocumento));
  }

  async listByMaestro(maestroUid: string): Promise<readonly UnidadAccion[]> {
    const snapshot = await getDocs(
      query(collection(this.db, COLECCION), where("maestroUid", "==", maestroUid))
    );
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as UnidadAccionDocumento));
  }
}

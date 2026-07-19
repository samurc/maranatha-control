/**
 * `FirestoreDistritoRepository` (Requerimiento 19.2, tarea 26.1).
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
import type { Distrito } from "../../domain/entities/distrito.entity";
import type { DistritoRepositoryPort } from "../../application/ports/distrito.repository.port";

const COLECCION = "distritos";

interface DistritoDocumento {
  readonly nombre: string;
  readonly asociacionId: string;
  readonly supervisorUid?: string;
  readonly creadoEn: Timestamp;
}

function aDocumento(distrito: Distrito): DistritoDocumento {
  return {
    nombre: distrito.nombre,
    asociacionId: distrito.asociacionId,
    supervisorUid: distrito.supervisorUid,
    creadoEn: Timestamp.fromDate(distrito.creadoEn),
  };
}

function aEntidad(id: string, data: DistritoDocumento): Distrito {
  return {
    id,
    nombre: data.nombre,
    asociacionId: data.asociacionId,
    supervisorUid: data.supervisorUid,
    creadoEn: data.creadoEn.toDate(),
  };
}

export class FirestoreDistritoRepository implements DistritoRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Distrito | null> {
    const snapshot = await getDoc(doc(this.db, COLECCION, id));
    if (!snapshot.exists()) {
      return null;
    }
    return aEntidad(snapshot.id, snapshot.data() as DistritoDocumento);
  }

  async save(distrito: Distrito): Promise<Distrito> {
    await setDoc(doc(this.db, COLECCION, distrito.id), aDocumento(distrito));
    return distrito;
  }

  async listByAsociacion(asociacionId: string): Promise<readonly Distrito[]> {
    const snapshot = await getDocs(
      query(collection(this.db, COLECCION), where("asociacionId", "==", asociacionId))
    );
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as DistritoDocumento));
  }
}

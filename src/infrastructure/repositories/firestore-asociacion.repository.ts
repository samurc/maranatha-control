/**
 * `FirestoreAsociacionRepository` (Requerimiento 19.2, tarea 26.1).
 *
 * Implementación concreta de `AsociacionRepositoryPort` sobre Firestore
 * (SDK cliente modular, `firebase/firestore`). Encapsula el mapeo
 * documento ↔ entidad de dominio: convierte `Timestamp` de Firestore a
 * `Date` de dominio (`creadoEn`) y viceversa, para que `application/` y
 * `domain/` sigan siendo Firebase-agnósticos (Requirement 19.1).
 */

import {
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import type { Asociacion } from "../../domain/entities/asociacion.entity";
import type { AsociacionRepositoryPort } from "../../application/ports/asociacion.repository.port";

const COLECCION = "asociaciones";

interface AsociacionDocumento {
  readonly nombre: string;
  readonly paisCodigo: string;
  readonly creadoEn: Timestamp;
}

function aDocumento(asociacion: Asociacion): AsociacionDocumento {
  return {
    nombre: asociacion.nombre,
    paisCodigo: asociacion.paisCodigo,
    creadoEn: Timestamp.fromDate(asociacion.creadoEn),
  };
}

function aEntidad(id: string, data: AsociacionDocumento): Asociacion {
  return {
    id,
    nombre: data.nombre,
    paisCodigo: data.paisCodigo,
    creadoEn: data.creadoEn.toDate(),
  };
}

export class FirestoreAsociacionRepository implements AsociacionRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Asociacion | null> {
    const snapshot = await getDoc(doc(this.db, COLECCION, id));
    if (!snapshot.exists()) {
      return null;
    }
    return aEntidad(snapshot.id, snapshot.data() as AsociacionDocumento);
  }

  async save(asociacion: Asociacion): Promise<Asociacion> {
    await setDoc(doc(this.db, COLECCION, asociacion.id), aDocumento(asociacion));
    return asociacion;
  }

  async list(): Promise<readonly Asociacion[]> {
    const snapshot = await getDocs(collection(this.db, COLECCION));
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as AsociacionDocumento));
  }
}

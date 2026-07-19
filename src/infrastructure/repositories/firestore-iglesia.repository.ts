/**
 * `FirestoreIglesiaRepository` (Requerimiento 19.2, tarea 26.1).
 *
 * `id_oficial` funciona como `iglesia_id` (design.md, Modelo de datos):
 * el ID del documento es directamente `idOficial`, por lo que
 * `findByIdOficial` es equivalente a `findById` (se implementa como tal
 * para no depender de una consulta indexada adicional).
 */

import {
  type Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import type { Iglesia } from "../../domain/entities/iglesia.entity";
import type { IglesiaRepositoryPort } from "../../application/ports/iglesia.repository.port";

const COLECCION = "iglesias";

interface IglesiaDocumento {
  readonly idOficial: string;
  readonly nombre: string;
  readonly asociacionId: string;
  readonly distritoId: string;
  readonly paisCodigo: string;
  readonly timezone?: string;
  readonly fechaAlta: Timestamp;
  readonly creadoEn: Timestamp;
}

function aDocumento(iglesia: Iglesia): IglesiaDocumento {
  return {
    idOficial: iglesia.idOficial,
    nombre: iglesia.nombre,
    asociacionId: iglesia.asociacionId,
    distritoId: iglesia.distritoId,
    paisCodigo: iglesia.paisCodigo,
    timezone: iglesia.timezone,
    fechaAlta: Timestamp.fromDate(iglesia.fechaAlta),
    creadoEn: Timestamp.fromDate(iglesia.creadoEn),
  };
}

function aEntidad(id: string, data: IglesiaDocumento): Iglesia {
  return {
    id,
    idOficial: data.idOficial,
    nombre: data.nombre,
    asociacionId: data.asociacionId,
    distritoId: data.distritoId,
    paisCodigo: data.paisCodigo,
    timezone: data.timezone,
    fechaAlta: data.fechaAlta.toDate(),
    creadoEn: data.creadoEn.toDate(),
  };
}

export class FirestoreIglesiaRepository implements IglesiaRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Iglesia | null> {
    const snapshot = await getDoc(doc(this.db, COLECCION, id));
    if (!snapshot.exists()) {
      return null;
    }
    return aEntidad(snapshot.id, snapshot.data() as IglesiaDocumento);
  }

  async findByIdOficial(idOficial: string): Promise<Iglesia | null> {
    return this.findById(idOficial);
  }

  async save(iglesia: Iglesia): Promise<Iglesia> {
    await setDoc(doc(this.db, COLECCION, iglesia.id), aDocumento(iglesia));
    return iglesia;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLECCION, id));
  }

  async listByAsociacion(asociacionId: string): Promise<readonly Iglesia[]> {
    const snapshot = await getDocs(
      query(collection(this.db, COLECCION), where("asociacionId", "==", asociacionId))
    );
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as IglesiaDocumento));
  }

  async listByDistrito(distritoId: string): Promise<readonly Iglesia[]> {
    const snapshot = await getDocs(
      query(collection(this.db, COLECCION), where("distritoId", "==", distritoId))
    );
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as IglesiaDocumento));
  }

  async list(): Promise<readonly Iglesia[]> {
    const snapshot = await getDocs(collection(this.db, COLECCION));
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as IglesiaDocumento));
  }
}

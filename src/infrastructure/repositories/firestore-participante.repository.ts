/**
 * `FirestoreParticipanteRepository` (Requerimiento 19.2, tarea 26.2).
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
import type { CodigoEnlace, Participante } from "../../domain/entities/participante.entity";
import type { ParticipanteRepositoryPort } from "../../application/ports/participante.repository.port";

const COLECCION = "participantes";

interface CodigoEnlaceDocumento {
  readonly codigo: string;
  readonly usado: boolean;
  readonly emitidoPor: string;
  readonly emitidoEn: Timestamp;
}

interface ParticipanteDocumento {
  readonly iglesiaId: string;
  readonly unidadId: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly esVisita: boolean;
  readonly esMenorEdad?: boolean;
  readonly estado: "activo" | "inactivo";
  readonly userUid?: string;
  readonly codigoEnlace?: CodigoEnlaceDocumento;
  readonly creadoEn: Timestamp;
}

function codigoEnlaceADocumento(
  codigoEnlace: CodigoEnlace | undefined
): CodigoEnlaceDocumento | undefined {
  if (codigoEnlace === undefined) {
    return undefined;
  }
  return {
    codigo: codigoEnlace.codigo,
    usado: codigoEnlace.usado,
    emitidoPor: codigoEnlace.emitidoPor,
    emitidoEn: Timestamp.fromDate(codigoEnlace.emitidoEn),
  };
}

function codigoEnlaceAEntidad(
  data: CodigoEnlaceDocumento | undefined
): CodigoEnlace | undefined {
  if (data === undefined) {
    return undefined;
  }
  return {
    codigo: data.codigo,
    usado: data.usado,
    emitidoPor: data.emitidoPor,
    emitidoEn: data.emitidoEn.toDate(),
  };
}

function aDocumento(participante: Participante): ParticipanteDocumento {
  return {
    iglesiaId: participante.iglesiaId,
    unidadId: participante.unidadId,
    nombre: participante.nombre,
    apellido: participante.apellido,
    esVisita: participante.esVisita,
    esMenorEdad: participante.esMenorEdad,
    estado: participante.estado,
    userUid: participante.userUid,
    codigoEnlace: codigoEnlaceADocumento(participante.codigoEnlace),
    creadoEn: Timestamp.fromDate(participante.creadoEn),
  };
}

function aEntidad(id: string, data: ParticipanteDocumento): Participante {
  return {
    id,
    iglesiaId: data.iglesiaId,
    unidadId: data.unidadId,
    nombre: data.nombre,
    apellido: data.apellido,
    esVisita: data.esVisita,
    esMenorEdad: data.esMenorEdad,
    estado: data.estado,
    userUid: data.userUid,
    codigoEnlace: codigoEnlaceAEntidad(data.codigoEnlace),
    creadoEn: data.creadoEn.toDate(),
  };
}

export class FirestoreParticipanteRepository
  implements ParticipanteRepositoryPort
{
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Participante | null> {
    const snapshot = await getDoc(doc(this.db, COLECCION, id));
    if (!snapshot.exists()) {
      return null;
    }
    return aEntidad(snapshot.id, snapshot.data() as ParticipanteDocumento);
  }

  async findByUserUid(userUid: string): Promise<Participante | null> {
    const snapshot = await getDocs(
      query(collection(this.db, COLECCION), where("userUid", "==", userUid))
    );
    const primero = snapshot.docs[0];
    return primero === undefined
      ? null
      : aEntidad(primero.id, primero.data() as ParticipanteDocumento);
  }

  async findByCodigoEnlace(codigo: string): Promise<Participante | null> {
    const snapshot = await getDocs(
      query(
        collection(this.db, COLECCION),
        where("codigoEnlace.codigo", "==", codigo)
      )
    );
    const primero = snapshot.docs[0];
    return primero === undefined
      ? null
      : aEntidad(primero.id, primero.data() as ParticipanteDocumento);
  }

  async save(participante: Participante): Promise<Participante> {
    await setDoc(
      doc(this.db, COLECCION, participante.id),
      aDocumento(participante)
    );
    return participante;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLECCION, id));
  }

  async listByUnidad(unidadId: string): Promise<readonly Participante[]> {
    const snapshot = await getDocs(
      query(collection(this.db, COLECCION), where("unidadId", "==", unidadId))
    );
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as ParticipanteDocumento));
  }

  async listByIglesia(iglesiaId: string): Promise<readonly Participante[]> {
    const snapshot = await getDocs(
      query(collection(this.db, COLECCION), where("iglesiaId", "==", iglesiaId))
    );
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as ParticipanteDocumento));
  }
}

/**
 * Repositorio de Participante usando firebase-admin SDK (para Server Components).
 */
import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { Participante } from "../../domain/entities/participante.entity";
import type { ParticipanteRepositoryPort } from "../../application/ports/participante.repository.port";

const COLECCION = "participantes";

function aEntidad(id: string, data: FirebaseFirestore.DocumentData): Participante {
  return {
    id,
    iglesiaId: data.iglesiaId,
    unidadId: data.unidadId,
    nombre: data.nombre,
    apellido: data.apellido,
    esVisita: data.esVisita ?? false,
    esMenorEdad: data.esMenorEdad,
    estado: data.estado,
    userUid: data.userUid,
    codigoEnlace: data.codigoEnlace
      ? {
          codigo: data.codigoEnlace.codigo,
          usado: data.codigoEnlace.usado,
          emitidoPor: data.codigoEnlace.emitidoPor,
          emitidoEn: data.codigoEnlace.emitidoEn?.toDate() ?? new Date(),
        }
      : undefined,
    creadoEn: data.creadoEn?.toDate() ?? new Date(),
  };
}

export class AdminParticipanteRepository implements ParticipanteRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Participante | null> {
    const snap = await this.db.collection(COLECCION).doc(id).get();
    if (!snap.exists) return null;
    return aEntidad(snap.id, snap.data()!);
  }

  async findByUserUid(userUid: string): Promise<Participante | null> {
    const snap = await this.db
      .collection(COLECCION)
      .where("userUid", "==", userUid)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return aEntidad(doc.id, doc.data());
  }

  async findByCodigoEnlace(codigo: string): Promise<Participante | null> {
    const snap = await this.db
      .collection(COLECCION)
      .where("codigoEnlace.codigo", "==", codigo)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return aEntidad(doc.id, doc.data());
  }

  async save(participante: Participante): Promise<Participante> {
    await this.db.collection(COLECCION).doc(participante.id).set({
      iglesiaId: participante.iglesiaId,
      unidadId: participante.unidadId,
      nombre: participante.nombre,
      apellido: participante.apellido,
      esVisita: participante.esVisita,
      esMenorEdad: participante.esMenorEdad,
      estado: participante.estado,
      userUid: participante.userUid,
      codigoEnlace: participante.codigoEnlace,
      creadoEn: participante.creadoEn,
    });
    return participante;
  }

  async delete(id: string): Promise<void> {
    await this.db.collection(COLECCION).doc(id).delete();
  }

  async listByUnidad(unidadId: string): Promise<readonly Participante[]> {
    const snap = await this.db
      .collection(COLECCION)
      .where("unidadId", "==", unidadId)
      .get();
    return snap.docs.map((d) => aEntidad(d.id, d.data()));
  }

  async listByIglesia(iglesiaId: string): Promise<readonly Participante[]> {
    const snap = await this.db
      .collection(COLECCION)
      .where("iglesiaId", "==", iglesiaId)
      .get();
    return snap.docs.map((d) => aEntidad(d.id, d.data()));
  }
}

/**
 * Repositorio de Iglesia usando firebase-admin SDK (para Server Components).
 */
import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { Iglesia } from "../../domain/entities/iglesia.entity";
import type { IglesiaRepositoryPort } from "../../application/ports/iglesia.repository.port";

const COLECCION = "iglesias";

function aEntidad(id: string, data: FirebaseFirestore.DocumentData): Iglesia {
  return {
    id,
    idOficial: data.idOficial,
    nombre: data.nombre,
    asociacionId: data.asociacionId,
    distritoId: data.distritoId,
    paisCodigo: data.paisCodigo,
    timezone: data.timezone,
    fechaAlta: data.fechaAlta?.toDate() ?? new Date(),
    creadoEn: data.creadoEn?.toDate() ?? new Date(),
  };
}

export class AdminIglesiaRepository implements IglesiaRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Iglesia | null> {
    const snap = await this.db.collection(COLECCION).doc(id).get();
    if (!snap.exists) return null;
    return aEntidad(snap.id, snap.data()!);
  }

  async findByIdOficial(idOficial: string): Promise<Iglesia | null> {
    return this.findById(idOficial);
  }

  async save(iglesia: Iglesia): Promise<Iglesia> {
    await this.db.collection(COLECCION).doc(iglesia.id).set({
      idOficial: iglesia.idOficial,
      nombre: iglesia.nombre,
      asociacionId: iglesia.asociacionId,
      distritoId: iglesia.distritoId,
      paisCodigo: iglesia.paisCodigo,
      timezone: iglesia.timezone,
      fechaAlta: iglesia.fechaAlta,
      creadoEn: iglesia.creadoEn,
    });
    return iglesia;
  }

  async delete(id: string): Promise<void> {
    await this.db.collection(COLECCION).doc(id).delete();
  }

  async listByAsociacion(asociacionId: string): Promise<readonly Iglesia[]> {
    const snap = await this.db
      .collection(COLECCION)
      .where("asociacionId", "==", asociacionId)
      .get();
    return snap.docs.map((d) => aEntidad(d.id, d.data()));
  }

  async listByDistrito(distritoId: string): Promise<readonly Iglesia[]> {
    const snap = await this.db
      .collection(COLECCION)
      .where("distritoId", "==", distritoId)
      .get();
    return snap.docs.map((d) => aEntidad(d.id, d.data()));
  }

  async list(): Promise<readonly Iglesia[]> {
    const snap = await this.db.collection(COLECCION).get();
    return snap.docs.map((d) => aEntidad(d.id, d.data()));
  }
}

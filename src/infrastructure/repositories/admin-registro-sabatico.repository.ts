/**
 * Repositorio de RegistroSabatico usando firebase-admin SDK (para Server Components).
 */
import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type {
  AsistenciaParticipante,
  RegistroSabatico,
} from "../../domain/entities/registro-sabatico.entity";
import type { RegistroSabaticoRepositoryPort } from "../../application/ports/registro-sabatico.repository.port";

const COLECCION = "registros_sabaticos";

function asistenciaAEntidad(data: Record<string, unknown>): AsistenciaParticipante {
  const seguimiento = Array.isArray(data.seguimientoPastoral)
    ? data.seguimientoPastoral.map((s: Record<string, unknown>) => ({
        accion: s.accion as AsistenciaParticipante["seguimientoPastoral"][number]["accion"],
        registradoPor: s.registradoPor as string,
        registradoEn: (s.registradoEn as { toDate?: () => Date } | null)?.toDate?.() ?? new Date(),
      }))
    : [];

  return {
    presente: data.presente as boolean,
    diasEstudio: data.diasEstudio as number,
    autorregistrado: data.autorregistrado as boolean,
    codigoVisual: data.codigoVisual as string,
    seguimientoPastoral: seguimiento,
  };
}

function aEntidad(id: string, data: FirebaseFirestore.DocumentData): RegistroSabatico {
  const asistenciaRaw = (data.asistencia ?? {}) as Record<string, Record<string, unknown>>;
  const asistencia: Record<string, AsistenciaParticipante> = {};
  for (const [pid, entry] of Object.entries(asistenciaRaw)) {
    asistencia[pid] = asistenciaAEntidad(entry);
  }

  return {
    id,
    iglesiaId: data.iglesiaId,
    unidadId: data.unidadId,
    sabadoEclesiastico: data.sabadoEclesiastico,
    estado: data.estado,
    asistencia,
    totalesRapidos: data.totalesRapidos ?? { presentes: 0, ausentes: 0, visitas: 0 },
    cerradoPor: data.cerradoPor,
    fechaCierre: data.fechaCierre?.toDate(),
    creadoEn: data.creadoEn?.toDate() ?? new Date(),
    actualizadoEn: data.actualizadoEn?.toDate() ?? new Date(),
  };
}

export class AdminRegistroSabaticoRepository implements RegistroSabaticoRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<RegistroSabatico | null> {
    const snap = await this.db.collection(COLECCION).doc(id).get();
    if (!snap.exists) return null;
    return aEntidad(snap.id, snap.data()!);
  }

  async save(registro: RegistroSabatico): Promise<RegistroSabatico> {
    const asistencia: Record<string, unknown> = {};
    for (const [pid, entry] of Object.entries(registro.asistencia)) {
      asistencia[pid] = {
        presente: entry.presente,
        diasEstudio: entry.diasEstudio,
        autorregistrado: entry.autorregistrado,
        codigoVisual: entry.codigoVisual,
        seguimientoPastoral: entry.seguimientoPastoral.map((s) => ({
          accion: s.accion,
          registradoPor: s.registradoPor,
          registradoEn: s.registradoEn,
        })),
      };
    }

    await this.db.collection(COLECCION).doc(registro.id).set({
      iglesiaId: registro.iglesiaId,
      unidadId: registro.unidadId,
      sabadoEclesiastico: registro.sabadoEclesiastico,
      estado: registro.estado,
      asistencia,
      totalesRapidos: registro.totalesRapidos,
      cerradoPor: registro.cerradoPor,
      fechaCierre: registro.fechaCierre,
      creadoEn: registro.creadoEn,
      actualizadoEn: registro.actualizadoEn,
    });
    return registro;
  }

  async delete(id: string): Promise<void> {
    await this.db.collection(COLECCION).doc(id).delete();
  }

  async listByUnidad(unidadId: string): Promise<readonly RegistroSabatico[]> {
    const snap = await this.db
      .collection(COLECCION)
      .where("unidadId", "==", unidadId)
      .get();
    return snap.docs.map((d) => aEntidad(d.id, d.data()));
  }

  async listByIglesia(iglesiaId: string): Promise<readonly RegistroSabatico[]> {
    const snap = await this.db
      .collection(COLECCION)
      .where("iglesiaId", "==", iglesiaId)
      .get();
    return snap.docs.map((d) => aEntidad(d.id, d.data()));
  }
}

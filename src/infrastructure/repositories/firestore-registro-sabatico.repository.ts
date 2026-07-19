/**
 * `FirestoreRegistroSabaticoRepository` (Requerimiento 7.1, 14.4, 19.2,
 * tarea 26.3).
 *
 * `save()` ejecuta una única `setDoc` transaccional sobre el documento
 * agregado completo `/registros_sabaticos/{id}`, usando el ID
 * determinístico `{iglesia_id}_{unidad_id}_{anio}_T{trimestre}_S{sabado}`
 * ya resuelto por el caso de uso invocante como ID del documento. `setDoc`
 * (sin `{ merge: true }`) sobrescribe el documento completo con el estado
 * ya recalculado en memoria por el dominio/aplicación (asistencia,
 * totalesRapidos, codigoVisual...), por lo que "crear si no existe,
 * actualizar si existe" es, en efecto, un único `upsert` idempotente por
 * invocación — exactamente una escritura, nunca una escritura por
 * Participante (design.md, "Decisiones clave").
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
import type {
  AsistenciaParticipante,
  RegistroSabatico,
  SeguimientoPastoral,
} from "../../domain/entities/registro-sabatico.entity";
import type { RegistroSabaticoRepositoryPort } from "../../application/ports/registro-sabatico.repository.port";

const COLECCION = "registros_sabaticos";

interface SeguimientoPastoralDocumento {
  readonly accion: SeguimientoPastoral["accion"];
  readonly registradoPor: string;
  readonly registradoEn: Timestamp;
}

interface AsistenciaParticipanteDocumento {
  readonly presente: boolean;
  readonly diasEstudio: number;
  readonly autorregistrado: boolean;
  readonly codigoVisual: string;
  readonly seguimientoPastoral: readonly SeguimientoPastoralDocumento[];
}

interface RegistroSabaticoDocumento {
  readonly iglesiaId: string;
  readonly unidadId: string;
  readonly sabadoEclesiastico: {
    readonly anio: number;
    readonly numeroTrimestre: 1 | 2 | 3 | 4;
    readonly numeroSabado: number;
    readonly fechaISO: string;
    readonly timezone: string;
  };
  readonly estado: "borrador" | "cerrado";
  readonly asistencia: Readonly<Record<string, AsistenciaParticipanteDocumento>>;
  readonly totalesRapidos: {
    readonly presentes: number;
    readonly ausentes: number;
    readonly visitas: number;
  };
  readonly cerradoPor?: string;
  readonly fechaCierre?: Timestamp;
  readonly creadoEn: Timestamp;
  readonly actualizadoEn: Timestamp;
}

function asistenciaADocumento(
  asistencia: AsistenciaParticipante
): AsistenciaParticipanteDocumento {
  return {
    presente: asistencia.presente,
    diasEstudio: asistencia.diasEstudio,
    autorregistrado: asistencia.autorregistrado,
    codigoVisual: asistencia.codigoVisual,
    seguimientoPastoral: asistencia.seguimientoPastoral.map((s) => ({
      accion: s.accion,
      registradoPor: s.registradoPor,
      registradoEn: Timestamp.fromDate(s.registradoEn),
    })),
  };
}

function asistenciaAEntidad(
  data: AsistenciaParticipanteDocumento
): AsistenciaParticipante {
  return {
    presente: data.presente,
    diasEstudio: data.diasEstudio,
    autorregistrado: data.autorregistrado,
    codigoVisual: data.codigoVisual,
    seguimientoPastoral: data.seguimientoPastoral.map((s) => ({
      accion: s.accion,
      registradoPor: s.registradoPor,
      registradoEn: s.registradoEn.toDate(),
    })),
  };
}

function aDocumento(registro: RegistroSabatico): RegistroSabaticoDocumento {
  const asistencia: Record<string, AsistenciaParticipanteDocumento> = {};
  for (const [participanteId, entrada] of Object.entries(registro.asistencia)) {
    asistencia[participanteId] = asistenciaADocumento(entrada);
  }
  return {
    iglesiaId: registro.iglesiaId,
    unidadId: registro.unidadId,
    sabadoEclesiastico: registro.sabadoEclesiastico,
    estado: registro.estado,
    asistencia,
    totalesRapidos: registro.totalesRapidos,
    cerradoPor: registro.cerradoPor,
    fechaCierre:
      registro.fechaCierre === undefined
        ? undefined
        : Timestamp.fromDate(registro.fechaCierre),
    creadoEn: Timestamp.fromDate(registro.creadoEn),
    actualizadoEn: Timestamp.fromDate(registro.actualizadoEn),
  };
}

function aEntidad(id: string, data: RegistroSabaticoDocumento): RegistroSabatico {
  const asistencia: Record<string, AsistenciaParticipante> = {};
  for (const [participanteId, entrada] of Object.entries(data.asistencia)) {
    asistencia[participanteId] = asistenciaAEntidad(entrada);
  }
  return {
    id,
    iglesiaId: data.iglesiaId,
    unidadId: data.unidadId,
    sabadoEclesiastico: data.sabadoEclesiastico,
    estado: data.estado,
    asistencia,
    totalesRapidos: data.totalesRapidos,
    cerradoPor: data.cerradoPor,
    fechaCierre: data.fechaCierre?.toDate(),
    creadoEn: data.creadoEn.toDate(),
    actualizadoEn: data.actualizadoEn.toDate(),
  };
}

export class FirestoreRegistroSabaticoRepository
  implements RegistroSabaticoRepositoryPort
{
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<RegistroSabatico | null> {
    const snapshot = await getDoc(doc(this.db, COLECCION, id));
    if (!snapshot.exists()) {
      return null;
    }
    return aEntidad(snapshot.id, snapshot.data() as RegistroSabaticoDocumento);
  }

  /**
   * Única `setDoc` transaccional por invocación (Requirement 7.1, 14.4):
   * `upsert` idempotente por el ID determinístico ya resuelto en
   * `registro.id`.
   */
  async save(registro: RegistroSabatico): Promise<RegistroSabatico> {
    await setDoc(doc(this.db, COLECCION, registro.id), aDocumento(registro));
    return registro;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.db, COLECCION, id));
  }

  async listByUnidad(unidadId: string): Promise<readonly RegistroSabatico[]> {
    const snapshot = await getDocs(
      query(collection(this.db, COLECCION), where("unidadId", "==", unidadId))
    );
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as RegistroSabaticoDocumento));
  }

  async listByIglesia(
    iglesiaId: string
  ): Promise<readonly RegistroSabatico[]> {
    const snapshot = await getDocs(
      query(collection(this.db, COLECCION), where("iglesiaId", "==", iglesiaId))
    );
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as RegistroSabaticoDocumento));
  }
}

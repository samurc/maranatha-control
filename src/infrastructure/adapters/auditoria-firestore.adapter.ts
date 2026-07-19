/**
 * `AuditoriaFirestoreAdapter` (Requerimiento 13.1, 13.2, 19.2, tarea 29.1).
 *
 * Escribe en `/auditoria/{evento_id}` con `addDoc` (ID autogenerado por
 * Firestore); no expone ningún método de actualización/eliminación
 * (Requirement 13.2: inmutabilidad de la capa de Aplicación). La
 * inmutabilidad se refuerza además a nivel de reglas de seguridad de
 * Firestore (`firestore.rules`, tarea 30.1), que prohíben `update`/
 * `delete` sobre `/auditoria/{evento_id}` para cualquier rol distinto de
 * `admin_global` — una segunda línea de defensa independiente de este
 * adaptador, para que un bug de la capa de Aplicación no pueda violar la
 * inmutabilidad exigida por el Requerimiento 13.2.
 */

import {
  type Firestore,
  addDoc,
  collection,
  getDocs,
  query,
  Timestamp,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import type { AuditoriaEvento } from "../../domain/entities/auditoria-evento.entity";
import type {
  AuditoriaRepositoryPort,
  FiltroAuditoria,
  RegistrarEventoAuditoriaInput,
} from "../../application/ports/auditoria.repository.port";
import type { ClockPort } from "../../application/ports/clock.port";

const COLECCION = "auditoria";

interface AuditoriaDocumento {
  readonly uid: string;
  readonly accion: string;
  readonly recursoAfectado: string;
  readonly iglesiaId?: string;
  readonly timestamp: Timestamp;
}

function aEntidad(id: string, data: AuditoriaDocumento): AuditoriaEvento {
  return {
    id,
    uid: data.uid,
    accion: data.accion,
    recursoAfectado: data.recursoAfectado,
    iglesiaId: data.iglesiaId,
    timestamp: data.timestamp.toDate(),
  };
}

export class AuditoriaFirestoreAdapter implements AuditoriaRepositoryPort {
  constructor(
    private readonly db: Firestore,
    private readonly clock: ClockPort
  ) {}

  async registrar(
    evento: RegistrarEventoAuditoriaInput
  ): Promise<AuditoriaEvento> {
    const documento: AuditoriaDocumento = {
      uid: evento.uid,
      accion: evento.accion,
      recursoAfectado: evento.recursoAfectado,
      iglesiaId: evento.iglesiaId,
      timestamp: Timestamp.fromDate(this.clock.now()),
    };
    const ref = await addDoc(collection(this.db, COLECCION), documento);
    return aEntidad(ref.id, documento);
  }

  async listar(filtro: FiltroAuditoria): Promise<readonly AuditoriaEvento[]> {
    const restricciones: QueryConstraint[] = [];
    if (filtro.iglesiaId !== undefined) {
      restricciones.push(where("iglesiaId", "==", filtro.iglesiaId));
    }
    if (filtro.uid !== undefined) {
      restricciones.push(where("uid", "==", filtro.uid));
    }
    if (filtro.desde !== undefined) {
      restricciones.push(where("timestamp", ">=", Timestamp.fromDate(filtro.desde)));
    }
    if (filtro.hasta !== undefined) {
      restricciones.push(where("timestamp", "<=", Timestamp.fromDate(filtro.hasta)));
    }
    const snapshot = await getDocs(
      query(collection(this.db, COLECCION), ...restricciones)
    );
    return snapshot.docs.map((d) => aEntidad(d.id, d.data() as AuditoriaDocumento));
  }
}

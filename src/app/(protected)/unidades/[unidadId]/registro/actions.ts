/**
 * Server Function (`"use server"`) que ejecuta
 * `registrar-asistencia.use-case.ts` para
 * `(protected)/unidades/[unidadId]/registro/page.tsx` (Requerimiento
 * 14.4, 23.1, 23.2, tarea 43.4).
 *
 * `InterfazGrillaAsistencia` (Client Component) recibe esta función como
 * su prop `onGuardar`; Next.js serializa la invocación cliente→servidor
 * automáticamente (design.md, "Guardado: ... envía como un solo DTO
 * consolidado"). Los Custom_Claims del actor se resuelven de nuevo aquí a
 * partir de la Cookie_Sesion (`obtenerClaimsDeSesion()`), nunca confiando
 * en ningún valor de identidad que el cliente pudiera intentar enviar
 * directamente en el DTO.
 */
"use server";

import { obtenerClaimsDeSesion } from "../../../../../presentation/session";
import { crearRegistrarAsistenciaUseCase } from "../../../../../application/use-cases/registro-sabatico/registrar-asistencia.use-case";
import type { RegistrarAsistenciaDto } from "../../../../../application/dto/registro-sabatico.schema";
import { FirestoreIglesiaRepository } from "../../../../../infrastructure/repositories/firestore-iglesia.repository";
import { FirestoreParticipanteRepository } from "../../../../../infrastructure/repositories/firestore-participante.repository";
import { FirestoreRegistroSabaticoRepository } from "../../../../../infrastructure/repositories/firestore-registro-sabatico.repository";
import { FirestoreUnidadAccionRepository } from "../../../../../infrastructure/repositories/firestore-unidad-accion.repository";
import { AuditoriaFirestoreAdapter } from "../../../../../infrastructure/adapters/auditoria-firestore.adapter";
import { obtenerFirestoreCliente } from "../../../../../infrastructure/firestore-client";
import { SystemClockAdapter } from "../../../../../infrastructure/adapters/system-clock.adapter";

export async function registrarAsistenciaAction(
  dto: RegistrarAsistenciaDto
): Promise<void> {
  const claims = await obtenerClaimsDeSesion();
  if (claims === null) {
    throw new Error("No hay una sesión activa.");
  }

  const db = obtenerFirestoreCliente();
  const clock = new SystemClockAdapter();
  const registrarAsistencia = crearRegistrarAsistenciaUseCase({
    registros: new FirestoreRegistroSabaticoRepository(db),
    participantes: new FirestoreParticipanteRepository(db),
    unidades: new FirestoreUnidadAccionRepository(db),
    iglesias: new FirestoreIglesiaRepository(db),
    auditoria: new AuditoriaFirestoreAdapter(db, clock),
    clock,
  });

  const resultado = await registrarAsistencia(claims, dto);
  if (!resultado.ok) {
    throw new Error(resultado.error.message);
  }
}

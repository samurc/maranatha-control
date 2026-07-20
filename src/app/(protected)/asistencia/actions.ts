"use server";

import { revalidatePath } from "next/cache";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";

export async function guardarAsistencia(formData: FormData) {
  const dataJson = formData.get("data") as string;
  const indicadorJson = formData.get("indicador") as string;

  const db = obtenerFirestoreAdmin();

  // Guardar indicador individual
  if (indicadorJson) {
    const { iglesiaId, unidadId, anio, trimestre, clave, valor } = JSON.parse(indicadorJson) as {
      iglesiaId: string;
      unidadId: string;
      anio: number;
      trimestre: number;
      clave: string;
      valor: string;
    };
    const docId = `${iglesiaId}_${unidadId}_${anio}_T${trimestre}_indicadores`;
    await db.collection("indicadores_semanales").doc(docId).set(
      { [clave]: valor, iglesiaId, unidadId, anio, trimestre, actualizadoEn: new Date() },
      { merge: true }
    );
    revalidatePath("/asistencia");
    return;
  }

  // Guardar asistencia
  if (!dataJson) return;

  const payload = JSON.parse(dataJson) as {
    iglesiaId: string;
    unidadId: string;
    anio: number;
    trimestre: number;
    sabado: number;
    asistencia: Record<string, { presente: boolean; diasEstudio: number }>;
  };

  const { iglesiaId, unidadId, anio, trimestre, sabado, asistencia } = payload;
  if (!iglesiaId || !unidadId || !sabado) return;

  const registroId = `${iglesiaId}_${unidadId}_${anio}_T${trimestre}_S${sabado}`;

  // Calcular totales
  let presentes = 0;
  let ausentes = 0;
  const asistenciaCompleta: Record<string, unknown> = {};

  for (const [pid, entry] of Object.entries(asistencia)) {
    if (entry.presente) presentes++;
    else ausentes++;

    // Código visual: P + días si presente, F si faltó
    const codigoVisual = entry.presente
      ? `P${entry.diasEstudio}`
      : "F";

    asistenciaCompleta[pid] = {
      presente: entry.presente,
      diasEstudio: entry.diasEstudio,
      autorregistrado: false,
      codigoVisual,
      seguimientoPastoral: [],
    };
  }

  // Calcular fecha ISO del sábado (aproximada)
  const inicioTrimestre = new Date(anio, (trimestre - 1) * 3, 1);
  // Encontrar el primer sábado del trimestre
  while (inicioTrimestre.getDay() !== 6) {
    inicioTrimestre.setDate(inicioTrimestre.getDate() + 1);
  }
  // Avanzar al sábado correcto
  const fechaSabado = new Date(inicioTrimestre);
  fechaSabado.setDate(fechaSabado.getDate() + (sabado - 1) * 7);
  const fechaISO = fechaSabado.toISOString().split("T")[0];

  await db.collection("registros_sabaticos").doc(registroId).set({
    iglesiaId,
    unidadId,
    sabadoEclesiastico: {
      anio,
      numeroTrimestre: trimestre,
      numeroSabado: sabado,
      fechaISO,
      timezone: "America/Lima", // Se podría resolver desde la iglesia
    },
    estado: "borrador",
    asistencia: asistenciaCompleta,
    totalesRapidos: { presentes, ausentes, visitas: 0 },
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  }, { merge: true });

  revalidatePath("/asistencia");
}

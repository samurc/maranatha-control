"use server";

import { revalidatePath } from "next/cache";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { obtenerClaimsDeSesion } from "../../../presentation/session";

// ---------------------------------------------------------------------------
// Instructores bíblicos
// ---------------------------------------------------------------------------

export async function crearInstructorBiblico(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const iglesiaId = formData.get("iglesiaId") as string;
  const unidadId = formData.get("unidadId") as string;
  const miembrosJson = formData.get("miembros") as string;

  if (!nombre || !iglesiaId) return;

  const miembros: string[] = miembrosJson ? JSON.parse(miembrosJson) : [];

  const db = obtenerFirestoreAdmin();
  const slug = nombre.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const id = `${iglesiaId}_${unidadId || "sin_unidad"}_instructor_${slug}`;

  await db.collection("instructores_biblicos").doc(id).set({
    nombre,
    iglesiaId,
    unidadId: unidadId || null,
    miembros,
    creadoEn: new Date(),
  });

  revalidatePath("/estudios-biblicos");
}

export async function eliminarInstructorBiblico(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const db = obtenerFirestoreAdmin();
  await db.collection("instructores_biblicos").doc(id).delete();

  revalidatePath("/estudios-biblicos");
}

export async function actualizarMiembrosInstructor(formData: FormData) {
  const id = formData.get("id") as string;
  const miembrosJson = formData.get("miembros") as string;

  if (!id) return;

  const miembros: string[] = miembrosJson ? JSON.parse(miembrosJson) : [];
  const db = obtenerFirestoreAdmin();
  await db.collection("instructores_biblicos").doc(id).update({ miembros, actualizadoEn: new Date() });

  revalidatePath("/estudios-biblicos");
}

// ---------------------------------------------------------------------------
// Estudiantes de la Biblia
// ---------------------------------------------------------------------------

export async function crearEstudianteBiblico(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const apellido = formData.get("apellido") as string;
  const estadoCivil = formData.get("estadoCivil") as string;
  const grupoEtareo = formData.get("grupoEtareo") as string;
  const cursoBiblico = formData.get("cursoBiblico") as string;
  const instructorId = formData.get("instructorId") as string;
  const iglesiaId = formData.get("iglesiaId") as string;
  const unidadId = formData.get("unidadId") as string;

  if (!nombre || !apellido || !iglesiaId) return;

  const db = obtenerFirestoreAdmin();
  const slug = `${nombre}_${apellido}`.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const id = `${iglesiaId}_eb_${slug}`;

  await db.collection("estudiantes_biblicos").doc(id).set({
    nombre,
    apellido,
    estadoCivil: estadoCivil || null,
    grupoEtareo: grupoEtareo || null,
    cursoBiblico: cursoBiblico || null,
    instructorId: instructorId || null,
    iglesiaId,
    unidadId: unidadId || null,
    candidatoBautismo: false,
    creadoEn: new Date(),
  });

  revalidatePath("/estudios-biblicos");
}

export async function eliminarEstudianteBiblico(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const db = obtenerFirestoreAdmin();
  // Eliminar también sus avances
  const avancesSnap = await db.collection("avances_estudio_biblico")
    .where("estudianteId", "==", id)
    .get();
  const batch = db.batch();
  for (const doc of avancesSnap.docs) {
    batch.delete(doc.ref);
  }
  batch.delete(db.collection("estudiantes_biblicos").doc(id));
  await batch.commit();

  revalidatePath("/estudios-biblicos");
}

export async function editarEstudianteBiblico(formData: FormData) {
  const id = formData.get("id") as string;
  const nombre = formData.get("nombre") as string;
  const apellido = formData.get("apellido") as string;
  const estadoCivil = formData.get("estadoCivil") as string;
  const grupoEtareo = formData.get("grupoEtareo") as string;
  const cursoBiblico = formData.get("cursoBiblico") as string;
  const instructorId = formData.get("instructorId") as string;

  if (!id || !nombre || !apellido) return;

  const db = obtenerFirestoreAdmin();
  await db.collection("estudiantes_biblicos").doc(id).update({
    nombre,
    apellido,
    estadoCivil: estadoCivil || null,
    grupoEtareo: grupoEtareo || null,
    cursoBiblico: cursoBiblico || null,
    instructorId: instructorId || null,
    actualizadoEn: new Date(),
  });

  revalidatePath("/estudios-biblicos");
}

// ---------------------------------------------------------------------------
// Avance de estudio bíblico
// ---------------------------------------------------------------------------

export async function guardarAvanceEstudio(formData: FormData) {
  const estudianteId = formData.get("estudianteId") as string;
  const avanceJson = formData.get("avance") as string; // { leccion: number, completada: boolean }

  if (!estudianteId || !avanceJson) return;

  const claims = await obtenerClaimsDeSesion();
  if (!claims) return;

  const { leccion, completada } = JSON.parse(avanceJson) as { leccion: number; completada: boolean };

  const ahora = new Date();
  const trimestre = Math.ceil((ahora.getMonth() + 1) / 3);
  const anio = ahora.getFullYear();

  const db = obtenerFirestoreAdmin();
  const docId = `${estudianteId}_${anio}_T${trimestre}`;

  await db.collection("avances_estudio_biblico").doc(docId).set(
    {
      estudianteId,
      anio,
      trimestre,
      [`leccion_${leccion}`]: completada,
      actualizadoEn: new Date(),
    },
    { merge: true }
  );

  revalidatePath("/estudios-biblicos");
}

export async function marcarCandidatoBautismo(formData: FormData) {
  const id = formData.get("id") as string;
  const valor = formData.get("candidato") === "true";

  if (!id) return;

  const db = obtenerFirestoreAdmin();
  await db.collection("estudiantes_biblicos").doc(id).update({
    candidatoBautismo: valor,
    actualizadoEn: new Date(),
  });

  revalidatePath("/estudios-biblicos");
}

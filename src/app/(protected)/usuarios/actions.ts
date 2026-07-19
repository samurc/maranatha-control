"use server";

import { revalidatePath } from "next/cache";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";

function getAdminAuth() {
  const app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
  return getAuth(app);
}

export interface UserRecord {
  uid: string;
  email: string;
  displayName: string | undefined;
  disabled: boolean;
  customClaims: {
    role?: string;
    iglesiaId?: string;
    distritoId?: string;
    asociacionId?: string;
  } | null;
}

export async function listarUsuarios(): Promise<UserRecord[]> {
  const auth = getAdminAuth();
  const result = await auth.listUsers(100);
  return result.users.map((u) => ({
    uid: u.uid,
    email: u.email ?? "",
    displayName: u.displayName,
    disabled: u.disabled,
    customClaims: (u.customClaims as UserRecord["customClaims"]) ?? null,
  }));
}

export async function crearUsuario(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;
  const role = formData.get("role") as string;
  const iglesiaId = formData.get("iglesiaId") as string;
  const distritoId = formData.get("distritoId") as string;
  const asociacionId = formData.get("asociacionId") as string;
  const unidadId = formData.get("unidadId") as string;

  if (!email || !password || !role) return;

  const auth = getAdminAuth();
  const user = await auth.createUser({
    email,
    password,
    displayName: displayName || undefined,
  });

  const claims: Record<string, string> = { role };
  if (asociacionId) claims.asociacionId = asociacionId;
  if (distritoId) claims.distritoId = distritoId;
  if (iglesiaId) claims.iglesiaId = iglesiaId;
  if (unidadId) claims.unidadId = unidadId;

  await auth.setCustomUserClaims(user.uid, claims);

  // Registrar en auditoría
  const db = obtenerFirestoreAdmin();
  await db.collection("auditoria").add({
    uid: "system",
    accion: "crear_usuario",
    recursoAfectado: `usuarios/${user.uid}`,
    timestamp: new Date(),
  });

  revalidatePath("/usuarios");
}

export async function actualizarRol(formData: FormData) {
  const uid = formData.get("uid") as string;
  const role = formData.get("role") as string;
  const iglesiaId = formData.get("iglesiaId") as string;
  const distritoId = formData.get("distritoId") as string;
  const asociacionId = formData.get("asociacionId") as string;
  const unidadId = formData.get("unidadId") as string;

  if (!uid || !role) return;

  const auth = getAdminAuth();
  const claims: Record<string, string> = { role };
  if (asociacionId) claims.asociacionId = asociacionId;
  if (distritoId) claims.distritoId = distritoId;
  if (iglesiaId) claims.iglesiaId = iglesiaId;
  if (unidadId) claims.unidadId = unidadId;

  await auth.setCustomUserClaims(uid, claims);

  // Registrar en auditoría
  const db = obtenerFirestoreAdmin();
  await db.collection("auditoria").add({
    uid: "system",
    accion: "actualizar_custom_claims",
    recursoAfectado: `usuarios/${uid}`,
    timestamp: new Date(),
  });

  revalidatePath("/usuarios");
}

export async function eliminarUsuario(formData: FormData) {
  const uid = formData.get("id") as string;
  if (!uid) return;

  const auth = getAdminAuth();
  await auth.deleteUser(uid);

  // Registrar en auditoría
  const db = obtenerFirestoreAdmin();
  await db.collection("auditoria").add({
    uid: "system",
    accion: "eliminar_usuario",
    recursoAfectado: `usuarios/${uid}`,
    timestamp: new Date(),
  });

  revalidatePath("/usuarios");
}

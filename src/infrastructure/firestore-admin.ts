/**
 * `firestore-admin.ts` — Instancia singleton de Firestore vía firebase-admin.
 *
 * Usado por Server Components y Route Handlers para acceder a Firestore
 * con privilegios de administrador (bypassa reglas de seguridad). El SDK
 * cliente de Firestore NO funciona en Server Components porque no hay un
 * usuario autenticado en el contexto del servidor.
 */
import "server-only";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function obtenerApp() {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan variables de entorno FIREBASE_ADMIN_* para inicializar Firestore Admin."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

let dbCache: Firestore | null = null;

/** Retorna la instancia singleton de Firestore Admin. */
export function obtenerFirestoreAdmin(): Firestore {
  if (dbCache === null) {
    dbCache = getFirestore(obtenerApp());
  }
  return dbCache;
}

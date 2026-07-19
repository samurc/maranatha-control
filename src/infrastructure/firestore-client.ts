/**
 * `firestore-client.ts` (Requerimiento 24.1, tarea 43.2-43.4).
 *
 * Resuelve la instancia singleton de `Firestore` (SDK cliente) sobre la
 * misma `FirebaseApp` que `firebase-client.ts` (Requirement 24.1: una
 * única inicialización del SDK cliente, a partir del mismo conjunto de
 * variables `NEXT_PUBLIC_FIREBASE_*`). Consumida por las páginas de
 * Presentación (`(protected)/dashboard`, `(protected)/panel-alumno`,
 * `(protected)/unidades/[unidadId]/registro`) para construir los
 * repositorios Firestore ya implementados
 * (`FirestoreIglesiaRepository`, etc.) sin duplicar la lógica de
 * inicialización de `firebase-client.ts`.
 *
 * Igual que `firebase-client.ts`, la inicialización se difiere hasta el
 * primer acceso real (nunca al importar el módulo), para que la
 * inicialización del SDK cliente no rompa `next build` en un entorno sin
 * variables de Firebase configuradas.
 */
import { getFirestore, type Firestore } from "firebase/firestore";
import { obtenerFirebaseAppCliente } from "./firebase-client";

let dbCache: Firestore | null = null;

/** Retorna la instancia singleton de `Firestore` del SDK cliente. */
export function obtenerFirestoreCliente(): Firestore {
  dbCache ??= getFirestore(obtenerFirebaseAppCliente());
  return dbCache;
}

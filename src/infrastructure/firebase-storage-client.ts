/**
 * `firebase-storage-client.ts`
 *
 * Cliente de Firebase Storage inicializado con la App de cliente.
 */
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { obtenerFirebaseAppCliente } from "./firebase-client";

export function obtenerFirebaseStorageCliente(): FirebaseStorage {
  return getStorage(obtenerFirebaseAppCliente());
}

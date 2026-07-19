/**
 * `IndexedDbOfflineStorageAdapter` (Requerimiento 18.1, tarea 32.1).
 *
 * Implementación de `OfflineStoragePort` sobre IndexedDB del navegador
 * (design.md: "Modulo_Sincronizacion_Offline ... complementada con una
 * cola de comandos propia (`OfflineQueue`)"). Usa dos `object store`
 * separados (`pendientes`, `comandos_en_conflicto`) dentro de la misma
 * base de datos, reflejando exactamente la separación de colas descrita
 * en el diseño (Requirement 18.3: los comandos en conflicto NUNCA se
 * mezclan con los pendientes de reintento automático).
 *
 * Solo debe instanciarse en el navegador (`typeof indexedDB !==
 * "undefined"`); en Node/SSR no hay IndexedDB disponible.
 */
import type { CustomClaims } from "../../domain/value-objects/custom-claims.vo";
import type { OfflineCommand, OfflineStoragePort } from "./offline-storage.port";

const DB_NAME = "maranatha-control-offline";
const DB_VERSION = 1;
const STORE_PENDIENTES = "pendientes";
const STORE_EN_CONFLICTO = "comandos_en_conflicto";

/** Forma serializada de `OfflineCommand` en IndexedDB (`Date` -> ISO string). */
interface OfflineCommandRegistro {
  readonly id: string;
  readonly actorClaims: CustomClaims;
  readonly dto: unknown;
  readonly encoladoEnISO: string;
}

function aRegistro(comando: OfflineCommand): OfflineCommandRegistro {
  return {
    id: comando.id,
    actorClaims: comando.actorClaims,
    dto: comando.dto,
    encoladoEnISO: comando.encoladoEn.toISOString(),
  };
}

function aComando(registro: OfflineCommandRegistro): OfflineCommand {
  return {
    id: registro.id,
    actorClaims: registro.actorClaims,
    dto: registro.dto as OfflineCommand["dto"],
    encoladoEn: new Date(registro.encoladoEnISO),
  };
}

function abrirBaseDeDatos(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(DB_NAME, DB_VERSION);
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains(STORE_PENDIENTES)) {
        db.createObjectStore(STORE_PENDIENTES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_EN_CONFLICTO)) {
        db.createObjectStore(STORE_EN_CONFLICTO, { keyPath: "id" });
      }
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

function ejecutarEnTransaccion<T>(
  db: IDBDatabase,
  storeName: string,
  modo: IDBTransactionMode,
  operacion: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, modo);
    const store = tx.objectStore(storeName);
    const request = operacion(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDbOfflineStorageAdapter implements OfflineStoragePort {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db(): Promise<IDBDatabase> {
    this.dbPromise ??= abrirBaseDeDatos();
    return this.dbPromise;
  }

  async encolar(comando: OfflineCommand): Promise<void> {
    const db = await this.db();
    await ejecutarEnTransaccion(db, STORE_PENDIENTES, "readwrite", (store) =>
      store.put(aRegistro(comando))
    );
  }

  async listarPendientes(): Promise<readonly OfflineCommand[]> {
    const db = await this.db();
    const registros = await ejecutarEnTransaccion<OfflineCommandRegistro[]>(
      db,
      STORE_PENDIENTES,
      "readonly",
      (store) => store.getAll()
    );
    return registros
      .map(aComando)
      .sort((a, b) => a.encoladoEn.getTime() - b.encoladoEn.getTime());
  }

  async eliminarPendiente(id: string): Promise<void> {
    const db = await this.db();
    await ejecutarEnTransaccion(db, STORE_PENDIENTES, "readwrite", (store) =>
      store.delete(id)
    );
  }

  async moverAConflicto(comando: OfflineCommand): Promise<void> {
    const db = await this.db();
    await ejecutarEnTransaccion(db, STORE_EN_CONFLICTO, "readwrite", (store) =>
      store.put(aRegistro(comando))
    );
    await ejecutarEnTransaccion(db, STORE_PENDIENTES, "readwrite", (store) =>
      store.delete(comando.id)
    );
  }

  async listarEnConflicto(): Promise<readonly OfflineCommand[]> {
    const db = await this.db();
    const registros = await ejecutarEnTransaccion<OfflineCommandRegistro[]>(
      db,
      STORE_EN_CONFLICTO,
      "readonly",
      (store) => store.getAll()
    );
    return registros.map(aComando);
  }
}

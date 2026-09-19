"use client";

import { useRef, useState, useTransition } from "react";

interface WhatsappQrButtonProps {
  readonly unidadId: string;
  readonly nombreUnidad: string;
  readonly qrUrlInicial: string | null;
  readonly action: (formData: FormData) => Promise<void>;
}

/**
 * Botón "WhatsApp QR": abre un modal que muestra el QR del grupo pequeño
 * (unidad de acción). Si no hay imagen, permite subir una; si existe, permite
 * reemplazarla o quitarla. La URL se persiste en los datos de la unidad.
 */
export function WhatsappQrButton({ unidadId, nombreUnidad, qrUrlInicial, action }: WhatsappQrButtonProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [qrUrl, setQrUrl] = useState<string | null>(qrUrlInicial);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function persistir(url: string | null) {
    const fd = new FormData();
    fd.set("unidadId", unidadId);
    fd.set("whatsappQrUrl", url ?? "");
    startTransition(async () => {
      await action(fd);
    });
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permitir re-seleccionar el mismo archivo
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      return;
    }
    setError(null);
    setSubiendo(true);
    try {
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { obtenerFirebaseStorageCliente } = await import("../../infrastructure/firebase-storage-client");
      const storage = obtenerFirebaseStorageCliente();
      const ext = file.name.split(".").pop() || "png";
      const storageRef = ref(storage, `unidades/${unidadId}/whatsapp-qr_${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setQrUrl(url);
      persistir(url);
    } catch (err) {
      console.error("Error al subir el QR:", err);
      setError("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setSubiendo(false);
    }
  }

  function quitar() {
    setQrUrl(null);
    persistir(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 transition-colors"
        title="Ver o asignar el QR de WhatsApp del grupo"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3M21 14v.01M14 21h.01M21 21v-3h-3" />
        </svg>
        WhatsApp QR
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/80 backdrop:backdrop-blur-sm bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-md shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">WhatsApp QR</h2>
              <p className="text-xs text-foreground/50 mt-0.5">
                Código QR del grupo{nombreUnidad ? ` — ${nombreUnidad}` : ""}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-foreground/40 hover:text-foreground text-xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div className="flex items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="Código QR de WhatsApp del grupo"
                className="max-h-64 w-auto rounded-lg object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-foreground/40">
                <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3M21 14v.01M14 21h.01M21 21v-3h-3" />
                </svg>
                <p className="text-sm">Aún no hay un QR asignado a este grupo.</p>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={onFileChange}
            className="hidden"
          />

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-foreground/10">
            {qrUrl ? (
              <button
                type="button"
                onClick={quitar}
                disabled={subiendo || isPending}
                className="rounded-lg px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                Quitar
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendo || isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {subiendo || isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Subiendo…
                </>
              ) : (
                qrUrl ? "Reemplazar" : "Subir imagen"
              )}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

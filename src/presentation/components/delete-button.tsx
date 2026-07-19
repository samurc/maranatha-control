"use client";

import { useRef, useTransition } from "react";

interface DeleteButtonProps {
  readonly id: string;
  readonly action: (formData: FormData) => Promise<void>;
  readonly entityName: string;
}

/**
 * Botón de eliminar con diálogo de confirmación y loading state.
 */
export function DeleteButton({ id, action, entityName }: DeleteButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      await action(formData);
      dialogRef.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs text-red-400 hover:text-red-300 transition-colors"
      >
        Eliminar
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-sm shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <span className="text-red-400 text-lg">⚠</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Confirmar eliminación
              </h3>
              <p className="mt-1 text-xs text-foreground/60">
                ¿Estás seguro de eliminar <strong>{entityName}</strong>? Se
                eliminarán también todos los datos relacionados. Esta acción no
                se puede deshacer.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={isPending}
              className="rounded-lg border border-foreground/20 px-3 py-2 text-xs font-medium text-foreground/70 hover:bg-foreground/5 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Eliminando...
                </span>
              ) : (
                "Sí, eliminar"
              )}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

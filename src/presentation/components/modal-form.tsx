"use client";

import { useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

interface ModalFormProps {
  readonly id: string;
  readonly title: string;
  readonly trigger: ReactNode;
  readonly children: ReactNode;
  readonly action: (formData: FormData) => void;
  readonly wide?: boolean;
}

/**
 * Modal dialog reutilizable basado en <dialog> nativo.
 * Se cierra automáticamente al completar la action y muestra loading.
 */
export function ModalForm({ id, title, trigger, children, action, wide }: ModalFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  async function handleAction(formData: FormData) {
    await action(formData);
    dialogRef.current?.close();
  }

  return (
    <>
      <span onClick={() => dialogRef.current?.showModal()}>{trigger}</span>
      <dialog
        ref={dialogRef}
        id={id}
        className={`backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 ${wide ? "max-w-2xl" : "max-w-md"}`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-foreground/40 hover:text-foreground transition-colors text-xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <form action={handleAction} className="space-y-4">
            {children}
            <SubmitButton />
          </form>
        </div>
      </dialog>
    </>
  );
}

export function FormField({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-foreground/80">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
      />
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Guardando...
        </span>
      ) : (
        "Guardar"
      )}
    </button>
  );
}

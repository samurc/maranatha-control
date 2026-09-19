"use client";

import { useRef, useState, useTransition } from "react";

export interface CandidatoHimno {
  readonly id: string;
  readonly nombre: string;
  readonly fotoUrl: string | null;
}

interface HimnoFavoritoButtonProps {
  readonly candidatos: readonly CandidatoHimno[];
  readonly action: (formData: FormData) => Promise<void>;
}

function elegirAleatorio(
  lista: readonly CandidatoHimno[],
  excluirId?: string
): CandidatoHimno | null {
  const pool = excluirId != null ? lista.filter((c) => c.id !== excluirId) : lista;
  const fuente = pool.length > 0 ? pool : lista;
  if (fuente.length === 0) return null;
  const idx = Math.floor(Math.random() * fuente.length);
  return fuente[idx] ?? null;
}

/**
 * Botón "Himno favorito": abre un modal con un participante activo aleatorio que
 * aún no tiene himno favorito, un input para el número y nombre del himno, y un
 * botón para sortear otro candidato.
 */
export function HimnoFavoritoButton({ candidatos, action }: HimnoFavoritoButtonProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // Pool local: al guardar, el participante sale del pool para no volver a salir.
  const [pool, setPool] = useState<readonly CandidatoHimno[]>(candidatos);
  const [actual, setActual] = useState<CandidatoHimno | null>(null);
  const [texto, setTexto] = useState("");
  const [guardadoOk, setGuardadoOk] = useState(false);

  function abrir() {
    setGuardadoOk(false);
    setTexto("");
    setActual(elegirAleatorio(pool));
    dialogRef.current?.showModal();
  }

  function otroAleatorio() {
    setGuardadoOk(false);
    setTexto("");
    setActual((prev) => elegirAleatorio(pool, prev?.id));
  }

  function guardar() {
    const valor = texto.trim();
    if (actual === null || valor.length === 0) return;
    const guardadoId = actual.id;
    setGuardadoOk(false);
    const fd = new FormData();
    fd.set("id", guardadoId);
    fd.set("himnoFavorito", valor);
    startTransition(async () => {
      await action(fd);
      // Sacar del pool y pasar al siguiente candidato.
      const restante = pool.filter((c) => c.id !== guardadoId);
      setPool(restante);
      setTexto("");
      setGuardadoOk(true);
      setActual(elegirAleatorio(restante));
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors"
        title="Asignar himno favorito a un participante aleatorio"
      >
        Himno favorito
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-md shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Himno favorito</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-foreground/40 hover:text-foreground text-xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          {actual === null ? (
            <p className="text-sm text-foreground/60 text-center py-8">
              {guardadoOk
                ? "¡Listo! Todos los participantes activos ya tienen himno favorito."
                : "No hay participantes activos sin himno favorito."}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3">
                {actual.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={actual.fotoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full object-cover bg-foreground/5"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-base font-bold text-blue-500">
                    {actual.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-foreground/40">Participante</p>
                  <p className="text-sm font-medium text-foreground truncate">{actual.nombre}</p>
                </div>
              </div>

              {guardadoOk && (
                <p className="text-xs text-green-500">Himno guardado. Aquí tienes el siguiente.</p>
              )}

              <div className="space-y-1.5">
                <label htmlFor="himnoFavorito" className="block text-sm font-medium text-foreground/80">
                  Número y nombre del himno
                </label>
                <input
                  ref={inputRef}
                  id="himnoFavorito"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      guardar();
                    }
                  }}
                  placeholder="Ej. 334 - Firmes y adelante"
                  className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={otroAleatorio}
                  disabled={isPending}
                  className="rounded-lg border border-foreground/20 px-3 py-2 text-xs font-medium text-foreground/70 hover:bg-foreground/5 transition-colors disabled:opacity-50"
                  title="Mostrar otro participante aleatorio"
                >
                  🎲 Otro aleatorio
                </button>
                <button
                  type="button"
                  onClick={guardar}
                  disabled={isPending || texto.trim().length === 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

export interface ModalAsistenciaMobileProps {
  participantes: { id: string; nombre: string; apellido: string; fotoUrl?: string }[];
  participanteActivoIdx: number;
  sabado: number;
  valorActual: string;
  onClose: () => void;
  onSelect: (pIdx: number, valor: string) => void;
  // Avanza al siguiente alumno (o null si es el último)
  onAvanzar: (pIdx: number) => void;
  // Retrocede al alumno anterior (o null si es el primero)
  onRetroceder: (pIdx: number) => void;
}

export function ModalAsistenciaMobile({
  participantes,
  participanteActivoIdx,
  sabado,
  valorActual,
  onClose,
  onSelect,
  onAvanzar,
  onRetroceder,
}: ModalAsistenciaMobileProps) {
  const p = participantes[participanteActivoIdx];
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Evitar scroll de fondo mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!p) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0 && e.touches[0]) {
      setTouchStart(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    if (e.changedTouches.length === 0 || !e.changedTouches[0]) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    const swipeThreshold = 50;

    if (distance > swipeThreshold) {
      // Swipe left -> Next student
      onAvanzar(participanteActivoIdx);
    } else if (distance < -swipeThreshold) {
      // Swipe right -> Previous student
      onRetroceder(participanteActivoIdx);
    }
    setTouchStart(null);
  };

  const opciones = ["F", "P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7"];

  const handleOptionClick = (opcion: string) => {
    onSelect(participanteActivoIdx, opcion);
    onAvanzar(participanteActivoIdx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        ref={modalRef}
        className="bg-background w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header y Botón Cerrar */}
        <div className="flex justify-between items-start p-4 bg-foreground/[0.03]">
          <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider">
            Sábado {sabado}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 -mt-2 -mr-2 text-foreground/50 hover:bg-foreground/10 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Info del Participante */}
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          {/* Navegación y Foto */}
          <div className="flex items-center w-full justify-between">
            <button 
              onClick={() => onRetroceder(participanteActivoIdx)}
              className={`p-3 rounded-full ${participanteActivoIdx > 0 ? "text-foreground hover:bg-foreground/10" : "text-foreground/20 cursor-not-allowed"}`}
              disabled={participanteActivoIdx === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {p.fotoUrl ? (
              <img src={p.fotoUrl} alt={p.nombre} className="w-24 h-24 rounded-full object-cover shadow-md border-2 border-background" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center border-2 border-blue-500/30">
                <span className="text-3xl font-bold text-blue-500">
                  {p.nombre.charAt(0)}{p.apellido.charAt(0)}
                </span>
              </div>
            )}

            <button 
              onClick={() => onAvanzar(participanteActivoIdx)}
              className={`p-3 rounded-full ${participanteActivoIdx < participantes.length - 1 ? "text-foreground hover:bg-foreground/10" : "text-foreground/20 cursor-not-allowed"}`}
              disabled={participanteActivoIdx === participantes.length - 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <h3 className="text-xl font-bold text-center leading-tight">
            {p.nombre} {p.apellido}
          </h3>
          <p className="text-xs text-foreground/50 text-center">Desliza izq/der para cambiar de alumno</p>
        </div>

        {/* Opciones */}
        <div className="p-4 grid grid-cols-3 gap-3 bg-foreground/[0.02]">
          {opciones.map(op => {
            const isSelected = valorActual === op;
            let btnClass = "bg-transparent text-foreground border-2 border-foreground/20 hover:bg-foreground/5";
            
            if (isSelected) {
              if (op === "F") {
                btnClass = "bg-red-500 text-white border-red-500 shadow-md";
              } else {
                btnClass = "bg-blue-500 text-white border-blue-500 shadow-md";
              }
            }

            return (
              <button
                key={op}
                onClick={() => handleOptionClick(op)}
                className={`py-3 rounded-xl font-bold text-lg transition-all active:scale-95 ${btnClass}`}
              >
                {op}
              </button>
            );
          })}
        </div>

        {/* Preload photos para evitar retraso visual al cambiar */}
        <div className="hidden">
          {participantes.map(part => part.fotoUrl ? (
            <img key={part.id} src={part.fotoUrl} alt="preload" />
          ) : null)}
        </div>
      </div>
    </div>
  );
}

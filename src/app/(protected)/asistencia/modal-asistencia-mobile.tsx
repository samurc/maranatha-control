"use client";

import { useEffect, useRef, useState } from "react";

export interface ModalAsistenciaMobileProps {
  participantes: { id: string; nombre: string; apellido: string; fotoUrl?: string }[];
  participanteActivoIdx: number;
  sabado: number;
  valorActual: string;
  indicadores: Record<string, string>;
  onClose: () => void;
  onSelect: (pIdx: number, valor: string) => void;
  onAvanzar: (pIdx: number) => void;
  onRetroceder: (pIdx: number) => void;
  onUpdateIndicador: (clave: string, valor: string) => void;
}

const indicadoresSteps = [
  { id: 'eb', label: 'N° de discípulos dando estudios bíblicos', type: 'integer' },
  { id: 're', label: 'N° personas que recibieron estudios bíblicos', type: 'integer' },
  { id: 'gp', label: 'N° discípulos que asistieron a G.P.', type: 'integer' },
  { id: 'ep', label: 'N° discípulos que participaron de los 365 días con el espíritu santo', type: 'integer' },
  { id: 'of', label: 'Ofrenda', type: 'decimal' },
  { id: 'vi', label: 'N° visitas', type: 'integer' },
];

export function ModalAsistenciaMobile({
  participantes,
  participanteActivoIdx,
  sabado,
  valorActual,
  indicadores,
  onClose,
  onSelect,
  onAvanzar,
  onRetroceder,
  onUpdateIndicador,
}: ModalAsistenciaMobileProps) {
  const p = participantes[participanteActivoIdx];
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [wizardPaso, setWizardPaso] = useState<number | null>(null);
  const [wizardValue, setWizardValue] = useState<string>("");

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
      handleAvanzar();
    } else if (distance < -swipeThreshold) {
      handleRetroceder();
    }
    setTouchStart(null);
  };

  const handleAvanzar = () => {
    if (wizardPaso !== null) {
      const step = indicadoresSteps[wizardPaso];
      if (step) {
        onUpdateIndicador(`${step.id}-${sabado}`, wizardValue);
      }
      
      if (wizardPaso < indicadoresSteps.length - 1) {
        const nextStep = indicadoresSteps[wizardPaso + 1];
        setWizardPaso(wizardPaso + 1);
        setWizardValue(nextStep ? (indicadores[`${nextStep.id}-${sabado}`] ?? "") : "");
      } else {
        onClose();
      }
    } else {
      if (participanteActivoIdx < participantes.length - 1) {
        onAvanzar(participanteActivoIdx);
      } else {
        const firstStep = indicadoresSteps[0];
        setWizardPaso(0);
        setWizardValue(firstStep ? (indicadores[`${firstStep.id}-${sabado}`] ?? "") : "");
      }
    }
  };

  const handleRetroceder = () => {
    if (wizardPaso !== null) {
      if (wizardPaso > 0) {
        const prevStep = indicadoresSteps[wizardPaso - 1];
        setWizardPaso(wizardPaso - 1);
        setWizardValue(prevStep ? (indicadores[`${prevStep.id}-${sabado}`] ?? "") : "");
      } else {
        setWizardPaso(null);
      }
    } else {
      if (participanteActivoIdx > 0) {
        onRetroceder(participanteActivoIdx);
      }
    }
  };

  const opciones = ["F", "P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7"];

  const handleOptionClick = (opcion: string) => {
    onSelect(participanteActivoIdx, opcion);
    handleAvanzar();
  };

  const handleKeypadPress = (key: string) => {
    if (wizardPaso === null) return;
    const step = indicadoresSteps[wizardPaso];
    if (!step) return;

    const isDecimal = step.type === 'decimal';
    
    if (key === '⌫') {
      setWizardValue(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (isDecimal && !wizardValue.includes('.')) {
        setWizardValue(prev => (prev === "" ? "0." : prev + "."));
      }
    } else {
      setWizardValue(prev => prev + key);
    }
  };

  const renderAttendanceUI = () => (
    <>
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

      <div className="flex flex-col items-center justify-center p-6 space-y-4">
        <div className="flex items-center w-full justify-between">
          <button 
            onClick={handleRetroceder}
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
            onClick={handleAvanzar}
            className="p-3 rounded-full text-foreground hover:bg-foreground/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <h3 className="text-xl font-bold text-center leading-tight">
          {p.nombre} {p.apellido}
        </h3>
        <p className="text-xs text-foreground/50 text-center">Desliza izq/der para cambiar</p>
      </div>

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
    </>
  );

  const renderWizardUI = () => {
    if (wizardPaso === null) return null;
    const step = indicadoresSteps[wizardPaso];
    if (!step) return null;
    const isDecimal = step.type === 'decimal';
    const isLast = wizardPaso === indicadoresSteps.length - 1;

    const keypadBtns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start p-4 bg-foreground/[0.03]">
          <button 
            onClick={handleRetroceder}
            className="p-2 -mt-2 -ml-2 text-foreground/50 hover:bg-foreground/10 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">
            Indicadores {wizardPaso + 1} de {indicadoresSteps.length}
          </span>
          <button 
            onClick={onClose} 
            className="p-2 -mt-2 -mr-2 text-foreground/50 hover:bg-foreground/10 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <h3 className="text-lg font-bold text-center leading-tight text-foreground/80">
            {step.label}
          </h3>
          
          <div className="text-5xl font-bold text-blue-500 min-h-[60px] flex items-center">
            {wizardValue || "0"}
          </div>
        </div>

        <div className="p-4 bg-foreground/[0.02]">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {keypadBtns.map(btn => (
              <button
                key={btn}
                onClick={() => handleKeypadPress(btn)}
                disabled={btn === '.' && !isDecimal}
                className={`py-4 rounded-xl font-bold text-xl transition-all active:scale-95 shadow-sm bg-background border border-foreground/10
                  ${btn === '.' && !isDecimal ? "opacity-30 cursor-not-allowed" : "text-foreground hover:bg-foreground/5"}
                `}
              >
                {btn}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleAvanzar}
            className="w-full py-4 rounded-xl font-bold text-lg bg-blue-500 text-white hover:bg-blue-600 transition-all active:scale-95 shadow-md"
          >
            {isLast ? "Guardar y Finalizar" : "Siguiente"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        ref={modalRef}
        className="bg-background w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {wizardPaso === null ? renderAttendanceUI() : renderWizardUI()}

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

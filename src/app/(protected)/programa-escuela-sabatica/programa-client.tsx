"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

/**
 * Módulo de monitoreo del Programa de Escuela Sabática.
 *
 * SIN PERSISTENCIA: todo vive en memoria del cliente. Usa la hora local
 * del dispositivo para calcular el bloque activo y mostrar countdowns
 * grandes de cuánto falta para el fin del bloque actual y para el inicio
 * del siguiente.
 */

/**
 * Tipado mínimo de la Document Picture-in-Picture API (Chromium). No está en
 * las libs por defecto de TypeScript, así que lo declaramos localmente.
 * https://developer.mozilla.org/docs/Web/API/DocumentPictureInPicture
 */
interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
}
interface DocumentPictureInPicture extends EventTarget {
  readonly window: Window | null;
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
}
declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

interface BloquePrograma {
  /** Inicio en minutos desde medianoche (hora local). */
  readonly inicioMin: number;
  /** Fin en minutos desde medianoche (hora local). */
  readonly finMin: number;
  readonly titulo: string;
  readonly responsable: string;
  readonly detalle: readonly string[];
  /** Etiqueta de ubicación, p. ej. "En Unidades de Acción". */
  readonly lugar?: string;
}

/** "HH:MM" (24h) -> minutos desde medianoche. */
function hm(hora: number, minuto: number): number {
  return hora * 60 + minuto;
}

/** Minutos desde medianoche -> "H:MM AM/PM". */
function formatearHora12(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const periodo = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${periodo}`;
}

/** Segundos -> "MM:SS" o "H:MM:SS" si supera la hora. */
function formatearCuenta(segundosTotales: number): string {
  const s = Math.max(0, Math.floor(segundosTotales));
  const horas = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const mm = min.toString().padStart(2, "0");
  const ss = seg.toString().padStart(2, "0");
  if (horas > 0) {
    return `${horas}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

const PROGRAMA: readonly BloquePrograma[] = [
  {
    inicioMin: hm(9, 20),
    finMin: hm(9, 30),
    titulo: "Alabanzas e Himno Inicial",
    responsable: "Equipo de Alabanza / Director de Escuela Sabática",
    detalle: [
      "Servicio de canto de apertura usando el Himnario Adventista. Se entona el Himno Inicial para dar la bienvenida y disponer el ambiente reverente en la iglesia.",
    ],
  },
  {
    inicioMin: hm(9, 30),
    finMin: hm(9, 40),
    titulo: "Bienvenida, Oración e Informativo Misionero",
    responsable: "Director o Integrante del Equipo de Escuela Sabática",
    detalle: [
      "Bienvenida general a la congregación y oración de inicio.",
      "Presentación del Informativo Misionero Mundial (video o lectura del relato del trimestre).",
    ],
  },
  {
    inicioMin: hm(9, 40),
    finMin: hm(9, 50),
    titulo: "Compañerismo y Pastoreo",
    responsable: "Maestro de Unidad de Acción y Hermano de Acompañamiento/Pastoreo",
    lugar: "En Unidades de Acción",
    detalle: [
      "Saludo fraternal y bienvenida a las visitas en la clase.",
      "Breve espacio para compartir testimonios de la semana, orar por pedidos específicos y velar por el bienestar de cada integrante (revisión de ausentes).",
    ],
  },
  {
    inicioMin: hm(9, 50),
    finMin: hm(10, 0),
    titulo: "Minutos Misioneros, Registro y Ofrendas",
    responsable: "Secretario de la Unidad de Acción",
    lugar: "En Unidades de Acción",
    detalle: [
      "Pase de lista y registro: conteo de asistencia, verificación del estudio diario de la lección y registro de actividades misioneras realizadas durante la semana.",
      "Ofrenda: recolección de las ofrendas destinadas a las misiones mundiales y entrega del sobre/carpeta a la secretaría.",
    ],
  },
  {
    inicioMin: hm(10, 0),
    finMin: hm(10, 30),
    titulo: "Repaso Interactivo de la Lección",
    responsable: "Maestro de Escuela Sabática",
    lugar: "En Unidades de Acción",
    detalle: [
      "Estudio y análisis participativo de la Biblia basándose en la lección de la semana.",
      "Énfasis en la aplicación práctica para la vida diaria y cierre con una decisión/oración final en el grupo.",
    ],
  },
];

const INICIO_PROGRAMA = PROGRAMA[0]!.inicioMin;
const FIN_PROGRAMA = PROGRAMA[PROGRAMA.length - 1]!.finMin;

/** Segundos en un día completo (para contar hacia el inicio del día siguiente). */
const SEGUNDOS_POR_DIA = 24 * 60 * 60;

/**
 * Minutos de gracia tras el fin del programa durante los cuales se sigue
 * mostrando "Finalizado". Pasada esta ventana, la vista vuelve a la fase
 * "antes" y cuenta hacia el inicio del programa del día siguiente.
 * 30 min => de 10:30 AM a 11:00 AM.
 */
const GRACIA_POST_PROGRAMA_MIN = 30;

type EstadoPrograma =
  | { fase: "antes"; segundosParaInicio: number }
  | {
    fase: "en-curso";
    indiceActual: number;
    segundosParaFinBloque: number;
    indiceSiguiente: number | null;
  }
  | { fase: "terminado" };

/** Deriva el estado del programa a partir de la hora local (en segundos desde medianoche). */
function derivarEstado(segundosDelDia: number): EstadoPrograma {
  const inicioSeg = INICIO_PROGRAMA * 60;
  const finSeg = FIN_PROGRAMA * 60;
  const finGraciaSeg = finSeg + GRACIA_POST_PROGRAMA_MIN * 60;

  // Ventana de gracia tras el fin del programa: seguir mostrando "Finalizado".
  if (segundosDelDia >= finSeg && segundosDelDia < finGraciaSeg) {
    return { fase: "terminado" };
  }

  // Fuera del programa y de su ventana de gracia: contar hacia el inicio.
  // Si ya pasó el inicio de hoy (p. ej. de noche), apuntar al día siguiente.
  if (segundosDelDia < inicioSeg || segundosDelDia >= finGraciaSeg) {
    const faltan =
      segundosDelDia < inicioSeg
        ? inicioSeg - segundosDelDia
        : inicioSeg + SEGUNDOS_POR_DIA - segundosDelDia;
    return { fase: "antes", segundosParaInicio: faltan };
  }

  for (let i = 0; i < PROGRAMA.length; i++) {
    const bloque = PROGRAMA[i]!;
    const bloqueFinSeg = bloque.finMin * 60;
    if (segundosDelDia < bloqueFinSeg) {
      return {
        fase: "en-curso",
        indiceActual: i,
        segundosParaFinBloque: bloqueFinSeg - segundosDelDia,
        indiceSiguiente: i + 1 < PROGRAMA.length ? i + 1 : null,
      };
    }
  }
  return { fase: "terminado" };
}

/**
 * Segundos que faltan para alcanzar `objetivoSeg` (segundos desde medianoche)
 * partiendo de `ahoraSeg`. Si el objetivo ya pasó hoy, cuenta hacia la próxima
 * ocurrencia del día siguiente.
 */
function segundosHasta(ahoraSeg: number, objetivoSeg: number): number {
  const diff = objetivoSeg - ahoraSeg;
  return diff >= 0 ? diff : diff + SEGUNDOS_POR_DIA;
}

/** Devuelve la hora local actual como segundos desde medianoche (incluye fracción de segundo). */
function ahoraEnSegundosDelDia(): number {
  const ahora = new Date();
  return (
    ahora.getHours() * 3600 +
    ahora.getMinutes() * 60 +
    ahora.getSeconds() +
    ahora.getMilliseconds() / 1000
  );
}

function useRelojLocal(): number {
  // Iniciamos en NaN para que el primer render en servidor/cliente coincida
  // y evitar mismatch de hidratación; se rellena tras montar.
  const [segundos, setSegundos] = useState<number>(() => Number.NaN);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let activo = true;
    const tick = () => {
      if (!activo) return;
      setSegundos(ahoraEnSegundosDelDia());
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      activo = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return segundos;
}

/** Copia estilos (Tailwind y globales) del documento principal al documento PiP. */
function copiarEstilos(destino: Document): void {
  for (const hoja of Array.from(document.styleSheets)) {
    try {
      const reglas = Array.from(hoja.cssRules)
        .map((r) => r.cssText)
        .join("");
      const style = destino.createElement("style");
      style.textContent = reglas;
      destino.head.appendChild(style);
    } catch {
      // Hoja cross-origin: no exponen cssRules. La replicamos vía <link>.
      const link = destino.createElement("link");
      link.rel = "stylesheet";
      link.type = hoja.type;
      if (hoja.media.length > 0) link.media = hoja.media.mediaText;
      if (hoja.href) link.href = hoja.href;
      destino.head.appendChild(link);
    }
  }
}

interface EstadoPip {
  /** ¿El navegador soporta la Document PiP API? */
  readonly soportado: boolean;
  /** Ventana PiP activa (o null si está cerrada). */
  readonly ventana: Window | null;
  /** Abre la ventana flotante. */
  readonly abrir: () => Promise<void>;
  /** Cierra la ventana flotante. */
  readonly cerrar: () => void;
}

/**
 * Gestiona el ciclo de vida de la ventana Document Picture-in-Picture:
 * apertura, cierre, copia de estilos y sincronización del tema (clase del
 * `<html>` y color de fondo) para que el contenido se vea igual que en la app.
 */
function usePip(): EstadoPip {
  const [ventana, setVentana] = useState<Window | null>(null);
  // Detección de soporte segura para SSR: en servidor devuelve false; en
  // cliente comprueba la presencia de la API. useSyncExternalStore evita el
  // mismatch de hidratación sin llamar a setState dentro de un efecto.
  const soportado = useSyncExternalStore(
    () => () => { },
    () => "documentPictureInPicture" in window,
    () => false
  );

  const cerrar = useCallback(() => {
    ventana?.close();
    setVentana(null);
  }, [ventana]);

  const abrir = useCallback(async () => {
    if (!window.documentPictureInPicture) return;
    const pip = await window.documentPictureInPicture.requestWindow({
      width: 380,
      height: 240,
    });

    copiarEstilos(pip.document);

    // Replicar clase de tema (p. ej. "dark") y fondo para heredar colores.
    pip.document.documentElement.className = document.documentElement.className;
    const fondo = getComputedStyle(document.body).backgroundColor;
    pip.document.body.style.margin = "0";
    pip.document.body.style.background = fondo;
    pip.document.body.style.color = getComputedStyle(document.body).color;

    // Al cerrar la ventana (botón del navegador o del sistema) limpiar estado.
    pip.addEventListener("pagehide", () => setVentana(null), { once: true });

    setVentana(pip);
  }, []);

  // Cerrar la ventana al desmontar el componente.
  useEffect(() => {
    return () => {
      ventana?.close();
    };
  }, [ventana]);

  return { soportado, ventana, abrir, cerrar };
}

/** Datos que necesita el temporizador flotante para renderizarse. */
interface FocoTimer {
  readonly titulo: string;
  readonly etiqueta: string;
  readonly segundos: number;
  readonly urgente: boolean;
}

/** Deriva qué mostrar en el temporizador flotante a partir del estado actual. */
function derivarFocoTimer(
  estado: EstadoPrograma,
  segundosDelDia: number
): FocoTimer {
  if (estado.fase === "en-curso") {
    const bloque = PROGRAMA[estado.indiceActual]!;
    return {
      titulo: bloque.titulo,
      etiqueta: "Termina en",
      segundos: estado.segundosParaFinBloque,
      urgente: estado.segundosParaFinBloque <= 60,
    };
  }
  if (estado.fase === "terminado") {
    return { titulo: "Programa", etiqueta: "", segundos: 0, urgente: false };
  }
  // Fase "antes": contamos hacia el inicio del primer bloque.
  const primero = PROGRAMA[0]!;
  return {
    titulo: primero.titulo,
    etiqueta: "Comienza en",
    segundos: segundosHasta(segundosDelDia, primero.inicioMin * 60),
    urgente: false,
  };
}

export function ProgramaClient(): React.JSX.Element {
  const segundosDelDia = useRelojLocal();
  const montado = !Number.isNaN(segundosDelDia);
  const pip = usePip();

  const estado = useMemo<EstadoPrograma | null>(() => {
    if (!montado) return null;
    return derivarEstado(segundosDelDia);
  }, [montado, segundosDelDia]);

  const duracionTotalMin = FIN_PROGRAMA - INICIO_PROGRAMA;
  const foco = estado ? derivarFocoTimer(estado, segundosDelDia) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programa de Escuela Sabática</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Monitoreo en tiempo real con la hora local del dispositivo · {formatearHora12(INICIO_PROGRAMA)} – {formatearHora12(FIN_PROGRAMA)} ({duracionTotalMin} min)
          </p>
        </div>
        {pip.soportado && (
          <button
            type="button"
            onClick={() => (pip.ventana ? pip.cerrar() : void pip.abrir())}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-foreground/15 bg-foreground/[0.03] px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/[0.06]"
            title="Abrir el temporizador en una ventana flotante siempre visible"
          >
            <PipIcon />
            {pip.ventana ? "Cerrar flotante" : "Ventana flotante"}
          </button>
        )}
      </div>

      {/* Temporizador flotante (Picture-in-Picture) */}
      {pip.ventana &&
        foco &&
        createPortal(<PipTimer foco={foco} />, pip.ventana.document.body)}

      {/* Cronograma: cada bloque muestra su propio countdown grande */}
      <div className="space-y-3">
        {!montado || estado === null ? (
          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-6 py-12 text-center">
            <p className="text-foreground/40">Sincronizando con la hora local…</p>
          </div>
        ) : (
          <div className="space-y-4">
            {PROGRAMA.map((bloque, i) => {
              const activo = estado.fase === "en-curso" && estado.indiceActual === i;
              // El programa completo terminó (>= 10:30 AM).
              const programaTerminado = estado.fase === "terminado";
              // Un bloque previo cuya hora de fin ya pasó, pero el programa
              // sigue en curso.
              const yaPaso =
                !programaTerminado &&
                estado.fase === "en-curso" &&
                i < estado.indiceActual;
              // Segundos que restan para que ESTE bloque termine (solo relevante
              // cuando está activo).
              const segundosParaFin = Math.max(0, bloque.finMin * 60 - segundosDelDia);
              // Segundos que faltan para que ESTE bloque comience. Si su hora de
              // inicio ya pasó hoy, cuenta hacia la ocurrencia del día siguiente.
              const segundosParaInicio = segundosHasta(segundosDelDia, bloque.inicioMin * 60);
              return (
                <BloqueFila
                  key={bloque.inicioMin}
                  bloque={bloque}
                  activo={activo}
                  yaPaso={yaPaso}
                  esPrimero={i === 0}
                  programaTerminado={programaTerminado}
                  segundosParaFin={segundosParaFin}
                  segundosParaInicio={segundosParaInicio}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Ícono simple de "ventana flotante" (PiP). */
function PipIcon(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <rect x="12" y="10" width="7" height="6" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Contenido del temporizador flotante. Se renderiza vía portal dentro de la
 * ventana Document PiP; como sigue siendo parte del árbol de React, el
 * countdown se actualiza en vivo sin lógica extra.
 */
function PipTimer({ foco }: { foco: FocoTimer }): React.JSX.Element {
  const terminado = foco.etiqueta === "";
  const color = foco.urgente ? "#f87171" : terminado ? "#9ca3af" : "#fbbf24";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        boxSizing: "border-box",
        padding: "16px",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          fontWeight: 600,
          opacity: 0.7,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {foco.titulo}
      </p>
      {terminado ? (
        <p style={{ margin: "8px 0 0", fontSize: "40px", fontWeight: 800, color }}>
          Finalizado
        </p>
      ) : (
        <>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color,
            }}
          >
            {foco.etiqueta}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "clamp(48px, 22vw, 96px)",
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              color,
            }}
          >
            {formatearCuenta(foco.segundos)}
          </p>
        </>
      )}
    </div>
  );
}

function BloqueFila({
  bloque,
  activo,
  yaPaso,
  esPrimero,
  programaTerminado,
  segundosParaFin,
  segundosParaInicio,
}: {
  bloque: BloquePrograma;
  activo: boolean;
  /** El bloque ya pasó su hora de fin, pero el programa sigue en curso. */
  yaPaso: boolean;
  /** Es el primer bloque del programa (Apertura y Himno Inicial). */
  esPrimero: boolean;
  /** El programa completo terminó (>= 10:30 AM). */
  programaTerminado: boolean;
  /** Segundos que restan para que este bloque termine (0 si ya terminó). */
  segundosParaFin: number;
  /** Segundos que faltan para que este bloque comience (0 si ya empezó). */
  segundosParaInicio: number;
}): React.JSX.Element {
  const duracionMin = bloque.finMin - bloque.inicioMin;
  // Alerta cuando faltan 60s o menos para el fin de un bloque en curso.
  const porTerminar = activo && segundosParaFin <= 60;
  // El bloque aún no ha empezado (ni activo, ni ya pasó, ni programa terminado).
  const noIniciado = !activo && !yaPaso && !programaTerminado;
  // Se ve atenuado (sin countdown en vivo) cuando ya pasó, cuando el programa
  // terminó, o cuando es un bloque futuro que NO es el primero. Solo el primer
  // bloque muestra "Comienza en" mientras no ha iniciado.
  const atenuado = yaPaso || programaTerminado || (noIniciado && !esPrimero);

  const duracionBloqueSeg = duracionMin * 60;
  const transcurridoSeg = duracionBloqueSeg - segundosParaFin;
  const progreso = Math.min(100, Math.max(0, (transcurridoSeg / duracionBloqueSeg) * 100));

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${activo
        ? "border-green-500/40 bg-green-500/[0.06]"
        : atenuado
          ? "border-foreground/10 bg-foreground/[0.01] opacity-60"
          : "border-foreground/10 bg-foreground/[0.02]"
        }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-medium text-foreground/70">
          {formatearHora12(bloque.inicioMin)} – {formatearHora12(bloque.finMin)}
        </span>
        <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/50">
          {duracionMin} min
        </span>
        {bloque.lugar && (
          <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/60">
            {bloque.lugar}
          </span>
        )}
        {activo && (
          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-400">
            EN CURSO
          </span>
        )}
        {atenuado && (
          <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/40">
            {programaTerminado ? "✓ Completado" : "Sin iniciar"}
          </span>
        )}
      </div>
      <h3 className="mt-1.5 font-semibold text-foreground">{bloque.titulo}</h3>
      <p className="text-sm text-foreground/60">{bloque.responsable}</p>
      <ul className="mt-2 space-y-1">
        {bloque.detalle.map((d, i) => (
          <li key={i} className="flex gap-2 text-sm text-foreground/50">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/30" />
            <span>{d}</span>
          </li>
        ))}
      </ul>

      {/* Countdown grande: cuánto resta para que ESTE bloque termine */}
      <div
        className={`mt-4 rounded-xl border px-5 py-5 text-center ${atenuado
          ? "border-foreground/10 bg-foreground/[0.02]"
          : activo
            ? porTerminar
              ? "border-red-500/40 bg-red-500/10"
              : "border-amber-500/30 bg-amber-500/5"
            : "border-foreground/10 bg-foreground/[0.02]"
          }`}
      >
        {atenuado ? (
          <p className="font-mono text-3xl font-bold tabular-nums leading-none text-foreground/40 sm:text-4xl">
            {programaTerminado ? "Finalizado" : "Sin iniciar"}
          </p>
        ) : (
          <>
            <p
              className={`text-[11px] font-semibold uppercase tracking-widest ${activo ? (porTerminar ? "text-red-400" : "text-amber-400") : "text-foreground/50"
                }`}
            >
              {activo ? "Termina en" : "Comienza en"}
            </p>
            <p
              className={`mt-1 font-mono font-bold tabular-nums leading-none text-5xl sm:text-6xl md:text-7xl ${activo ? (porTerminar ? "text-red-400" : "text-amber-400") : "text-foreground/70"
                }`}
            >
              {formatearCuenta(activo ? segundosParaFin : segundosParaInicio)}
            </p>
          </>
        )}
      </div>

      {/* Barra de progreso solo en el bloque en curso */}
      {activo && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${porTerminar ? "bg-red-500" : "bg-green-500"}`}
            style={{ width: `${progreso}%` }}
          />
        </div>
      )}
    </div>
  );
}

"use client";

import { toPng } from "html-to-image";

interface Participante {
  id: string;
  nombre: string;
  apellido: string;
}

interface ExportarParams {
  participantes: Participante[];
  grilla: Record<string, Record<string, string>>;
  indicadores: Record<string, string>;
  nombreIglesia: string;
  nombreUnidad: string;
  trimestre: number;
  anio: number;
}

const SABADOS = Array.from({ length: 13 }, (_, i) => i + 1);

// Cuántos participantes caben en una sola hoja horizontal JUNTO con las 8
// filas de indicadores. Hasta este número se exporta en 1 sola imagen.
const MAX_PARTICIPANTES_UNA_HOJA = 22;

// Cuando se necesitan 2 hojas: la primera lleva más participantes (no tiene
// indicadores), y la segunda lleva el resto + las 8 filas de indicadores.
const PARTICIPANTES_PRIMERA_HOJA = 22;

const INDICADORES = [
  { clave: "presentes", label: "N° alumnos presentes" },
  { clave: "estudiaron", label: "N° alumnos que estudiaron diariamente la lección" },
  { clave: "eb", label: "N° de discípulos dando estudios bíblicos" },
  { clave: "re", label: "N° personas que recibieron estudios bíblicos" },
  { clave: "gp", label: "N° discípulos que asistieron a G.P." },
  { clave: "ep", label: "N° discípulos que participaron de los 365 días con el espíritu santo" },
  { clave: "of", label: "Ofrenda" },
  { clave: "vi", label: "N° visitas" },
];

function celdaTexto(valor: string): string {
  if (valor === "F") return "F";
  if (valor.startsWith("P")) return valor.slice(1) || "0";
  return "";
}

function contarPresentes(grilla: ExportarParams["grilla"], participantes: Participante[], sabado: number): number {
  let n = 0;
  for (const p of participantes) {
    const v = grilla[p.id]?.[`S${sabado}`] ?? "";
    if (v.startsWith("P")) n++;
  }
  return n;
}

function contarEstudiaron(grilla: ExportarParams["grilla"], participantes: Participante[], sabado: number): number {
  let n = 0;
  for (const p of participantes) {
    const v = grilla[p.id]?.[`S${sabado}`] ?? "";
    if (v === "P7") n++;
  }
  return n;
}

/** Construye una tabla HTML plana (estilo claro, sin inputs) lista para renderizar a imagen. */
function construirTabla(
  params: ExportarParams,
  participantes: Participante[],
  offsetNumeracion: number,
  incluirTotales: boolean,
  parteInfo: { parte: number; total: number } | null
): HTMLElement {
  const { grilla, indicadores, nombreIglesia, nombreUnidad, trimestre, anio } = params;

  // Lienzo horizontal (A4 apaisado @96dpi). Ancho fijo para orientación
  // apaisada uniforme; alto mínimo de hoja pero puede crecer si una mitad
  // tiene muchas filas, evitando cortar contenido.
  // Color azul en lugar de negro (la impresora no tiene tinta negra).
  const AZUL = "#1d4ed8";

  const contenedor = document.createElement("div");
  contenedor.style.cssText =
    `background:#ffffff;color:${AZUL};padding:32px 40px;font-family:Arial,Helvetica,sans-serif;` +
    "width:1123px;min-height:794px;box-sizing:border-box;display:flex;flex-direction:column;";

  // Encabezado
  const titulo = document.createElement("div");
  titulo.style.cssText = "margin-bottom:12px;";
  const parteSufijo = parteInfo ? ` — Parte ${parteInfo.parte} de ${parteInfo.total}` : "";
  titulo.innerHTML =
    `<div style="font-size:18px;font-weight:700;color:${AZUL};">Control de Asistencia y Estudio Diario${parteSufijo}</div>` +
    `<div style="font-size:13px;color:${AZUL};margin-top:2px;">${nombreIglesia} — ${nombreUnidad} — ${trimestre}° Trimestre ${anio}</div>`;
  contenedor.appendChild(titulo);

  const tabla = document.createElement("table");
  tabla.style.cssText = `border-collapse:collapse;font-size:12px;width:100%;table-layout:fixed;color:${AZUL};`;

  // Bordes azules, sin colores de fondo en las celdas.
  const th = `border:1px solid ${AZUL};padding:6px 4px;font-weight:600;text-align:center;color:${AZUL};`;
  const thLeft = `border:1px solid ${AZUL};padding:6px 8px;font-weight:600;text-align:left;color:${AZUL};`;
  const td = `border:1px solid ${AZUL};padding:5px 4px;text-align:center;color:${AZUL};`;
  const tdLeft = `border:1px solid ${AZUL};padding:5px 8px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${AZUL};`;

  // Anchos fijos de columna para un layout apaisado uniforme
  const colgroup = document.createElement("colgroup");
  colgroup.innerHTML =
    `<col style="width:36px;" /><col style="width:190px;" />` +
    SABADOS.map(() => `<col style="width:auto;" />`).join("");
  tabla.appendChild(colgroup);

  // Cabecera
  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  trHead.innerHTML =
    `<th style="${th}">#</th><th style="${thLeft}">Nombre y apellido</th>` +
    SABADOS.map((s) => `<th style="${th}">${s}°</th>`).join("");
  thead.appendChild(trHead);
  tabla.appendChild(thead);

  // Cuerpo
  const tbody = document.createElement("tbody");
  participantes.forEach((p, idx) => {
    const tr = document.createElement("tr");
    const celdas = SABADOS.map((s) => {
      const v = grilla[p.id]?.[`S${s}`] ?? "";
      const texto = celdaTexto(v);
      return `<td style="${td}">${texto}</td>`;
    }).join("");
    tr.innerHTML =
      `<td style="${td}">${offsetNumeracion + idx + 1}</td>` +
      `<td style="${tdLeft}">${p.nombre} ${p.apellido}</td>` +
      celdas;
    tbody.appendChild(tr);
  });
  tabla.appendChild(tbody);

  // Totales / indicadores (solo en la última imagen para no duplicar)
  if (incluirTotales) {
    const tfoot = document.createElement("tfoot");
    for (const ind of INDICADORES) {
      const tr = document.createElement("tr");
      const valores = SABADOS.map((s) => {
        let texto = "";
        if (ind.clave === "presentes") {
          const n = contarPresentes(grilla, params.participantes, s);
          texto = n > 0 ? String(n) : "";
        } else if (ind.clave === "estudiaron") {
          const n = contarEstudiaron(grilla, params.participantes, s);
          texto = n > 0 ? String(n) : "";
        } else {
          texto = indicadores[`${ind.clave}-${s}`] ?? "";
        }
        return `<td style="${td}">${texto}</td>`;
      }).join("");
      const tdLabel =
        `border:1px solid ${AZUL};padding:5px 8px;text-align:left;color:${AZUL};` +
        "font-weight:600;white-space:normal;word-break:break-word;line-height:1.15;font-size:10px;";
      tr.innerHTML =
        `<td style="${td}"></td>` +
        `<td style="${tdLabel}">${ind.label}</td>` +
        valores;
      tfoot.appendChild(tr);
    }
    tabla.appendChild(tfoot);
  }

  contenedor.appendChild(tabla);
  return contenedor;
}

function descargar(dataUrl: string, nombre: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = nombre;
  a.click();
}

/** Espera a que el navegador haga layout + paint del nodo antes de capturarlo. */
function esperarPintado(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Exporta la tabla de asistencia como imagen(es) PNG horizontales.
 * Genera como máximo 2 hojas: si hay más de FILAS_POR_IMAGEN alumnos,
 * la lista se reparte en dos mitades (una por hoja).
 */
export async function exportarAsistenciaImagen(params: ExportarParams): Promise<void> {
  const { participantes, nombreUnidad, trimestre, anio } = params;

  const baseNombre = `asistencia-${nombreUnidad || "unidad"}-T${trimestre}-${anio}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

  // Máximo 2 hojas. En 1 sola caben los participantes + los 8 indicadores.
  // Si hay demasiados, la 1ra hoja lleva PARTICIPANTES_PRIMERA_HOJA (sin
  // indicadores) y la 2da el resto + los indicadores, quedando equilibradas.
  const fragmentos: Participante[][] = [];
  if (participantes.length <= MAX_PARTICIPANTES_UNA_HOJA) {
    fragmentos.push(participantes);
  } else {
    fragmentos.push(participantes.slice(0, PARTICIPANTES_PRIMERA_HOJA));
    fragmentos.push(participantes.slice(PARTICIPANTES_PRIMERA_HOJA));
  }

  const totalPartes = fragmentos.length;
  let offsetAcumulado = 0;

  for (let i = 0; i < fragmentos.length; i++) {
    const esUltima = i === fragmentos.length - 1;
    const offset = offsetAcumulado;
    offsetAcumulado += fragmentos[i]!.length;
    const parteInfo = totalPartes > 1 ? { parte: i + 1, total: totalPartes } : null;

    const nodo = construirTabla(params, fragmentos[i]!, offset, esUltima, parteInfo);

    // Render fuera de la vista pero SIN sacarlo del flujo de layout,
    // para que el navegador calcule dimensiones y lo pinte de verdad.
    nodo.style.position = "fixed";
    nodo.style.left = "0";
    nodo.style.top = "0";
    nodo.style.zIndex = "-1";
    nodo.style.opacity = "0";
    nodo.style.pointerEvents = "none";
    document.body.appendChild(nodo);

    // Esperar a que las fuentes estén listas y a que el nodo se pinte.
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        /* ignorar */
      }
    }
    await esperarPintado();

    // Tamaño fijo del lienzo (horizontal); usamos el tamaño real renderizado.
    const ancho = Math.ceil(nodo.offsetWidth);
    const alto = Math.ceil(nodo.offsetHeight);

    try {
      const opciones = {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        width: ancho,
        height: alto,
        style: { opacity: "1" },
      };

      // Primera captura suele salir en blanco (fuentes/imágenes aún no listas);
      // se descarta y se vuelve a capturar.
      await toPng(nodo, opciones);
      await esperarPintado();
      const dataUrl = await toPng(nodo, opciones);

      const nombre = totalPartes > 1 ? `${baseNombre}-parte-${i + 1}.png` : `${baseNombre}.png`;
      descargar(dataUrl, nombre);
    } finally {
      document.body.removeChild(nodo);
    }
  }
}

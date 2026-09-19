"use client";

import { toPng } from "html-to-image";

export interface GrupoExport {
  readonly nombres: readonly string[];
}

interface ExportarPorGenero {
  readonly titulo: string;
  readonly hombres: readonly GrupoExport[];
  readonly mujeres: readonly GrupoExport[];
}

interface ExportarMixto {
  readonly titulo: string;
  readonly mixtos: readonly GrupoExport[];
}

type ExportarParams = ExportarPorGenero | ExportarMixto;

function descargar(dataUrl: string, nombre: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = nombre;
  a.click();
}

function esperarPintado(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function escapar(texto: string): string {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function construirColumna(grupos: readonly GrupoExport[], AZUL: string): HTMLElement {
  const col = document.createElement("div");
  col.style.cssText = "flex:1;min-width:0;";

  grupos.forEach((g, i) => {
    const fila = document.createElement("div");
    fila.style.cssText =
      `border:1px solid ${AZUL};border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:13px;color:${AZUL};`;
    fila.innerHTML =
      `<span style="font-weight:700;">${i + 1}.</span> ` +
      g.nombres.map((n) => escapar(n)).join(" &nbsp;✦&nbsp; ");
    col.appendChild(fila);
  });
  if (grupos.length === 0) {
    const vacio = document.createElement("div");
    vacio.style.cssText = `font-size:12px;color:${AZUL};opacity:0.6;`;
    vacio.textContent = "Sin grupos.";
    col.appendChild(vacio);
  }
  return col;
}

function construir(params: ExportarParams): HTMLElement {
  const AZUL = "#1d4ed8";

  const contenedor = document.createElement("div");
  contenedor.style.cssText =
    `background:#ffffff;color:${AZUL};padding:32px 40px;font-family:Arial,Helvetica,sans-serif;` +
    "width:820px;box-sizing:border-box;";

  const encabezado = document.createElement("div");
  encabezado.style.cssText = "margin-bottom:16px;";
  encabezado.innerHTML =
    `<div style="font-size:20px;font-weight:700;color:${AZUL};">Oración Intercesora</div>` +
    `<div style="font-size:13px;color:${AZUL};margin-top:2px;">${escapar(params.titulo)}</div>`;
  contenedor.appendChild(encabezado);

  const columnas = document.createElement("div");
  columnas.style.cssText = "display:flex;gap:24px;align-items:flex-start;";

  if ("mixtos" in params) {
    columnas.appendChild(construirColumna(params.mixtos, AZUL));
  } else {
    columnas.appendChild(construirColumna(params.hombres, AZUL));
    columnas.appendChild(construirColumna(params.mujeres, AZUL));
  }
  contenedor.appendChild(columnas);
  return contenedor;
}

/** Genera y descarga una imagen PNG con los grupos de oración por género. */
export async function exportarOracionImagen(params: ExportarParams): Promise<void> {
  const nodo = construir(params);
  nodo.style.position = "fixed";
  nodo.style.left = "0";
  nodo.style.top = "0";
  nodo.style.zIndex = "-1";
  nodo.style.opacity = "0";
  nodo.style.pointerEvents = "none";
  document.body.appendChild(nodo);

  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignorar */
    }
  }
  await esperarPintado();

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
    await toPng(nodo, opciones);
    await esperarPintado();
    const dataUrl = await toPng(nodo, opciones);
    descargar(dataUrl, "oracion-intercesora.png");
  } finally {
    document.body.removeChild(nodo);
  }
}

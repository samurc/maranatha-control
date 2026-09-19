"use client";

import { toPng } from "html-to-image";

export interface FilaAsignacion {
  readonly ausente: string;
  readonly celular: string;
  readonly responsable: string;
}

interface ExportarAsignacionesParams {
  readonly titulo: string;
  readonly filas: readonly FilaAsignacion[];
}

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

function construirTabla({ titulo, filas }: ExportarAsignacionesParams): HTMLElement {
  const AZUL = "#1d4ed8";

  const contenedor = document.createElement("div");
  contenedor.style.cssText =
    `background:#ffffff;color:${AZUL};padding:32px 40px;font-family:Arial,Helvetica,sans-serif;` +
    "width:720px;box-sizing:border-box;display:flex;flex-direction:column;";

  const encabezado = document.createElement("div");
  encabezado.style.cssText = "margin-bottom:16px;";
  encabezado.innerHTML =
    `<div style="font-size:18px;font-weight:700;color:${AZUL};">Seguimiento de ausentes</div>` +
    `<div style="font-size:13px;color:${AZUL};margin-top:2px;">${titulo}</div>`;
  contenedor.appendChild(encabezado);

  const tabla = document.createElement("table");
  tabla.style.cssText = `border-collapse:collapse;font-size:13px;width:100%;table-layout:fixed;color:${AZUL};`;

  const th = `border:1px solid ${AZUL};padding:8px 10px;font-weight:700;text-align:left;color:${AZUL};`;
  const td = `border:1px solid ${AZUL};padding:7px 10px;text-align:left;color:${AZUL};white-space:normal;word-break:break-word;`;

  const colgroup = document.createElement("colgroup");
  colgroup.innerHTML =
    `<col style="width:38%;" /><col style="width:26%;" /><col style="width:36%;" />`;
  tabla.appendChild(colgroup);

  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  trHead.innerHTML =
    `<th style="${th}">Ausente</th><th style="${th}">Celular</th><th style="${th}">Responsable asignado</th>`;
  thead.appendChild(trHead);
  tabla.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const fila of filas) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td style="${td}">${escapar(fila.ausente)}</td>` +
      `<td style="${td}">${escapar(fila.celular || "—")}</td>` +
      `<td style="${td}">${escapar(fila.responsable)}</td>`;
    tbody.appendChild(tr);
  }
  tabla.appendChild(tbody);

  contenedor.appendChild(tabla);
  return contenedor;
}

/** Escapa texto para evitar inyección de HTML al construir la tabla. */
function escapar(texto: string): string {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

/** Genera y descarga una imagen PNG con las asignaciones ausente → responsable + celular. */
export async function exportarAsignacionesImagen(params: ExportarAsignacionesParams): Promise<void> {
  const nodo = construirTabla(params);

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
    // Primera captura suele salir en blanco; se descarta y se recaptura.
    await toPng(nodo, opciones);
    await esperarPintado();
    const dataUrl = await toPng(nodo, opciones);
    descargar(dataUrl, `seguimiento-ausentes.png`);
  } finally {
    document.body.removeChild(nodo);
  }
}

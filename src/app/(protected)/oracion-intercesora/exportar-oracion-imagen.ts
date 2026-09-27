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

/** Azul marino de acentos y nombres (tomado del logo). */
const AZUL = "#1e3a5f";
/** Rutas de los assets de la cabecera. */
const LEMA_SRC = "/alguien_ora_por_ti_1.png";
const LOGO_SRC = "/alguien_ora_por_ti_2.png";

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

/**
 * Carga una imagen del `public/` y la convierte a data URL para poder
 * incrustarla en el nodo exportado (evita problemas de carga/CORS con
 * html-to-image).
 */
async function comoDataUrl(src: string): Promise<string | null> {
  try {
    const resp = await fetch(src);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Cabecera: logo (izquierda), título del sábado (centro) y lema (derecha). */
function construirCabecera(
  titulo: string,
  lemaUrl: string | null,
  logoUrl: string | null
): HTMLElement {
  const cabecera = document.createElement("div");
  cabecera.style.cssText = "margin-bottom:24px;";

  const fila = document.createElement("div");
  // Logo a la izquierda, título al centro y lema a la derecha.
  fila.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;gap:24px;";

  const logo = document.createElement("img");
  if (logoUrl) logo.src = logoUrl;
  logo.style.cssText = "height:110px;width:auto;display:block;flex:0 0 auto;";
  fila.appendChild(logo);

  const centro = document.createElement("div");
  centro.style.cssText =
    `flex:1;text-align:center;font-size:18px;font-weight:700;color:${AZUL};`;
  centro.innerHTML = escapar(titulo);
  fila.appendChild(centro);

  const lema = document.createElement("img");
  if (lemaUrl) lema.src = lemaUrl;
  lema.style.cssText = "height:96px;width:auto;display:block;flex:0 0 auto;";
  fila.appendChild(lema);

  cabecera.appendChild(fila);
  return cabecera;
}

/** Tarjeta de un grupo: integrantes en una lista con viñetas resaltadas. */
function construirTarjeta(grupo: GrupoExport): HTMLElement {
  const card = document.createElement("div");
  card.style.cssText =
    `border:1.5px solid ${AZUL}40;border-radius:10px;background:${AZUL}08;` +
    "padding:12px 16px;" +
    "break-inside:avoid;-webkit-column-break-inside:avoid;";

  grupo.nombres.forEach((n, i) => {
    const item = document.createElement("div");
    item.style.cssText =
      "display:flex;align-items:baseline;gap:9px;" +
      (i < grupo.nombres.length - 1 ? "margin-bottom:6px;" : "");

    const bullet = document.createElement("span");
    bullet.style.cssText =
      `flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:${AZUL};` +
      "transform:translateY(-1px);";
    item.appendChild(bullet);

    const nombre = document.createElement("span");
    nombre.style.cssText =
      `flex:1;min-width:0;font-size:16px;font-weight:600;color:${AZUL};line-height:1.4;`;
    nombre.innerHTML = escapar(n);
    item.appendChild(nombre);

    card.appendChild(item);
  });

  return card;
}

/**
 * Sección de grupos: una grilla multicolumna de tarjetas. Las tarjetas fluyen
 * y nunca se cortan entre columnas.
 */
function construirSeccion(grupos: readonly GrupoExport[], columnas: number): HTMLElement {
  const seccion = document.createElement("div");
  seccion.style.cssText = "margin-bottom:22px;";

  const grilla = document.createElement("div");
  // CSS columns: reparte las tarjetas equilibradamente en varias columnas.
  grilla.style.cssText = `column-count:${columnas};column-gap:16px;`;

  grupos.forEach((g) => {
    const tarjeta = construirTarjeta(g);
    tarjeta.style.marginBottom = "12px";
    grilla.appendChild(tarjeta);
  });

  if (grupos.length === 0) {
    const vacio = document.createElement("div");
    vacio.style.cssText = `font-size:13px;color:${AZUL}99;`;
    vacio.textContent = "Sin grupos.";
    grilla.appendChild(vacio);
  }

  seccion.appendChild(grilla);
  return seccion;
}

function construir(
  params: ExportarParams,
  lemaUrl: string | null,
  logoUrl: string | null
): HTMLElement {
  const contenedor = document.createElement("div");
  contenedor.style.cssText =
    "background:#ffffff;padding:40px 48px;font-family:Arial,Helvetica,sans-serif;" +
    "width:1024px;box-sizing:border-box;";

  contenedor.appendChild(construirCabecera(params.titulo, lemaUrl, logoUrl));

  if ("mixtos" in params) {
    contenedor.appendChild(construirSeccion(params.mixtos, 3));
  } else {
    contenedor.appendChild(construirSeccion(params.hombres, 3));
    contenedor.appendChild(construirSeccion(params.mujeres, 3));
  }
  return contenedor;
}

/** Genera y descarga una imagen PNG con los grupos de oración. */
export async function exportarOracionImagen(params: ExportarParams): Promise<void> {
  const [lemaUrl, logoUrl] = await Promise.all([
    comoDataUrl(LEMA_SRC),
    comoDataUrl(LOGO_SRC),
  ]);

  const nodo = construir(params, lemaUrl, logoUrl);
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

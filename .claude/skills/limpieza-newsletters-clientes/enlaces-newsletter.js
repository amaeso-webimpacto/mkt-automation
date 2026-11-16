// Extrae los enlaces de una newsletter (HTML o texto con formato Markdown) y elige uno de contenido.
const { esEnlaceBloqueado } = require("./clic-newsletter.js");

const PROTOCOLO_ENLACE = "https:";
const TEXTO_NO_ES_CONTENIDO = /(cancelar|dar(se)? de baja|\bbaja\b|unsubscribe|suscripci|preferenc|privacidad|privacy|pol[ií]tica|legal|cookies|t[eé]rminos|terms|navegador|browser|versi[oó]n online|ver online|online version|logo|instagram|facebook|tiktok|youtube|twitter|pinterest|linkedin|whatsapp|s[ií]guenos|escr[ií]benos|contacto|\bapp\b|descarga|mailto)/i;
const TEXTO_PREFERIDO = /(comprar|compra|shop|\bver\b|descubr|buy|colecci|nuev|new|oferta|rebaja|black friday|explor)/i;
const RUTA_PREFERIDA = /\/(products?|collections?|productos?|colecci[oó]n)/i;
const PUNTOS_RUTA = 3;
const PUNTOS_TEXTO_PREFERIDO = 2;
const PUNTOS_CON_TEXTO = 1;
const ENTIDADES_HTML = { "&amp;": "&", "&quot;": '"', "&#39;": "'", "&lt;": "<", "&gt;": ">" };

function decodificarEntidades(texto) {
  return texto.replace(/&(amp|quot|#39|lt|gt);/g, (entidad) => ENTIDADES_HTML[entidad]);
}

function textoVisible(htmlInterior) {
  const alternativos = [...htmlInterior.matchAll(/\balt=(["'])(.*?)\1/gi)].map((m) => m[2]).join(" ");
  const visible = htmlInterior.replace(/<[^>]*>/g, " ");
  return decodificarEntidades(`${visible} ${alternativos}`).replace(/\s+/g, " ").trim();
}

function enlacesDeHtml(html) {
  const anclas = html.matchAll(/<a\b[^>]*?\bhref=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi);
  return [...anclas].map((m) => ({ texto: textoVisible(m[3]), url: decodificarEntidades(m[2].trim()) }));
}

function enlacesDeTexto(texto) {
  const markdown = [...texto.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\s*\)/g)].map((m) => ({ texto: m[1].trim(), url: m[2] }));
  const conParentesis = [...texto.matchAll(/([^\n()[\]]{1,80})\n?\((https?:\/\/[^\s)]+)\s*\)/g)].map((m) => ({ texto: m[1].trim(), url: m[2] }));
  return [...markdown, ...conParentesis];
}

// Los enlaces del HTML son los que la plataforma envuelve con su rastreador de clics; los del texto plano suelen ir directos
// y un clic en ellos no cuenta como clic del correo. El texto solo se usa si el correo no tiene HTML.
function extraerEnlaces(partes) {
  const html = partes.filter((p) => p.tipo === "text/html").flatMap((p) => enlacesDeHtml(p.texto));
  if (html.length > 0) return html;
  return partes.filter((p) => p.tipo === "text/plain").flatMap((p) => enlacesDeTexto(p.texto));
}

function esCandidato({ texto, url }) {
  let direccion;
  try {
    direccion = new URL(url);
  } catch {
    return false;
  }
  return direccion.protocol === PROTOCOLO_ENLACE && !TEXTO_NO_ES_CONTENIDO.test(texto) && !esEnlaceBloqueado(direccion);
}

function puntuar({ texto, url }) {
  const ruta = new URL(url).pathname;
  return (RUTA_PREFERIDA.test(ruta) ? PUNTOS_RUTA : 0) + (TEXTO_PREFERIDO.test(texto) ? PUNTOS_TEXTO_PREFERIDO : 0) + (texto.length > 1 ? PUNTOS_CON_TEXTO : 0);
}

// Devuelve el candidato con más puntos (el primero si empatan) o null si no hay ninguno.
function elegirEnlace(enlaces) {
  const candidatos = enlaces.filter(esCandidato);
  return candidatos.reduce((mejor, actual) => (mejor === null || puntuar(actual) > puntuar(mejor) ? actual : mejor), null);
}

module.exports = { extraerEnlaces, elegirEnlace };

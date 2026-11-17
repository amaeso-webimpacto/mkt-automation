// Lectura mínima de un correo MIME: cabeceras y partes de texto o HTML ya decodificadas.
const { parsearCabeceras } = require("./verificar-plataforma.js");
const { decodificarQuotedPrintable } = require("./codificacion.js");

const FIN_CABECERAS = /\r?\n\r?\n/;
const CHARSET_POR_DEFECTO = "utf-8";

function cuerpoDe(mime) {
  const corte = mime.search(FIN_CABECERAS);
  return corte < 0 ? "" : mime.slice(corte).replace(FIN_CABECERAS, "");
}

function bytesDeParte(cuerpo, codificacion) {
  if (codificacion === "quoted-printable") return decodificarQuotedPrintable(cuerpo);
  if (codificacion === "base64") return Buffer.from(cuerpo.replace(/\s+/g, ""), "base64");
  return Buffer.from(cuerpo, "latin1");
}

function textoDeParte(bytes, tipoContenido) {
  const charset = /charset="?([^";\s]+)/i.exec(tipoContenido)?.[1] ?? CHARSET_POR_DEFECTO;
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder(CHARSET_POR_DEFECTO).decode(bytes);
  }
}

// Devuelve las partes text/html y text/plain, recorriendo los multipart anidados.
function partesDeTexto(mime) {
  const cabeceras = parsearCabeceras(mime);
  const tipoContenido = cabeceras.get("content-type")?.[0] ?? "text/plain";
  const cuerpo = cuerpoDe(mime);
  if (/^multipart\//i.test(tipoContenido)) {
    const limite = /boundary="?([^";\s]+)"?/i.exec(tipoContenido)?.[1];
    if (!limite) return [];
    return cuerpo.split("--" + limite).slice(1).filter((p) => !p.startsWith("--")).flatMap((p) => partesDeTexto(p.replace(/^\r?\n/, "")));
  }
  const tipo = tipoContenido.split(";")[0].trim().toLowerCase();
  if (tipo !== "text/html" && tipo !== "text/plain") return [];
  const codificacion = (cabeceras.get("content-transfer-encoding")?.[0] ?? "7bit").trim().toLowerCase();
  return [{ tipo, texto: textoDeParte(bytesDeParte(cuerpo, codificacion), tipoContenido) }];
}

module.exports = { partesDeTexto, decodificarQuotedPrintable };

// Decodifica el asunto de un correo (RFC 2047) y detecta los asuntos de envíos de prueba.
const { decodificarQuotedPrintable } = require("./codificacion.js");

const PALABRA_CODIFICADA = /=\?([^?\s]+)\?([bBqQ])\?([^?\s]*)\?=/g;
const PALABRAS_CODIFICADAS_CONTIGUAS = /(\?=)\s+(=\?)/g;
const CHARSET_POR_DEFECTO = "utf-8";
const MARCAS_DE_TEST = /\b(test|prueba|vista previa|preview)\b/;

function bytesDePalabra(codificacion, texto) {
  if (codificacion.toUpperCase() === "B") return Buffer.from(texto, "base64");
  return decodificarQuotedPrintable(texto.replace(/_/g, " "));
}

function decodificarBytes(bytes, charset) {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder(CHARSET_POR_DEFECTO).decode(bytes);
  }
}

function decodificarAsunto(asunto) {
  return asunto
    .replace(PALABRAS_CODIFICADAS_CONTIGUAS, "$1$2")
    .replace(PALABRA_CODIFICADA, (_, charset, codificacion, texto) => decodificarBytes(bytesDePalabra(codificacion, texto), charset));
}

function sinAcentos(texto) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "");
}

// Coincide por palabra completa, sin distinguir mayúsculas ni acentos, para que «latest» o «contest» no cuenten como test.
function esAsuntoDeTest(asunto) {
  return MARCAS_DE_TEST.test(sinAcentos(decodificarAsunto(asunto)).toLowerCase());
}

module.exports = { decodificarAsunto, esAsuntoDeTest };

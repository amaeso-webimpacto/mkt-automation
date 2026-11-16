// Procesa un correo de la bandeja: comprueba remitente y plataforma, elige un enlace de contenido y hace clic.
// Uso: node procesar-correo.js [--solo-validar] <fichero> [<fichero> ...]
// Cada fichero es la respuesta RAW de get_message guardada en disco (JSON con el campo raw) o el MIME en texto.
// Con --solo-validar elige y valida el enlace pero no lo abre. Salida: una línea JSON por correo, con el id de mensaje e hilo, sin URLs ni direcciones de destinatarios.
const fs = require("node:fs");
const path = require("node:path");
const { verificarPlataforma, parsearCabeceras, decodificarRaw } = require("./verificar-plataforma.js");
const { partesDeTexto } = require("./mime.js");
const { extraerEnlaces, elegirEnlace } = require("./enlaces-newsletter.js");
const { motivoDeRechazo, abrirEnlace } = require("./clic-newsletter.js");

const FICHERO_REMITENTES = path.join(__dirname, "remitentes.json");
const DIRECCION_EN_CABECERA = /<([^>]+)>|([^\s<>]+@[^\s<>]+)/;

function cargarRemitentes() {
  return JSON.parse(fs.readFileSync(FICHERO_REMITENTES, "utf8")).confirmados;
}

function direccionRemitente(cabeceras) {
  const coincidencia = DIRECCION_EN_CABECERA.exec(cabeceras.get("from")?.[0] ?? "");
  return (coincidencia?.[1] ?? coincidencia?.[2] ?? "").trim().toLowerCase();
}

function rechazo(motivo, extra = {}) {
  return { ok: false, motivo, ...extra };
}

function comprobarOrigen(mime, remitentes) {
  const permitido = remitentes.find((r) => r.remitente.toLowerCase() === direccionRemitente(parsearCabeceras(mime)));
  if (!permitido) return { error: rechazo("remitente-no-listado") };
  const verificacion = verificarPlataforma(mime);
  if (!verificacion.ok) return { error: rechazo(verificacion.motivo, { cliente: permitido.cliente }) };
  if (verificacion.plataforma !== permitido.plataforma) return { error: rechazo("plataforma-distinta-de-la-esperada", { cliente: permitido.cliente }) };
  return { cliente: permitido.cliente, plataforma: verificacion.plataforma };
}

async function procesarCorreo(mime, { soloValidar = false, remitentes = cargarRemitentes(), validar = motivoDeRechazo, abrir = abrirEnlace } = {}) {
  const origen = comprobarOrigen(mime, remitentes);
  if (origen.error) return origen.error;
  const base = { cliente: origen.cliente, plataforma: origen.plataforma };
  const enlace = elegirEnlace(extraerEnlaces(partesDeTexto(mime)));
  if (!enlace) return rechazo("sin-enlace-de-contenido", base);
  const motivo = await validar(enlace.url);
  const datosEnlace = { texto: enlace.texto.slice(0, 40), host: new URL(enlace.url).hostname };
  if (motivo) return rechazo(motivo, { ...base, ...datosEnlace });
  if (soloValidar) return { ok: true, ...base, ...datosEnlace, clic: "no-realizado-por-modo-prueba" };
  const clic = await abrir(enlace.url);
  return { ok: clic.ok, ...base, ...datosEnlace, clic };
}

function identificadores(contenido) {
  try {
    const { id, threadId } = JSON.parse(contenido);
    return { mensaje: id, hilo: threadId };
  } catch {
    return {};
  }
}

async function procesarFichero(ruta, opciones) {
  try {
    const contenido = fs.readFileSync(ruta, "utf8");
    return { ...identificadores(contenido), ...(await procesarCorreo(decodificarRaw(contenido), opciones)) };
  } catch (error) {
    return rechazo("error-al-procesar", { detalle: error.name });
  }
}

async function main() {
  const soloValidar = process.argv.includes("--solo-validar");
  const rutas = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (rutas.length === 0) {
    console.error("Uso: node procesar-correo.js [--solo-validar] <fichero> [<fichero> ...]");
    process.exit(1);
  }
  const resultados = [];
  for (const ruta of rutas) resultados.push(await procesarFichero(ruta, { soloValidar }));
  resultados.forEach((resultado) => console.log(JSON.stringify(resultado)));
  process.exit(resultados.every((r) => r.ok) ? 0 : 1);
}

if (require.main === module) main();

module.exports = { procesarCorreo, direccionRemitente };

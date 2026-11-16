// Valida y abre un enlace de una newsletter de cliente, siguiendo las redirecciones del rastreador.
// Uso: node clic-newsletter.js [--solo-validar] '<url>'
// Salida: una línea JSON con { ok, motivo, estado, saltos, host }. Código 0 si hizo clic, 1 si falló, 2 si el enlace se rechaza.
const dns = require("node:dns").promises;
const net = require("node:net");

const MAX_SALTOS = 5;
const TIMEOUT_MS = 15000;
const USER_AGENT = "Mozilla/5.0 (compatible; limpieza-newsletters)";
const PROTOCOLO_PERMITIDO = "https:";

// Palabras que delatan enlaces de baja, preferencias o legales. «baja» se compara como palabra completa para no rechazar «rebajas».
const PALABRAS_BLOQUEADAS = [
  /unsubscribe/i,
  /unsub(?![a-z])/i,
  /opt-?out/i,
  /kmail-lists/i,
  /manage[-_]?(preferences|subscription)/i,
  /preferenc/i,
  /(^|[^a-z])(baja|desuscri|cancelar-suscripcion|darse-de-baja)([^a-z]|$)/i,
  /privacy|privacidad|cookies|aviso-legal|terminos|terms/i,
];

function esIpv4Privada(ip) {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return a >= 224;
}

function esIpPrivada(ip) {
  if (net.isIPv4(ip)) return esIpv4Privada(ip);
  const normalizada = ip.toLowerCase();
  if (normalizada.startsWith("::ffff:")) return esIpv4Privada(normalizada.slice(7));
  return normalizada === "::1" || normalizada === "::" || /^f[cd]/.test(normalizada) || /^fe[89ab]/.test(normalizada);
}

function esEnlaceBloqueado(url) {
  return PALABRAS_BLOQUEADAS.some((patron) => patron.test(decodeURIComponent(url.pathname + url.search)) || patron.test(url.hostname));
}

function parsearUrl(texto) {
  try {
    return new URL(texto);
  } catch {
    return null;
  }
}

// Devuelve el motivo de rechazo, o null si la URL es segura de abrir. Resuelve el DNS para evitar destinos internos.
async function motivoDeRechazo(texto) {
  const url = parsearUrl(texto);
  if (!url) return "url-invalida";
  if (url.protocol !== PROTOCOLO_PERMITIDO) return "protocolo-no-permitido";
  if (url.username || url.password) return "credenciales-en-url";
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, ""))) return "ip-directa";
  if (esEnlaceBloqueado(url)) return "enlace-de-baja-o-legal";
  let direcciones;
  try {
    direcciones = await dns.lookup(url.hostname, { all: true });
  } catch {
    return "dns-no-resuelve";
  }
  return direcciones.some((d) => esIpPrivada(d.address)) ? "destino-interno" : null;
}

async function abrirEnlace(urlInicial) {
  let actual = urlInicial;
  for (let salto = 0; salto <= MAX_SALTOS; salto++) {
    const motivo = await motivoDeRechazo(actual);
    if (motivo) return { ok: false, motivo, saltos: salto, host: parsearUrl(actual)?.hostname ?? null };
    const respuesta = await fetch(actual, {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const destino = respuesta.headers.get("location");
    const esRedireccion = respuesta.status >= 300 && respuesta.status < 400 && destino;
    if (!esRedireccion) {
      return { ok: respuesta.status < 400, motivo: respuesta.status < 400 ? null : "respuesta-de-error", estado: respuesta.status, saltos: salto, host: new URL(actual).hostname };
    }
    actual = new URL(destino, actual).toString();
  }
  return { ok: false, motivo: "demasiadas-redirecciones", saltos: MAX_SALTOS, host: parsearUrl(urlInicial)?.hostname ?? null };
}

async function main() {
  const soloValidar = process.argv.includes("--solo-validar");
  const url = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!url) {
    console.error("Uso: node clic-newsletter.js [--solo-validar] '<url>'");
    process.exit(2);
  }
  const motivo = await motivoDeRechazo(url);
  if (motivo) {
    console.log(JSON.stringify({ ok: false, motivo, host: parsearUrl(url)?.hostname ?? null }));
    process.exit(2);
  }
  if (soloValidar) {
    console.log(JSON.stringify({ ok: true, motivo: null, host: parsearUrl(url).hostname }));
    return;
  }
  try {
    const resultado = await abrirEnlace(url);
    console.log(JSON.stringify(resultado));
    process.exit(resultado.ok ? 0 : 1);
  } catch (error) {
    console.log(JSON.stringify({ ok: false, motivo: "error-de-red", detalle: error.name }));
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { esEnlaceBloqueado, esIpPrivada, motivoDeRechazo, abrirEnlace };

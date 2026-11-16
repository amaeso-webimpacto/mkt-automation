// Comprueba por las cabeceras que un correo es una campaña enviada desde Klaviyo, iCommkt o HubSpot.
// Uso: node verificar-plataforma.js <fichero>
// El fichero es la respuesta RAW de get_message guardada en disco (JSON con el campo raw) o el MIME en texto.
// Salida: una línea JSON con { ok, plataforma, senales, motivo }, sin direcciones de personas. Código 0 si se verifica y 3 si no.
// Connectif no tiene firma verificada: sus correos nunca se dan por buenos hasta añadir una muestra real.
const fs = require("node:fs");

const FIN_CABECERAS = /\r?\n\r?\n/;
const DOMINIO = /@?([a-z0-9][a-z0-9.-]+\.[a-z]{2,})/g;

const PLATAFORMAS = [
  {
    id: "klaviyo",
    senales: [
      { nombre: "cabecera X-Kmail-Account", cumple: (c) => c.has("x-kmail-account") },
      { nombre: "firma DKIM de klaviyomail.com", cumple: (c) => dominiosDkim(c).some((d) => d.endsWith("klaviyomail.com")) },
      { nombre: "baja en kmail-lists.com", cumple: (c) => dominiosBaja(c).some((d) => d.endsWith("kmail-lists.com")) },
    ],
  },
  {
    id: "icommkt",
    senales: [
      { nombre: "firma DKIM de icommarketing.com", cumple: (c) => dominiosDkim(c).some((d) => d.endsWith("icommarketing.com")) },
      { nombre: "baja en icmkt.com", cumple: (c) => dominiosBaja(c).some((d) => d.endsWith("icmkt.com")) },
    ],
  },
  {
    id: "hubspot",
    senales: [{ nombre: "cabecera X-HS-Cid", cumple: (c) => c.has("x-hs-cid") }],
  },
];

function decodificarRaw(contenido) {
  const texto = contenido.trim();
  if (!texto.startsWith("{")) return texto;
  return Buffer.from(JSON.parse(texto).raw, "base64url").toString("latin1");
}

function parsearCabeceras(mime) {
  const bloque = mime.split(FIN_CABECERAS)[0].replace(/\r?\n[ \t]+/g, " ");
  const cabeceras = new Map();
  for (const linea of bloque.split(/\r?\n/)) {
    const corte = linea.indexOf(":");
    if (corte < 1) continue;
    const nombre = linea.slice(0, corte).trim().toLowerCase();
    cabeceras.set(nombre, [...(cabeceras.get(nombre) ?? []), linea.slice(corte + 1).trim()]);
  }
  return cabeceras;
}

function dominiosDkim(cabeceras) {
  return (cabeceras.get("dkim-signature") ?? []).flatMap((valor) => [...valor.matchAll(/\bd=([^;\s]+)/gi)].map((m) => m[1].toLowerCase()));
}

function dominiosBaja(cabeceras) {
  return (cabeceras.get("list-unsubscribe") ?? []).flatMap((valor) => [...valor.toLowerCase().matchAll(DOMINIO)].map((m) => m[1]));
}

// Un correo de conversación o sin cabecera de baja de lista no es una campaña masiva.
function motivoDeRechazoGeneral(cabeceras) {
  if (!cabeceras.has("list-unsubscribe")) return "sin-cabecera-de-baja-de-lista";
  if (cabeceras.has("in-reply-to") || cabeceras.has("references")) return "forma-parte-de-una-conversacion";
  return null;
}

function verificarPlataforma(mime) {
  const cabeceras = parsearCabeceras(mime);
  const rechazo = motivoDeRechazoGeneral(cabeceras);
  if (rechazo) return { ok: false, plataforma: null, senales: [], motivo: rechazo };
  for (const plataforma of PLATAFORMAS) {
    const senales = plataforma.senales.filter((s) => s.cumple(cabeceras)).map((s) => s.nombre);
    if (senales.length > 0) return { ok: true, plataforma: plataforma.id, senales, motivo: null };
  }
  return { ok: false, plataforma: null, senales: [], motivo: "plataforma-no-reconocida" };
}

function main() {
  const ruta = process.argv[2];
  if (!ruta) {
    console.error("Uso: node verificar-plataforma.js <fichero>");
    process.exit(3);
  }
  let resultado;
  try {
    resultado = verificarPlataforma(decodificarRaw(fs.readFileSync(ruta, "utf8")));
  } catch (error) {
    resultado = { ok: false, plataforma: null, senales: [], motivo: "fichero-ilegible" };
  }
  console.log(JSON.stringify(resultado));
  process.exit(resultado.ok ? 0 : 3);
}

if (require.main === module) main();

module.exports = { verificarPlataforma, parsearCabeceras };

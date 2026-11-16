// Hook PreToolUse de la skill: bloquea toda herramienta MCP salvo las de lectura de Gmail y la papelera.
// Lee de la entrada estándar el JSON del hook. Código 2 bloquea la llamada y el motivo sale por la salida de errores.
const HERRAMIENTAS_PERMITIDAS = new Set(["search_threads", "get_thread", "get_message", "trash_thread"]);
const PREFIJO_MCP = "mcp__";
const CODIGO_BLOQUEO = 2;

function nombreDeHerramienta(nombreCompleto) {
  return nombreCompleto.split("__").pop();
}

function esConectorDeGmail(nombreCompleto) {
  return /gmail/i.test(nombreCompleto.split("__")[1] ?? "");
}

// Devuelve el motivo del bloqueo o null si la herramienta se puede usar.
function motivoDeBloqueo(nombreCompleto) {
  if (!nombreCompleto.startsWith(PREFIJO_MCP)) return null;
  if (!esConectorDeGmail(nombreCompleto)) return "Esta tarea solo puede usar Gmail.";
  if (!HERRAMIENTAS_PERMITIDAS.has(nombreDeHerramienta(nombreCompleto))) return "Esta tarea solo puede buscar, leer y mandar hilos a la papelera. No envía, responde, reenvía, crea borradores ni etiqueta.";
  return null;
}

function leerEntrada() {
  return new Promise((resolve) => {
    let texto = "";
    process.stdin.on("data", (trozo) => { texto += trozo; });
    process.stdin.on("end", () => resolve(texto));
  });
}

async function main() {
  let entrada;
  try {
    entrada = JSON.parse(await leerEntrada());
  } catch {
    console.error("Entrada del hook ilegible: se bloquea por precaución.");
    process.exit(CODIGO_BLOQUEO);
  }
  const motivo = motivoDeBloqueo(String(entrada.tool_name ?? ""));
  if (motivo) {
    console.error(motivo);
    process.exit(CODIGO_BLOQUEO);
  }
}

if (require.main === module) main();

module.exports = { motivoDeBloqueo };

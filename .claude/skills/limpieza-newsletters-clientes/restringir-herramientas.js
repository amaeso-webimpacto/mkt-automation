// Hook PreToolUse de la skill: bloquea toda herramienta MCP salvo las de Gmail (buscar, leer y papelera) y la lectura de tareas programadas.
// Lee de la entrada estándar el JSON del hook. Código 2 bloquea la llamada y el motivo sale por la salida de errores.
const HERRAMIENTAS_GMAIL = new Set(["search_threads", "get_thread", "get_message", "trash_thread"]);
const HERRAMIENTAS_TAREAS = new Set(["list_triggers", "get_trigger"]);
const PREFIJO_MCP = "mcp__";
const CODIGO_BLOQUEO = 2;
const MOTIVO_CONECTOR = "Esta tarea solo puede usar Gmail y leer las tareas programadas.";
const MOTIVO_GMAIL = "Esta tarea solo puede buscar, leer y mandar hilos a la papelera. No envía, responde, reenvía, crea borradores ni etiqueta.";
const MOTIVO_TAREAS = "Esta tarea solo puede leer las tareas programadas (list_triggers y get_trigger). No las crea, cambia, borra ni lanza.";

function nombreDeHerramienta(nombreCompleto) {
  return nombreCompleto.split("__").pop();
}

function conectorDe(nombreCompleto) {
  return nombreCompleto.split("__")[1] ?? "";
}

function esConectorDeGmail(nombreCompleto) {
  return /gmail/i.test(conectorDe(nombreCompleto));
}

function esConectorDeTareas(nombreCompleto) {
  return /^claude[-_]code[-_]remote$/i.test(conectorDe(nombreCompleto));
}

// Devuelve el motivo del bloqueo o null si la herramienta se puede usar.
function motivoDeBloqueo(nombreCompleto) {
  if (!nombreCompleto.startsWith(PREFIJO_MCP)) return null;
  const herramienta = nombreDeHerramienta(nombreCompleto);
  if (esConectorDeGmail(nombreCompleto)) return HERRAMIENTAS_GMAIL.has(herramienta) ? null : MOTIVO_GMAIL;
  if (esConectorDeTareas(nombreCompleto)) return HERRAMIENTAS_TAREAS.has(herramienta) ? null : MOTIVO_TAREAS;
  return MOTIVO_CONECTOR;
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

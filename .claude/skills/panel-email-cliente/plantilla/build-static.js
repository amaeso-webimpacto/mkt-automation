// Genera la versión estática (un único HTML, solo lectura) de un panel para pegar en Google Sites.
// Uso: node build-static.js "<Nombre cliente>" <carpeta de datos> <salida.html>
// La carpeta de datos es la que deja ArtifactData con out_dir: months/<AAAA-MM>.json y config/cliente.json.
// Excepción a la regla de CSS/JS en ficheros aparte: «Insertar código» de Google Sites admite un solo bloque.
const fs = require("fs");
const path = require("path");

const [clientName, dataDir, outFile] = process.argv.slice(2);
if (!clientName || !dataDir || !outFile) {
  console.error('Uso: node build-static.js "<Nombre cliente>" <carpeta de datos> <salida.html>');
  process.exit(1);
}

const here = __dirname;
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const monthsDir = path.join(dataDir, "months");
const months = fs.readdirSync(monthsDir).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort().map((f) => readJson(path.join(monthsDir, f)));
const configFile = path.join(dataDir, "config", "cliente.json");
const config = fs.existsSync(configFile) ? readJson(configFile) : { flujos: {}, estrategia: {} };
if (!months.length) { console.error("No hay meses en " + monthsDir); process.exit(1); }

const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
const payload = JSON.stringify({ config, months, generatedAt: today }).replace(/</g, "\\u003c");
const logo = "data:image/png;base64," + fs.readFileSync(path.join(here, "logo_d2c.png")).toString("base64");
const css = fs.readFileSync(path.join(here, "panel.css"), "utf8");
const js = fs.readFileSync(path.join(here, "panel.js"), "utf8").replace(/<\/script/gi, "<\\/script");

let body = fs.readFileSync(path.join(here, "index.html"), "utf8").split("{{CLIENTE}}").join(clientName);
body = body.replace('<link rel="stylesheet" href="panel.css">', "<style>\n" + css + "\n</style>");
body = body.replace('src="logo_d2c.png"', 'src="' + logo + '"');
body = body.replace('<script src="panel.js"></script>', '<script type="application/json" id="panel-data">' + payload + "</script>\n<script>\n" + js + "\n</script>");
for (const marker of ["panel.css", "logo_d2c.png", 'src="panel.js"']) {
  if (body.includes(marker)) { console.error("No se ha podido incrustar " + marker); process.exit(1); }
}

const html = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n' + body + "\n</body>\n</html>\n";
fs.writeFileSync(outFile, html);
console.log("Escrito " + outFile + " (" + Math.round(html.length / 1024) + " KB, " + months.length + " meses)");

// Crea o regenera el index.html de un cliente a partir de la plantilla.
// Uso: node nuevo-cliente.js <carpeta> "<Nombre cliente>" [carpeta destino] [--force]
// --force sobrescribe un index.html existente: hay que usarlo cada vez que cambia la plantilla, antes de volver a publicar.
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2).filter((a) => a !== "--force");
const force = process.argv.includes("--force");
const [slug, clientName, destDir] = args;
if (!slug || !/^[a-z0-9-]+$/.test(slug) || !clientName) {
  console.error('Uso: node nuevo-cliente.js <carpeta en minúsculas> "<Nombre cliente>"');
  process.exit(1);
}
const dir = path.resolve(destDir || ".", slug);
if (!force && fs.existsSync(path.join(dir, "index.html"))) { console.error("Ya existe " + dir + "/index.html. Usa --force para regenerarlo desde la plantilla."); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8").split("{{CLIENTE}}").join(clientName);
fs.writeFileSync(path.join(dir, "index.html"), html);
console.log("Creado " + path.join(dir, "index.html"));

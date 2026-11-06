// Crea la carpeta de un cliente nuevo con su index.html a partir de la plantilla.
// Uso: node nuevo-cliente.js <carpeta> "<Nombre cliente>"   (p. ej. node nuevo-cliente.js macami "Macami")
const fs = require("fs");
const path = require("path");

const [slug, clientName] = process.argv.slice(2);
if (!slug || !/^[a-z0-9-]+$/.test(slug) || !clientName) {
  console.error('Uso: node nuevo-cliente.js <carpeta en minúsculas> "<Nombre cliente>"');
  process.exit(1);
}
const dir = path.join(__dirname, "..", slug);
if (fs.existsSync(path.join(dir, "index.html"))) { console.error("Ya existe " + dir + "/index.html"); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8").split("{{CLIENTE}}").join(clientName);
fs.writeFileSync(path.join(dir, "index.html"), html);
console.log("Creado " + path.join(dir, "index.html"));

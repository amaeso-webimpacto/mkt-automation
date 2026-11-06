// Añade las audiencias de envío (audiences.json, extraído de Klaviyo) a las campañas de out/months
// y marca como B2B las campañas enviadas a audiencias de mayoristas. Uso: node merge-audiences.js
const fs = require("fs");
const path = require("path");
const B2B_AUDIENCE_RX = /mayorista|\bb2b\b/i;
const DAY_MS = 86400000;
const dir = path.join(__dirname, "out", "months");
const pool = JSON.parse(fs.readFileSync(path.join(__dirname, "audiences.json")));
const used = new Set();

const dayDiff = (a, b) => Math.abs(new Date(a) - new Date(b)) / DAY_MS;
function findAudience(c) {
  const free = pool.map((a, i) => ({ a, i })).filter(({ i }) => !used.has(i));
  let candidates = free.filter(({ a }) => a.name.trim() === c.name.trim() && dayDiff(a.date, c.date) <= 1);
  if (!candidates.length) candidates = free.filter(({ a }) => a.date === c.date && a.recipients === c.recipients);
  if (!candidates.length) return null;
  candidates.sort((x, y) => Math.abs(x.a.recipients - c.recipients) - Math.abs(y.a.recipients - c.recipients) || dayDiff(x.a.date, c.date) - dayDiff(y.a.date, c.date));
  used.add(candidates[0].i);
  return candidates[0].a;
}

const unmatched = [];
const newlyB2b = [];
fs.readdirSync(dir).sort().forEach((f) => {
  const file = path.join(dir, f);
  const month = JSON.parse(fs.readFileSync(file));
  month.campaigns.forEach((c) => {
    const a = findAudience(c);
    if (!a) { unmatched.push(c.date + " " + c.name); return; }
    c.audiences = { included: a.included, excluded: a.excluded };
    if (!c.b2b && a.included.some((n) => B2B_AUDIENCE_RX.test(n))) { c.b2b = true; newlyB2b.push(c.date + " " + c.name + " → " + a.included.join(" + ")); }
  });
  fs.writeFileSync(file, JSON.stringify(month));
});
console.log("Sin audiencia:", unmatched.length, JSON.stringify(unmatched));
console.log("Nuevas B2B por audiencia:", JSON.stringify(newlyB2b, null, 1));
console.log("Audiencias de Klaviyo sin campaña en el panel:", JSON.stringify(pool.filter((a, i) => !used.has(i)).map((a) => a.date + " " + a.name)));

// Genera los documentos de la base de datos del panel de Genuins (out/) a partir de los envíos de iCommkt.
// Uso: node build.js <carpeta con raw/AAAA-MM.json>
// Cada raw/AAAA-MM.json: { month, sends: [{ delivery_id, name, newsletter, scheduled_at, sends, effective, unique_opens, unique_clicks, unsubscribed, purchases }] }
const fs = require("fs");
const path = require("path");
const BASE = require("./base.js");

const LANG_SUFFIX_RX = /\s+(ES|EN|ENG|DE|FR|IT|PT)\.?$/i;
const B2B_NAME_RX = /\b(?:bsb|b2b)\b|mayorista|\[seguimiento\]/i;
const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const SOURCE_ICOMMKT = "iCommkt (envíos por idioma agrupados por newsletter; tasas sobre efectivos; sin revenue)";

const rawDir = process.argv[2];
if (!rawDir) { console.error("Uso: node build.js <carpeta con raw/>"); process.exit(1); }
const OUT_DIR = path.join(__dirname, "out");

const labelForKey = (key) => MONTH_NAMES[+key.slice(5, 7) - 1] + " " + key.slice(2, 4);
const round = (v, d) => +v.toFixed(d);
const ratio = (num, den) => den ? round(num / den, 5) : 0;

/** Nombre de la newsletter sin el sufijo de idioma ni espacios sobrantes. */
const VARIANT_SUFFIX_RX = /[\s-]+(?:copia|v\d+|tarde|mañana)$/i;
/** Nombre del envío sin espacios repetidos ni sufijos de variante («-copia», «v2», «Tarde»). */
function cleanName(send) {
  let name = String(send.name || send.newsletter || "").replace(/\s+/g, " ").trim();
  while (VARIANT_SUFFIX_RX.test(name)) name = name.replace(VARIANT_SUFFIX_RX, "").trim();
  return name;
}
function baseName(send) {
  return cleanName(send).replace(LANG_SUFFIX_RX, "").trim();
}
const languageOf = (send) => ((cleanName(send).match(LANG_SUFFIX_RX) || [])[1] || "?").toUpperCase();
const dateOf = (send) => String(send.scheduled_at || send.sent_at || "").slice(0, 10);

/** Agrupa los envíos de un mes por newsletter (nombre base + fecha). */
function groupSends(sends) {
  const groups = new Map();
  sends.filter((s) => s.effective > 0).forEach((s) => {
    const key = baseName(s) + "|" + dateOf(s);
    if (!groups.has(key)) groups.set(key, { name: baseName(s), date: dateOf(s), parts: [] });
    groups.get(key).parts.push(s);
  });
  return Array.from(groups.values()).sort((a, b) => a.date < b.date ? -1 : 1);
}

function toCampaign(group, index) {
  const total = (k) => group.parts.reduce((a, s) => a + (s[k] || 0), 0);
  const effective = total("effective");
  const opens = total("unique_opens");
  const clicks = total("unique_clicks");
  const purchases = total("purchases");
  return {
    id: "c" + index, name: group.name, date: group.date,
    recipients: effective, sends: total("sends"),
    or: ratio(opens, effective), ctr: ratio(clicks, effective), ctor: ratio(clicks, opens),
    cr: ratio(purchases, effective), unsub: ratio(total("unsubscribed"), effective),
    conv: purchases, rev: null, aov: null, rpr: null,
    b2b: B2B_NAME_RX.test(group.name),
    audiences: { included: group.parts.map(languageOf), excluded: [] }
  };
}

/** Enviados (suma de segmentos) de la última newsletter B2C del mes. */
function lastSends(campaigns) {
  const b2c = campaigns.filter((c) => !c.b2b);
  return b2c.length ? b2c[b2c.length - 1].sends : null;
}

function buildMonth(key, raw) {
  const campaigns = groupSends(raw.sends).map(toCampaign);
  const bbdd = Object.assign({ total: null, activos: null, suscritos: null }, BASE.BBDD[key] || {}, { enviamos: lastSends(campaigns) });
  const text = BASE.MONTH_TEXT[key] || {};
  return {
    key, label: labelForKey(key),
    shopify: { rev: null, ventaNeta: null },
    bbdd,
    campaigns: campaigns.map(({ sends, ...c }) => c),
    flows: {},
    contexto: text.contexto || "",
    analisis: text.analisis || { resumen: "", funciono: [], corregir: [], acciones: [], propuestas: [] },
    fuentes: { klaviyo: SOURCE_ICOMMKT, shopify: "Pendiente: conector de Shopify no conectado a la tienda de Genuins", bbdd: BASE.SOURCE_BBDD },
    actualizacion: { fecha: BASE.UPDATED_AT, modo: "manual" },
    updatedAt: BASE.UPDATED_AT
  };
}

fs.mkdirSync(path.join(OUT_DIR, "months"), { recursive: true });
const files = fs.readdirSync(rawDir).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort();
files.forEach((f) => {
  const key = f.slice(0, 7);
  const doc = buildMonth(key, JSON.parse(fs.readFileSync(path.join(rawDir, f), "utf8")));
  fs.writeFileSync(path.join(OUT_DIR, "months", key + ".json"), JSON.stringify(doc, null, 1));
  const b2c = doc.campaigns.filter((c) => !c.b2b);
  console.log(key, "newsletters:", doc.campaigns.length, "b2b:", doc.campaigns.length - b2c.length, "efectivos:", b2c.reduce((a, c) => a + c.recipients, 0), "enviamos:", doc.bbdd.enviamos);
});
fs.writeFileSync(path.join(OUT_DIR, "config.json"), JSON.stringify(BASE.CONFIG, null, 1));

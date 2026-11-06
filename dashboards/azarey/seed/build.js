// Genera los documentos de la base de datos del panel (out/*.json) a partir del histórico y de octubre 2026.
// Uso: node build.js
const fs = require("fs");
const path = require("path");
const H = require("./history.js");
const OCT = require("./october-2026.js");
const TXT = require("./analysis.js");

const OUT_DIR = path.join(__dirname, "out");
const B2B_NAME_RX = /\b(?:bsb|b2b)\b|mayorista|\[seguimiento\]/i;
const OCT_KEY = "2026-10";
const OCT_LABEL = "Oct 26";
const SOURCE_KLAVIYO = "Klaviyo (Placed Order de Shopify, canal email)";

const toCampaign = (row, index) => ({
  id: "c" + index,
  name: row[0], date: row[1], recipients: row[2], or: row[3], ctr: row[4], ctor: row[5],
  cr: row[6], unsub: row[7], conv: row[8], rev: row[9], aov: row[10], rpr: row[11],
  b2b: row.length > 12 ? row[12] : (B2B_NAME_RX.test(row[0]) || TXT.B2B_BY_AUDIENCE.includes(row[0]))
});

const toFlowEntry = (d) => ({ r: d[0], o: d[1], c: d[2], p: d[3], rev: d[4] });

function emptyAnalysis() {
  return { resumen: "", funciono: [], corregir: [], acciones: [], propuestas: [] };
}

function buildMonth(key, label, shopifyRev, ventaNeta, bbddRow, campaigns, flows, sources) {
  const text = TXT.MONTH_TEXT[key] || {};
  return {
    key, label,
    shopify: { rev: shopifyRev, ventaNeta },
    bbdd: bbddRow,
    campaigns, flows,
    contexto: text.contexto || "",
    analisis: text.analisis || emptyAnalysis(),
    fuentes: sources,
    updatedAt: "2026-11-06T00:00:00Z"
  };
}

const allCampaigns = H.CAMPAIGNS.map(toCampaign);
const octCampaigns = OCT.CAMPAIGNS.map((row, i) => toCampaign(row, allCampaigns.length + i));
const historySources = {
  klaviyo: "Histórico del panel anterior (" + SOURCE_KLAVIYO + ")",
  shopify: "Histórico del panel anterior (Shopify, atribución último clic no directo)",
  bbdd: "Hoja «KPI's Azarey»"
};

const docs = H.MONTHS.map(([key, label, shopifyRev, ventaNeta]) => {
  const b = H.BBDD[key];
  const flows = {};
  Object.entries(H.FLOWS).forEach(([id, f]) => { if (f.m[key]) flows[id] = toFlowEntry(f.m[key]); });
  return buildMonth(key, label, shopifyRev, ventaNeta,
    b ? { total: b[0], activos: b[1], suscritos: b[2], enviamos: b[3] } : null,
    allCampaigns.filter((c) => c.date.slice(0, 7) === key), flows, historySources);
});

const octFlows = {};
Object.entries(OCT.FLOWS).forEach(([id, d]) => { octFlows[id] = toFlowEntry(d); });
docs.push(buildMonth(OCT_KEY, OCT_LABEL, null, null, OCT.BBDD, octCampaigns, octFlows, {
  klaviyo: "Conector Klaviyo-Azarey-todo, 06/11/2026 (" + SOURCE_KLAVIYO + ")",
  shopify: "Pendiente. Venta neta: dato manual. Ingresos canal email: Shopify de Azarey, último clic no directo (sin conectar)",
  bbdd: "Klaviyo el día de actualización (06/11/2026). Activos: recuento de perfiles de correo. Enviamos: última campaña B2C del mes (27.10)"
}));

const CRITERIOS = {
  b2b: "Fuera de todos los informes las campañas B2B o de mayoristas: nombre con B2B, BSB, MAYORISTA o [Seguimiento], o audiencias con MAYORISTA.",
  ventaNeta: "Dato manual que facilita el cliente cada mes.",
  shopify: "Ingresos del canal email en Shopify con atribución de último clic no directo.",
  activos: "Recuento de perfiles de correo de Klaviyo (Audiencia > Segmentos; perfiles activos de facturación) el día de la actualización.",
  enviamos: "Destinatarios de la última campaña B2C enviada en el mes.",
  totalSuscritos: "Perfiles totales y perfiles con consentimiento de email en Klaviyo el día de la actualización."
};

const flowNames = {};
Object.entries(H.FLOWS).forEach(([id, f]) => { flowNames[id] = { name: f.name, status: "live" }; });

const config = {
  cliente: "Azarey",
  plataforma: "Klaviyo",
  tienda: "Shopify",
  sociedad: "D2C eCommerce",
  flujos: flowNames,
  estrategia: TXT.ESTRATEGIA,
  criterios: CRITERIOS,
  updatedAt: "2026-11-06T00:00:00Z"
};

fs.mkdirSync(path.join(OUT_DIR, "months"), { recursive: true });
docs.forEach((d) => fs.writeFileSync(path.join(OUT_DIR, "months", d.key + ".json"), JSON.stringify(d)));
fs.writeFileSync(path.join(OUT_DIR, "config.json"), JSON.stringify(config));
const b2bCount = [...allCampaigns, ...octCampaigns].filter((c) => c.b2b).length;
console.log(docs.length + " meses, " + (allCampaigns.length + octCampaigns.length) + " campañas (" + b2bCount + " B2B)");

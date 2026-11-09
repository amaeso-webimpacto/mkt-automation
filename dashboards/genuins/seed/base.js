// Datos fijos de la carga inicial del panel de Genuins: configuración, BBDD por mes y textos de análisis.
const UPDATED_AT = "2026-11-09T12:00:00Z";

/** Contactos activos a cierre de mes (get_contacts_overview.monthly_active) y total de octubre 2026. */
const ACTIVE_BY_MONTH = {
  "2025-11": 130828, "2025-12": 130559, "2026-01": 130439, "2026-02": 130268, "2026-03": 130314, "2026-04": 130822,
  "2026-05": 131950, "2026-06": 134849, "2026-07": 136092, "2026-08": 136380, "2026-09": 136715, "2026-10": 136762
};
const BBDD = Object.fromEntries(Object.entries(ACTIVE_BY_MONTH).map(([key, activos]) => [key, { activos }]));
BBDD["2026-10"].total = 194767;

const SOURCE_BBDD = "iCommkt: activos a cierre de mes; total de octubre a 09/11/2026. Suscritos (Masterdata_total): manual. Enviamos: suma de los segmentos de la última newsletter B2C.";

const CONFIG = {
  cliente: "Genuins",
  plataforma: "iCommkt",
  tienda: "Shopify",
  sociedad: "D2C eCommerce",
  conector: "icomm-genuins",
  flujos: {},
  flujosPorCrear: [],
  estrategia: { campanas: [], flujos: [], segmentacion: [], captacion: [] },
  criterios: "Ingresos solo de Shopify (último clic no directo). Suscritos: segmentos Masterdata_total. Enviamos: suma de los segmentos de la última newsletter B2C. Activos: contactos activos de iCommkt. Flujos de Shopify e iCommkt, a mano.",
  notaFuentes: "Fuentes: iCommkt (envíos, aperturas, clics, bajas y compras por envío; tasas sobre efectivos) y Shopify (ingresos del canal, último clic no directo). Venta neta facilitada por el cliente. Activos y total: contactos de iCommkt. Suscritos: segmentos Masterdata_total. Enviamos: suma de los segmentos de la última newsletter B2C del mes, todas sus versiones por idioma. Flujos de Shopify e iCommkt cargados a mano. Campañas B2B y de mayoristas excluidas de todos los cálculos."
};

const MONTH_TEXT = {};

module.exports = { UPDATED_AT, BBDD, SOURCE_BBDD, CONFIG, MONTH_TEXT };

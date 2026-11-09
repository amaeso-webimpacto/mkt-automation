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

const MONTH_TEXT = {
  "2026-10": {
    contexto: "",
    analisis: {
      resumen: "Octubre cierra con 9 newsletters en cuatro idiomas y 290.378 emails efectivos, un 9 % menos que septiembre (320.314). La apertura se mantiene en el 38,9 % (40,6 % en septiembre) y las bajas bajan al 0,18 %, pero el clic cae al 0,63 % (0,95 % en septiembre) y las compras que iCommkt atribuye pasan de 315 a 244. Las tres newsletters de Mid Season 30 % concentran 112 de esas compras. Los ingresos del canal están pendientes de Shopify.",
      funciono: [
        "**La promoción es lo que convierte.** Mid Season 30 % (23.10, 25.10 y 28.10) suma 112 compras de 244, el 46 % del mes, con el 34 % de los envíos.",
        "**Venta privada Final del 04.10 abre el mes con 40 compras** y un CTR del 0,92 %, el segundo mejor de octubre.",
        "**Mid Season 30 % del 23.10 tiene el mejor CTR del mes**, un 1,05 %, con 41 compras.",
        "**Las bajas siguen bajando:** 0,18 % en octubre frente al 0,22 % de septiembre y el 0,29 % de julio."
      ],
      corregir: [
        "**El clic de las newsletters de producto es bajo.** Animal print (0,35 %), Riva Vegan Greige (0,37 %) y Riva Velour (0,44 %) quedan por debajo de la mitad del CTR de las promocionales.",
        "**El tercer envío de Mid Season en seis días abre peor.** El del 28.10 se queda en un 35,2 % de apertura, el más bajo del mes, y 12 compras.",
        "**New collection zuecos temporada (23.10) aparece en iCommkt con 0 enviados** en sus cuatro idiomas. Hay que comprobar en la plataforma si se canceló o si se envió con otro nombre.",
        "**Faltan los datos de Shopify, la venta neta, los suscritos de Masterdata_total y los flujos**, así que no se puede medir todavía el peso del canal en la venta."
      ],
      acciones: [
        "**Newsletters del mes enviadas en ES, ENG, DE y FR** desde las campañas «Oct 2026» de cada idioma."
      ],
      propuestas: [
        "Black Friday con aviso previo | Noviembre | En noviembre de 2025 «¡TODA LA WEB AL 25%!» (131 compras) y «Regalo 11.11» (141) fueron las newsletters con más compras. Repetir el esquema de aviso previo y oferta abierta a toda la web.",
        "Producto con incentivo o selección | Noviembre | Las newsletters de producto sin oferta tienen un CTR por debajo del 0,45 %. Probar a añadirles un bloque de tallas disponibles o un beneficio (envío, regalo) y comparar el clic.",
        "Limitar la secuencia promocional a dos envíos | Próxima promoción | En Mid Season, el tercer envío abrió 3,5 puntos por debajo del segundo. Probar a cerrar con un recordatorio solo a quienes abrieron y no compraron."
      ]
    }
  }
};

module.exports = { UPDATED_AT, BBDD, SOURCE_BBDD, CONFIG, MONTH_TEXT };

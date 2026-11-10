/* Panel de email marketing por cliente: lee los meses de la base de datos del artefacto,
   calcula KPIs (excluyendo campañas B2B) y permite editar datos, análisis y contexto. */
(function () {
  "use strict";

  /* ---------- Constantes ---------- */
  const MONTHS_COLLECTION = "months";
  const CONFIG_DOC = "config/cliente";
  const LOAD_TIMEOUT_MS = 10000;
  const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const MONTH_KEY_RX = /^\d{4}-(0[1-9]|1[0-2])$/;
  const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
  const MAX_TEXT = 4000;
  const MAX_NAME = 200;
  const MAX_AUDIENCES = 600;
  const MIN_RELEVANT_RECIPIENTS = 1000;
  const TOP_CAMPAIGNS = 4;
  const MIN_RELEVANT_FLOW_RECIPIENTS = 200;
  const UNSUB_LIMIT = 0.003;
  const BILLING_PLATFORM = "klaviyo";
  const BILLING_LEVELS = [[0.95, "bad", "Al límite del plan"], [0.8, "warn", "Cerca del límite del plan"], [0, "ok", ""]];
  const BILLING_ITEMS = [["perfiles", "Perfiles activos usados", "perfiles"], ["emails", "Emails enviados", "emails"]];
  const CADENCE = { high: 16, low: 8 };
  const THRESHOLDS = {
    campOr: [0.35, 0.25], campCtr: [0.025, 0.015], campCr: [0.0015, 0.001],
    flowOr: [0.40, 0.30], flowCtr: [0.05, 0.03], flowCr: [0.02, 0.005]
  };
  const HEALTH = { rpr: [2, 40], or: [0.45, 25], cr: [0.04, 25], vol: [500, 10] };
  const HEALTH_LEVELS = [[70, "good", "Excelente"], [50, "ok", "Sano"], [30, "warn", "A vigilar"], [0, "bad", "Crítico"]];
  const PRIORITY_CLASS = { alta: "bad", media: "warn", baja: "ok" };
  const DEFAULT_FLOWS_TO_CREATE = ["Sunset de inactivos para proteger la entregabilidad", "Segunda compra a 20-30 días", "Aviso de bajada de precio para quien vio o añadió al carrito"];
  const STRATEGY_BLOCKS = [["campanas", "Campañas"], ["flujos", "Flujos"], ["segmentacion", "Segmentación"], ["captacion", "Captación"]];

  /* ---------- Estado ---------- */
  const state = {
    months: [], config: null, loaded: false,
    fromKey: null, toKey: null, preset: "all",
    flowSel: null, tab: "general", search: "",
    analysisKey: null, editKey: null,
    canWrite: true, db: null
  };
  const charts = {};

  /* ---------- Utilidades puras ---------- */
  const $ = (name) => document.querySelector('[data-js="' + name + '"]');
  const sum = (arr, fn) => arr.reduce((a, x) => a + (fn ? fn(x) : x), 0);
  const isNum = (v) => typeof v === "number" && isFinite(v);
  /** Suma solo los valores numéricos; null si ninguno lo es (dato que la plataforma no da). */
  const sumKnown = (arr, fn) => { const vals = arr.map(fn).filter(isNum); return vals.length ? sum(vals) : null; };
  const addKnown = (a, b) => isNum(a) || isNum(b) ? (a || 0) + (b || 0) : null;
  const fRpr = (v) => isNum(v) ? v.toLocaleString("es-ES", { maximumFractionDigits: 3 }) + " €" : "—";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const nf0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fInt = (v) => isNum(v) ? nf0.format(v) : "—";
  const fEur = (v) => isNum(v) ? nf0.format(v) + " €" : "—";
  const fEur2 = (v) => isNum(v) ? nf2.format(v) + " €" : "—";
  const fPct = (v, d) => isNum(v) ? (v * 100).toLocaleString("es-ES", { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }) + " %" : "—";
  const fK = (v) => !isNum(v) ? "—" : (Math.abs(v) >= 1000 ? (v / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + "k" : nf0.format(v));
  const labelForKey = (key) => MONTH_NAMES[+key.slice(5, 7) - 1] + " " + key.slice(2, 4);
  const prevYearKey = (key) => (+key.slice(0, 4) - 1) + key.slice(4);
  const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  function setPath(obj, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] = o[k] && typeof o[k] === "object" ? o[k] : {}), obj);
    target[last] = value;
  }
  function semClass(value, [good, warn]) {
    if (!isNum(value)) return "";
    if (value >= good) return "sem sem--good";
    return value >= warn ? "sem sem--warn" : "sem sem--bad";
  }
  /** Variación frente a una referencia. `lowerIsBetter` invierte el color (p. ej. tasa de baja). */
  function deltaChip(cur, prev, isRate, suffix, lowerIsBetter) {
    if (!isNum(cur) || !isNum(prev) || prev === 0) return "";
    const rel = (cur - prev) / Math.abs(prev);
    const better = lowerIsBetter ? rel < 0 : rel > 0;
    const dir = Math.abs(rel) < 0.005 ? "flat" : better ? "up" : "down";
    const sign = rel >= 0 ? "+" : "−";
    let txt = sign + Math.abs(rel * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %";
    if (isRate) txt += " (" + (cur - prev >= 0 ? "+" : "−") + Math.abs((cur - prev) * 100).toLocaleString("es-ES", { maximumFractionDigits: 2 }) + " pp)";
    return '<span class="delta delta--' + dir + '">' + txt + (suffix ? " " + esc(suffix) : "") + "</span>";
  }
  function splitRecommendation(line) {
    const [title, priority, detail] = String(line).split("|").map((s) => s.trim());
    return { title: title || "", priority: (priority || "").toLowerCase(), detail: detail || "" };
  }

  /* ---------- Agregados ---------- */
  const b2cCampaigns = (m) => (m.campaigns || []).filter((c) => !c.b2b);
  const b2bCampaigns = (m) => (m.campaigns || []).filter((c) => c.b2b);

  function aggregateCampaigns(list) {
    const r = sum(list, (c) => c.recipients || 0);
    if (!list.length || !r) return null;
    const opens = sum(list, (c) => c.recipients * (c.or || 0));
    const clicks = sum(list, (c) => c.recipients * (c.ctr || 0));
    const conv = sum(list, (c) => c.conv || 0);
    const rev = sumKnown(list, (c) => c.rev);
    const unsubs = sum(list, (c) => c.recipients * (c.unsub || 0));
    return { n: list.length, recipients: r, or: opens / r, ctr: clicks / r, ctor: opens ? clicks / opens : 0, cr: conv / r, unsub: unsubs / r, conv, rev, aov: isNum(rev) && conv ? rev / conv : null, rpr: isNum(rev) ? rev / r : null };
  }

  function aggregateFlowEntries(entries) {
    const r = sum(entries, (d) => d.r || 0);
    if (!entries.length || !r) return null;
    const opens = sum(entries, (d) => d.r * (d.o || 0));
    const clicks = sum(entries, (d) => d.r * (d.c || 0));
    const conv = sum(entries, (d) => d.p || 0);
    const rev = sumKnown(entries, (d) => d.rev);
    return { recipients: r, or: opens / r, ctr: clicks / r, ctor: opens ? clicks / opens : 0, cr: conv / r, conv, rev, aov: isNum(rev) && conv ? rev / conv : null, rpr: isNum(rev) ? rev / r : null, months: entries.length };
  }

  /** Nombre de la plataforma de email del cliente (config/cliente.plataforma). */
  const plat = () => (state.config && state.config.plataforma) || "Klaviyo";
  const splitNote = (t) => t.shopifySplitEstimated ? "Estimado: reparto proporcional a la atribución de " + plat() : "Reparto de Shopify";
  const flowIds = () => Object.keys((state.config && state.config.flujos) || {});
  const flowName = (id) => (state.config && state.config.flujos[id] && state.config.flujos[id].name) || id;
  const selectedFlowIds = () => flowIds().filter((id) => !state.flowSel || state.flowSel.has(id));

  function flowAggFor(months, id) {
    return aggregateFlowEntries(months.map((m) => (m.flows || {})[id]).filter(Boolean));
  }
  function flowsAggFor(months, ids) {
    const entries = [];
    months.forEach((m) => ids.forEach((id) => { const d = (m.flows || {})[id]; if (d) entries.push(d); }));
    return aggregateFlowEntries(entries);
  }
  function flowsWithAgg(months) {
    return selectedFlowIds().map((id) => ({ id, name: flowName(id), agg: flowAggFor(months, id) })).filter((x) => x.agg);
  }

  /**
   * Ingresos de Shopify (último clic no directo) repartidos entre campañas y flujos.
   * Si el mes trae el reparto real (shopify.revCampanas / revFlujos) se usa; si no, se estima
   * en proporción a la atribución de la plataforma de email (campañas y flujos sobre su total).
   */
  function shopifySplit(shop, campRev, flowRev) {
    if (isNum(shop.revCampanas) && isNum(shop.revFlujos)) return { camp: shop.revCampanas, flow: shop.revFlujos, estimated: false };
    const total = campRev + flowRev;
    if (!isNum(shop.rev) || !total) return { camp: null, flow: null, estimated: false };
    return { camp: shop.rev * campRev / total, flow: shop.rev * flowRev / total, estimated: true };
  }

  function monthSummary(m) {
    const camp = aggregateCampaigns(b2cCampaigns(m));
    const flows = flowsAggFor([m], flowIds());
    const campRev = camp ? camp.rev : null;
    const flowRev = flows ? flows.rev : null;
    const shop = m.shopify || {};
    const split = shopifySplit(shop, campRev, flowRev);
    return {
      key: m.key, label: m.label || labelForKey(m.key), camp, flows,
      shopifyCamp: split.camp, shopifyFlow: split.flow, shopifySplitEstimated: split.estimated,
      campSends: camp ? camp.recipients : 0, flowSends: flows ? flows.recipients : 0,
      campRev, flowRev, klaviyoRev: addKnown(campRev, flowRev),
      shopifyRev: isNum(shop.rev) ? shop.rev : null,
      ventaNeta: isNum(shop.ventaNeta) ? shop.ventaNeta : null,
      peso: isNum(shop.rev) && isNum(shop.ventaNeta) && shop.ventaNeta ? shop.rev / shop.ventaNeta : null,
      bbdd: m.bbdd ? bbddOf(m) : null
    };
  }

  /** Destinatarios de la última campaña B2C del mes: criterio de «Enviamos» cuando no hay dato guardado. */
  function lastCampaignRecipients(m) {
    const list = b2cCampaigns(m).slice().sort((a, b) => a.date < b.date ? -1 : 1);
    return list.length ? list[list.length - 1].recipients : null;
  }
  /** BBDD del mes con «Enviamos» calculado si falta; `enviamosCalculado` indica que no es dato guardado. */
  function bbddOf(m) {
    const b = Object.assign({ total: null, activos: null, suscritos: null, enviamos: null }, m.bbdd || {});
    const calculated = !isNum(b.enviamos);
    if (calculated) b.enviamos = lastCampaignRecipients(m);
    return Object.assign(b, { enviamosCalculado: calculated && isNum(b.enviamos) });
  }

  const hasBilling = () => plat().toLowerCase() === BILLING_PLATFORM;
  const fDay = (iso) => DATE_RX.test(iso || "") ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "";
  /** Consumo de un concepto del plan; `pct` es null si falta el consumo o el límite. */
  function planUsage(item) {
    const u = item || {};
    const pct = isNum(u.usados) && isNum(u.max) && u.max > 0 ? u.usados / u.max : null;
    return { usados: isNum(u.usados) ? u.usados : null, max: isNum(u.max) ? u.max : null, pct };
  }
  /** Último mes de la lista con consumo del plan guardado, o null. */
  function lastBillingMonth(months) {
    const withData = months.filter((m) => m.facturacion && BILLING_ITEMS.some(([key]) => planUsage(m.facturacion[key]).usados != null));
    return withData.length ? withData[withData.length - 1] : null;
  }

  function rangeMonths() {
    const all = state.months;
    if (!all.length) return [];
    const from = state.fromKey || all[0].key;
    const to = state.toKey || all[all.length - 1].key;
    return all.filter((m) => m.key >= from && m.key <= to);
  }
  const findMonth = (key) => state.months.find((m) => m.key === key) || null;
  const rangeLabel = (months) => !months.length ? "" : months.length === 1 ? months[0].label : months[0].label + " – " + months[months.length - 1].label;

  function periodTotals(months) {
    const camps = [].concat(...months.map(b2cCampaigns));
    const camp = aggregateCampaigns(camps);
    const flows = flowsAggFor(months, selectedFlowIds());
    const withShop = months.filter((m) => m.shopify && isNum(m.shopify.rev));
    const shopifyRev = withShop.length ? sum(withShop, (m) => m.shopify.rev) : null;
    const ventaNeta = withShop.length ? sum(withShop, (m) => m.shopify.ventaNeta || 0) : null;
    const splits = months.map(monthSummary).filter((r) => r.shopifyCamp != null);
    return {
      camps, camp, flows, shopifyRev, ventaNeta, peso: shopifyRev != null && ventaNeta ? shopifyRev / ventaNeta : null, shopMonths: withShop.length,
      shopifyCamp: splits.length ? sum(splits, (r) => r.shopifyCamp) : null,
      shopifyFlow: splits.length ? sum(splits, (r) => r.shopifyFlow) : null,
      shopifySplitEstimated: splits.some((r) => r.shopifySplitEstimated)
    };
  }

  /* ---------- Gráficos ---------- */
  function palette() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    return { azul: v("--azul"), azul2: v("--azul-2"), claro: v("--azul-claro"), navy2: v("--navy-2"), suave: v("--azul-suave"), apagado: v("--apagado"), texto: v("--texto-2"), linea: v("--linea"), rojo: v("--rojo"), verde: v("--verde"), tarjeta: v("--tarjeta") };
  }
  function baseOptions(p, extra) {
    return Object.assign({
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: p.texto, usePointStyle: true, boxWidth: 8, font: { family: "Titillium Web", size: 12 } } },
        tooltip: { backgroundColor: "#011A4F", titleColor: "#FFFFFF", bodyColor: "#C9D6EA", padding: 10, cornerRadius: 8 }
      }
    }, extra || {});
  }
  function axis(p, opts) {
    return Object.assign({ grid: { color: p.linea }, ticks: { color: p.apagado, font: { family: "Titillium Web", size: 11 } }, border: { display: false } }, opts || {});
  }
  function drawChart(name, config) {
    if (charts[name]) { charts[name].destroy(); delete charts[name]; }
    const canvas = document.querySelector('[data-chart="' + name + '"]');
    if (!config || !canvas || typeof Chart === "undefined") return;
    charts[name] = new Chart(canvas, config);
  }
  const eurTick = (v) => fK(v) + " €";
  const tooltipEur = (ctx) => ctx.dataset.label + ": " + (ctx.parsed.y == null ? "—" : fEur2(ctx.parsed.y));

  /* ---------- Render: general ---------- */
  function renderSummary(months) {
    const t = periodTotals(months);
    const last = months[months.length - 1];
    const klaviyo = addKnown(t.camp && t.camp.rev, t.flows && t.flows.rev);
    const flowShare = klaviyo ? ((t.flows && t.flows.rev) || 0) / klaviyo : 0;
    const resumen = last.analisis && last.analisis.resumen;
    const contexto = last.contexto;
    $("summary").innerHTML =
      '<span class="highlight__eyebrow">Resumen · ' + esc(rangeLabel(months)) + "</span>" +
      "<p><strong>" + fInt(t.camp ? t.camp.n : 0) + " campañas B2C</strong> y <strong>" + fInt((t.flows ? t.flows.recipients : 0) + (t.camp ? t.camp.recipients : 0)) + " emails</strong> enviados." + (isNum(klaviyo) ? " Revenue atribuido por " + esc(plat()) + ": <strong>" + fEur(klaviyo) + "</strong>, el " + fPct(flowShare, 0) + " desde flujos." : " " + esc(plat()) + " no atribuye revenue: los ingresos del canal salen de Shopify.") +
      (t.peso != null ? " Peso del email en la venta neta según Shopify: <strong>" + fPct(t.peso) + "</strong>." : "") + "</p>" +
      (resumen ? "<p><strong>" + esc(last.label) + ":</strong> " + rich(resumen) + "</p>" : "") +
      (contexto ? "<p><strong>Contexto:</strong> " + rich(contexto) + "</p>" : "");
  }

  function kpiCard(o) {
    const pending = !isNum(o.value) && o.value !== 0 && typeof o.value !== "string";
    const valueHtml = pending ? '<span class="kpi__value kpi__value--pending">Pendiente</span>' : '<span class="kpi__value">' + esc(o.text != null ? o.text : o.value) + "</span>";
    return '<div class="kpi' + (o.navy ? " kpi--navy" : "") + '"><span class="kpi__label">' + esc(o.label) + "</span>" + valueHtml +
      (o.note ? '<span class="kpi__note">' + esc(o.note) + "</span>" : "") +
      (o.delta ? '<div class="kpi__delta">' + o.delta + "</div>" : "") +
      (o.src ? '<span class="kpi__src">' + esc(o.src) + "</span>" : "") + "</div>";
  }

  /** Meses del año anterior equivalentes al rango; vacío si alguno no tiene equivalente, para no comparar periodos de distinto tamaño. */
  function yoyMonths(months) {
    const prev = months.map((m) => findMonth(prevYearKey(m.key)));
    return prev.every(Boolean) ? prev : [];
  }
  const withPrevYear = (months) => months.filter((m) => findMonth(prevYearKey(m.key)));

  function renderGlobal(months) {
    const t = periodTotals(months);
    const prev = periodTotals(yoyMonths(months));
    const partial = t.shopMonths && t.shopMonths < months.length ? t.shopMonths + " de " + months.length + " meses con dato" : "Atribución último clic no directo";
    $("global-period").textContent = rangeLabel(months);
    $("global-kpis").innerHTML =
      kpiCard({ navy: true, label: "Ingresos canal email (Shopify)", value: t.shopifyRev, text: fEur(t.shopifyRev), note: partial, delta: deltaChip(t.shopifyRev, prev.shopifyRev, false, "vs año ant."), src: "Fuente: Shopify" }) +
      kpiCard({ label: "Campañas · Shopify", value: t.shopifyCamp, text: fEur(t.shopifyCamp), note: splitNote(t), delta: deltaChip(t.shopifyCamp, prev.shopifyCamp, false, "vs año ant."), src: "Fuente: Shopify" }) +
      kpiCard({ label: "Flujos · Shopify", value: t.shopifyFlow, text: fEur(t.shopifyFlow), note: splitNote(t), delta: deltaChip(t.shopifyFlow, prev.shopifyFlow, false, "vs año ant."), src: "Fuente: Shopify" }) +
      kpiCard({ label: "Venta neta", value: t.ventaNeta, text: fEur(t.ventaNeta), note: "Facturación de la tienda", delta: deltaChip(t.ventaNeta, prev.ventaNeta, false, "vs año ant."), src: "Fuente: Shopify" }) +
      kpiCard({ label: "Peso de venta del email", value: t.peso, text: fPct(t.peso), note: "Canal email sobre venta neta", delta: deltaChip(t.peso, prev.peso, true, "vs año ant."), src: "Fuente: Shopify" });

    const p = palette();
    const rows = months.map(monthSummary);
    drawChart("globalEvolution", {
      type: "bar",
      data: { labels: rows.map((r) => r.label), datasets: [
        { type: "line", label: "Peso de venta (%)", data: rows.map((r) => r.peso == null ? null : +(r.peso * 100).toFixed(2)), borderColor: p.navy2, backgroundColor: p.navy2, borderWidth: 2, tension: .3, yAxisID: "y1", pointRadius: 3, spanGaps: true, order: 1 },
        { label: "Email · flujos (€)", data: rows.map((r) => r.shopifyFlow), backgroundColor: p.navy2, stack: "email", order: 2 },
        { label: "Email · campañas (€)", data: rows.map((r) => r.shopifyCamp), backgroundColor: p.azul2, borderRadius: 4, stack: "email", order: 2 },
        { label: "Venta neta (€)", data: rows.map((r) => r.ventaNeta), backgroundColor: p.suave, borderRadius: 4, stack: "venta", order: 3 }
      ] },
      options: baseOptions(p, { scales: { x: axis(p, { stacked: true, grid: { display: false } }), y: axis(p, { stacked: true, ticks: { color: p.apagado, callback: eurTick } }), y1: axis(p, { position: "right", grid: { display: false }, ticks: { color: p.apagado, callback: (v) => v + " %" } }) },
        plugins: Object.assign(baseOptions(p).plugins, { tooltip: Object.assign({}, baseOptions(p).plugins.tooltip, { callbacks: { label: (c) => c.dataset.yAxisID === "y1" ? c.dataset.label + ": " + (c.parsed.y == null ? "—" : c.parsed.y.toLocaleString("es-ES") + " %") : tooltipEur(c) } }) }) })
    });
  }

  function renderBbdd(months) {
    const withData = months.filter((m) => m.bbdd).map((m) => Object.assign({}, m, { bbdd: bbddOf(m) }));
    const last = withData[withData.length - 1];
    const snap = last ? last.bbdd : {};
    const prevYear = last ? findMonth(prevYearKey(last.key)) : null;
    const prevSnap = prevYear && prevYear.bbdd ? bbddOf(prevYear) : {};
    $("bbdd-asof").textContent = last ? "Cierre de " + last.label : "Sin datos";
    $("bbdd-source").textContent = last && last.fuentes && last.fuentes.bbdd ? "Fuente: " + last.fuentes.bbdd : "";
    const item = (label, key, note, navy) => kpiCard({ navy, label, value: snap[key], text: fInt(snap[key]), note, delta: deltaChip(snap[key], prevSnap[key], false, "vs año ant.") });
    $("bbdd-kpis").innerHTML = item("BBDD total", "total", "Perfiles en la cuenta", true) + item("Activos", "activos", "Recuento de perfiles de correo") + item("Suscritos email", "suscritos", "Consentimiento de email") + item("Enviamos", "enviamos", snap.enviamosCalculado ? "Calculado: última campaña B2C del mes" : "Última campaña B2C del mes");

    const p = palette();
    const growth = withData.map((m, i) => {
      const prev = i > 0 ? withData[i - 1].bbdd.total : null;
      return isNum(prev) && isNum(m.bbdd.total) && prev ? +((m.bbdd.total - prev) / prev * 100).toFixed(2) : null;
    });
    const unsubs = withData.map((m) => { const a = aggregateCampaigns(b2cCampaigns(m)); return a ? +(a.unsub * 100).toFixed(3) : null; });
    drawChart("bbddEvolution", {
      type: "bar",
      data: { labels: withData.map((m) => m.label), datasets: [
        { type: "line", label: "Crecimiento BBDD total (%)", data: growth, borderColor: p.navy2, backgroundColor: p.navy2, borderWidth: 2, tension: .3, yAxisID: "y1", pointRadius: 3, spanGaps: true },
        { type: "line", label: "Bajas en campañas (%)", data: unsubs, borderColor: p.apagado, backgroundColor: p.apagado, borderDash: [5, 4], borderWidth: 2, tension: .3, yAxisID: "y1", pointRadius: 3, spanGaps: true },
        { label: "Suscritos", data: withData.map((m) => m.bbdd.suscritos), backgroundColor: p.azul2, borderRadius: 4 },
        { label: "Enviamos", data: withData.map((m) => m.bbdd.enviamos), backgroundColor: p.suave, borderRadius: 4 }
      ] },
      options: baseOptions(p, { scales: { x: axis(p, { grid: { display: false } }), y: axis(p, { ticks: { color: p.apagado, callback: fK } }), y1: axis(p, { position: "right", grid: { display: false }, ticks: { color: p.apagado, callback: (v) => v + " %" } }) } })
    });
  }

  function billingCard([key, label, unit], billing) {
    const u = planUsage(billing[key]);
    if (u.usados == null) return kpiCard({ label, value: null });
    const [, level, warning] = BILLING_LEVELS.find(([min]) => (u.pct || 0) >= min);
    const pctText = fPct(u.pct, 1);
    const usage = u.pct == null ? "" : '<div class="kpi__usage"><progress class="meter meter--' + level + '" max="1" value="' + Math.min(u.pct, 1) + '" aria-label="' + esc(label + ": " + pctText + " del plan") + '"></progress><span class="kpi__pct">' + esc(pctText) + "</span></div>";
    const note = u.max == null ? "Sin límite de plan guardado" : "de " + fInt(u.max) + " " + unit + " del plan" + (warning ? " · " + warning : "");
    return '<div class="kpi"><span class="kpi__label">' + esc(label) + '</span><span class="kpi__value">' + esc(fInt(u.usados)) + "</span>" + usage +
      '<span class="kpi__note">' + esc(note) + '</span><span class="kpi__src">Fuente: ' + esc(plat()) + "</span></div>";
  }

  function renderBilling(months) {
    const section = $("billing-section");
    section.hidden = !hasBilling();
    if (section.hidden) return;
    const m = lastBillingMonth(months);
    const billing = (m && m.facturacion) || {};
    const from = fDay(billing.periodoInicio), to = fDay(billing.periodoFin);
    $("billing-period").textContent = !m ? "Sin datos" : from && to ? "Periodo " + from + " – " + to : "Cierre de " + m.label;
    $("billing-asof").textContent = !m ? "Todavía no hay consumo del plan guardado en los meses seleccionados." : "Dato guardado con la actualización de " + m.label + (fDay(billing.fecha) ? ", a " + fDay(billing.fecha) : "") + ".";
    $("billing-kpis").innerHTML = BILLING_ITEMS.map((item) => billingCard(item, billing)).join("");
  }

  /** Numera las secciones visibles de un panel, para que no queden huecos cuando una se oculta. */
  function numberSections(panelName) {
    let n = 0;
    document.querySelectorAll('[data-panel="' + panelName + '"] > .section:not([hidden]) .section__title > .tag').forEach((tag) => { n += 1; tag.textContent = String(n).padStart(2, "0"); });
  }

  function renderPeriodKpis(months) {
    const t = periodTotals(months);
    const prev = periodTotals(yoyMonths(months));
    const c = t.camp || {};
    const pc = prev.camp || {};
    const f = t.flows || {};
    const pf = prev.flows || {};
    const vs = "vs año ant.";
    $("kpi-period").textContent = rangeLabel(months) + " · " + months.length + (months.length === 1 ? " mes" : " meses");
    $("period-kpis").innerHTML =
      kpiCard({ label: "Campañas B2C", value: c.n || 0, text: fInt(c.n || 0), note: fInt(c.recipients) + " envíos", delta: deltaChip(c.recipients, pc.recipients, false, "envíos " + vs) }) +
      kpiCard({ label: "Open rate campañas", value: c.or, text: fPct(c.or), delta: deltaChip(c.or, pc.or, true, vs) }) +
      kpiCard({ label: "CTR campañas", value: c.ctr, text: fPct(c.ctr), note: "CTOR " + fPct(c.ctor), delta: deltaChip(c.ctr, pc.ctr, true, vs) }) +
      kpiCard({ label: "Tasa de baja", value: c.unsub, text: fPct(c.unsub, 3), note: c.unsub > UNSUB_LIMIT ? "Por encima del 0,3 %" : "Por debajo del 0,3 %", delta: deltaChip(c.unsub, pc.unsub, true, vs, true) }) +
      kpiCard({ navy: true, label: "Revenue campañas", value: c.rev, text: fEur(c.rev), note: fInt(c.conv || 0) + " pedidos · AOV " + fEur(c.aov), delta: deltaChip(c.rev, pc.rev, false, vs), src: "Fuente: " + plat() }) +
      kpiCard({ label: "Revenue flujos", value: f.rev, text: fEur(f.rev), note: fInt(f.conv || 0) + " pedidos", delta: deltaChip(f.rev, pf.rev, false, vs), src: "Fuente: " + plat() }) +
      kpiCard({ label: "€ por destinatario (campañas)", value: c.rpr, text: fRpr(c.rpr), delta: deltaChip(c.rpr, pc.rpr, false, vs), src: "Fuente: " + plat() }) +
      kpiCard({ label: "€ por destinatario (flujos)", value: f.rpr, text: fEur2(f.rpr), delta: deltaChip(f.rpr, pf.rpr, false, vs), src: "Fuente: " + plat() });

    const p = palette();
    const rows = months.map(monthSummary);
    drawChart("sendsEvolution", {
      type: "bar",
      data: { labels: rows.map((r) => r.label), datasets: [
        { type: "line", label: "Open rate (%)", data: rows.map((r) => r.camp ? +(r.camp.or * 100).toFixed(2) : null), borderColor: p.navy2, backgroundColor: p.navy2, borderWidth: 2, tension: .3, yAxisID: "y1", pointRadius: 3 },
        { type: "line", label: "Campañas", data: rows.map((r) => r.camp ? r.camp.n : 0), borderColor: p.apagado, backgroundColor: p.apagado, borderDash: [5, 4], borderWidth: 2, tension: .3, yAxisID: "y2", pointRadius: 2 },
        { label: "Destinatarios", data: rows.map((r) => r.campSends), backgroundColor: p.azul2, borderRadius: 4 }
      ] },
      options: baseOptions(p, { scales: { x: axis(p, { grid: { display: false } }), y: axis(p, { ticks: { color: p.apagado, callback: fK } }), y1: axis(p, { position: "right", grid: { display: false }, ticks: { color: p.apagado, callback: (v) => v + " %" } }), y2: { display: false } } })
    });
    drawChart("revenueEvolution", {
      type: "bar",
      data: { labels: rows.map((r) => r.label), datasets: [
        { type: "line", label: "Pedidos", data: rows.map((r) => r.camp ? r.camp.conv : 0), borderColor: p.navy2, backgroundColor: p.navy2, borderWidth: 2, tension: .3, yAxisID: "y1", pointRadius: 3 },
        { type: "line", label: "AOV (€)", data: rows.map((r) => r.camp && isNum(r.camp.aov) ? +r.camp.aov.toFixed(2) : null), borderColor: p.apagado, backgroundColor: p.apagado, borderDash: [5, 4], borderWidth: 2, tension: .3, yAxisID: "y2", pointRadius: 2, spanGaps: true },
        { label: "Revenue campañas (€)", data: rows.map((r) => r.campRev), backgroundColor: p.azul2, borderRadius: 4 }
      ] },
      options: baseOptions(p, { scales: { x: axis(p, { grid: { display: false } }), y: axis(p, { ticks: { color: p.apagado, callback: eurTick } }), y1: axis(p, { position: "right", grid: { display: false }, ticks: { color: p.apagado } }), y2: { display: false } } })
    });
  }

  function renderHistory() {
    const rows = state.months.map(monthSummary);
    const p = palette();
    if (rows.length) $("hist-range").textContent = rows[0].label + " – " + rows[rows.length - 1].label;
    drawChart("histRevenue", {
      type: "bar",
      data: { labels: rows.map((r) => r.label), datasets: [
        { label: "Flujos (€)", data: rows.map((r) => r.flowRev), backgroundColor: p.navy2, stack: "rev" },
        { label: "Campañas (€)", data: rows.map((r) => r.campRev), backgroundColor: p.azul2, stack: "rev", borderRadius: 4 }
      ] },
      options: baseOptions(p, { scales: { x: axis(p, { stacked: true, grid: { display: false } }), y: axis(p, { stacked: true, ticks: { color: p.apagado, callback: eurTick } }) },
        plugins: Object.assign(baseOptions(p).plugins, { tooltip: Object.assign({}, baseOptions(p).plugins.tooltip, { callbacks: { label: tooltipEur, footer: (items) => "Total: " + fEur2(sum(items, (i) => i.parsed.y || 0)) } }) }) })
    });
    drawChart("histVolume", {
      type: "bar",
      data: { labels: rows.map((r) => r.label), datasets: [
        { label: "Flujos", data: rows.map((r) => r.flowSends), backgroundColor: p.navy2, stack: "v" },
        { label: "Campañas B2C", data: rows.map((r) => r.campSends), backgroundColor: p.azul2, stack: "v", borderRadius: 4 }
      ] },
      options: baseOptions(p, { scales: { x: axis(p, { stacked: true, grid: { display: false } }), y: axis(p, { stacked: true, ticks: { color: p.apagado, callback: fK } }) } })
    });
    $("hist-table").innerHTML = rows.slice().reverse().map((r) => {
      const sends = r.campSends + r.flowSends;
      const opens = (r.camp ? r.camp.or * r.campSends : 0) + (r.flows ? r.flows.or * r.flowSends : 0);
      const clicks = (r.camp ? r.camp.ctr * r.campSends : 0) + (r.flows ? r.flows.ctr * r.flowSends : 0);
      const b = r.bbdd || {};
      return "<tr><td>" + esc(r.label) + '</td><td class="num">' + fInt(b.total) + '</td><td class="num">' + fInt(b.activos) + '</td><td class="num">' + fInt(b.suscritos) +
        '</td><td class="num">' + fInt(sends) + '</td><td class="num">' + fPct(sends ? opens / sends : null) + '</td><td class="num">' + fPct(sends ? clicks / sends : null) +
        '</td><td class="num">' + fEur(r.flowRev) + '</td><td class="num">' + fEur(r.campRev) + '</td><td class="num"><strong>' + fEur(r.klaviyoRev) +
        '</strong></td><td class="num">' + fEur(r.shopifyRev) + '</td><td class="num">' + fEur(r.shopifyCamp) + '</td><td class="num">' + fEur(r.shopifyFlow) + '</td><td class="num">' + fEur(r.ventaNeta) + '</td><td class="num">' + fPct(r.peso) + "</td></tr>";
    }).join("");
  }

  /* ---------- Render: campañas ---------- */
  function renderCampaigns(months) {
    const t = periodTotals(months);
    const prev = periodTotals(yoyMonths(months));
    const c = t.camp;
    const b2b = [].concat(...months.map(b2bCampaigns));
    $("camp-count").textContent = (c ? c.n : 0) + " campañas · " + rangeLabel(months);
    $("camp-b2b-note").textContent = b2b.length + " campañas B2B (mayoristas) excluidas en el periodo, marcadas en «Editar datos».";
    if (!c) {
      $("camp-kpis").innerHTML = '<p class="note">No hay campañas B2C en el periodo.</p>';
      $("top-camps").innerHTML = ""; $("camp-table").innerHTML = "";
      drawChart("campOrCtr", null); drawChart("campRevenue", null);
      return;
    }
    const pc = prev.camp || {};
    const vs = "vs año ant.";
    $("camp-kpis").innerHTML =
      kpiCard({ label: "Open rate", value: c.or, text: fPct(c.or), note: fInt(c.recipients) + " envíos", delta: deltaChip(c.or, pc.or, true, vs) }) +
      kpiCard({ label: "CTR", value: c.ctr, text: fPct(c.ctr), note: "CTOR " + fPct(c.ctor), delta: deltaChip(c.ctr, pc.ctr, true, vs) }) +
      kpiCard({ label: "Conversión", value: c.cr, text: fPct(c.cr, 3), note: fInt(c.conv) + " pedidos", delta: deltaChip(c.cr, pc.cr, true, vs) }) +
      kpiCard({ label: "Tasa de baja", value: c.unsub, text: fPct(c.unsub, 3), delta: deltaChip(c.unsub, pc.unsub, true, vs, true) }) +
      kpiCard({ navy: true, label: "Revenue", value: c.rev, text: fEur(c.rev), note: "AOV " + fEur(c.aov), delta: deltaChip(c.rev, pc.rev, false, vs), src: "Fuente: " + plat() }) +
      kpiCard({ label: "Revenue · Shopify", value: t.shopifyCamp, text: fEur(t.shopifyCamp), note: splitNote(t), delta: deltaChip(t.shopifyCamp, prev.shopifyCamp, false, vs), src: "Fuente: Shopify" }) +
      kpiCard({ label: "€ por destinatario", value: c.rpr, text: c.rpr.toLocaleString("es-ES", { maximumFractionDigits: 3 }) + " €", delta: deltaChip(c.rpr, pc.rpr, false, vs) });

    const camps = t.camps.slice().sort((a, b) => a.date < b.date ? -1 : 1);
    $("top-camps").innerHTML = topCampsHtml(camps);

    const p = palette();
    const labels = camps.map((x) => x.name + " · " + x.date.slice(5));
    const tickOpts = { color: p.apagado, autoSkip: true, maxTicksLimit: 30, maxRotation: 70, minRotation: 50, font: { size: 9 } };
    drawChart("campOrCtr", {
      type: "bar",
      data: { labels, datasets: [
        { label: "Open rate (%)", data: camps.map((x) => +(x.or * 100).toFixed(2)), backgroundColor: p.azul2, yAxisID: "y" },
        { label: "CTR (%)", data: camps.map((x) => +(x.ctr * 100).toFixed(2)), backgroundColor: p.navy2, yAxisID: "y1" }
      ] },
      options: baseOptions(p, { scales: { x: axis(p, { grid: { display: false }, ticks: tickOpts }), y: axis(p, { beginAtZero: true, ticks: { color: p.apagado, callback: (v) => v + " %" } }), y1: axis(p, { position: "right", beginAtZero: true, grid: { display: false }, ticks: { color: p.apagado, callback: (v) => v + " %" } }) } })
    });
    drawChart("campRevenue", {
      type: "bar",
      data: { labels, datasets: [{ label: "Revenue (€)", data: camps.map((x) => x.rev), backgroundColor: p.azul2, borderRadius: 3 }] },
      options: baseOptions(p, { plugins: Object.assign(baseOptions(p).plugins, { legend: { display: false }, tooltip: Object.assign({}, baseOptions(p).plugins.tooltip, { callbacks: { label: tooltipEur } }) }), scales: { x: axis(p, { grid: { display: false }, ticks: tickOpts }), y: axis(p, { beginAtZero: true, ticks: { color: p.apagado, callback: eurTick } }) } })
    });
    renderCampaignTable(camps);
  }
  /** Las cuatro campañas B2C con más revenue de la lista, como tarjetas. */
  function topCampsHtml(camps) {
    const top = camps.filter((x) => x.rev > 0).sort((a, b) => b.rev - a.rev).slice(0, TOP_CAMPAIGNS);
    if (!top.length) return '<p class="note">Sin campañas con revenue en el periodo.</p>';
    return top.map((x, i) =>
      '<article class="top"><span class="top__rank">' + (i + 1) + '</span><h3 class="top__name">' + esc(x.name) + '</h3><span class="top__date">' + esc(x.date) + "</span>" + audienceLine(x) + subjectLine(x) + '<dl class="top__stats">' +
      stat("Revenue", fEur(x.rev)) + stat("Pedidos", fInt(x.conv)) + stat("€/dest.", (x.rpr || 0).toLocaleString("es-ES", { maximumFractionDigits: 3 })) +
      stat("OR", fPct(x.or, 1)) + stat("CTOR", fPct(x.ctor, 1)) + stat("Bajas", fPct(x.unsub, 2)) + "</dl></article>").join("");
  }

  function subjectLine(c) {
    return c.subject ? '<p class="top__aud"><b>Asunto:</b> ' + esc(c.subject) + "</p>" : '<p class="top__aud">Asunto sin registrar</p>';
  }

  /**
   * Periodo con el que comparar el rango: el mismo periodo del año anterior si hay datos de todos sus meses;
   * si no, los meses inmediatamente anteriores con la misma duración.
   */
  function comparisonPeriod(months) {
    const sameMonthsLastYear = yoyMonths(months);
    if (sameMonthsLastYear.length) return { kind: "Año anterior", months: sameMonthsLastYear };
    const first = state.months.indexOf(months[0]);
    const prev = first >= months.length ? state.months.slice(first - months.length, first) : [];
    return prev.length ? { kind: "Periodo anterior", months: prev } : { kind: "", months: [] };
  }

  function renderYoyTops(months) {
    const cmp = comparisonPeriod(months);
    $("yoy-tops-cur-title").textContent = "Periodo seleccionado · " + rangeLabel(months);
    $("yoy-tops-cur").innerHTML = topCampsHtml([].concat(...months.map(b2cCampaigns)));
    if (!cmp.months.length) {
      $("yoy-tops-prev-title").textContent = "Sin periodo con el que comparar";
      $("yoy-tops-prev").innerHTML = '<p class="note">No hay meses anteriores con datos.</p>';
      return;
    }
    $("yoy-tops-prev-title").textContent = cmp.kind + " · " + rangeLabel(cmp.months);
    $("yoy-tops-prev").innerHTML = topCampsHtml([].concat(...cmp.months.map(b2cCampaigns)));
  }

  function audienceLine(c) {
    const aud = c.audiences || {};
    const inc = aud.included || [];
    if (!inc.length) return '<p class="top__aud">Segmento de envío sin registrar</p>';
    const exc = aud.excluded || [];
    return '<p class="top__aud"><b>Enviado a:</b> ' + esc(inc.join(" + ")) + (exc.length ? "<br><b>Excluye:</b> " + esc(exc.join(", ")) : "") + "</p>";
  }
  const stat = (l, v) => '<div class="top__stat"><dt>' + esc(l) + "</dt><dd>" + esc(v) + "</dd></div>";

  function renderCampaignTable(camps) {
    const q = state.search.trim().toLowerCase();
    const list = q ? camps.filter((c) => c.name.toLowerCase().includes(q)) : camps;
    $("camp-search-count").textContent = q ? list.length + " de " + camps.length + " campañas" : camps.length + " campañas";
    $("camp-table").innerHTML = list.length ? list.slice().reverse().map((c) =>
      '<tr><td class="name">' + esc(c.name) + "</td><td>" + esc(c.date) + '</td><td class="num">' + fInt(c.recipients) +
      '</td><td class="num ' + semClass(c.or, THRESHOLDS.campOr) + '">' + fPct(c.or) + '</td><td class="num ' + semClass(c.ctr, THRESHOLDS.campCtr) + '">' + fPct(c.ctr) +
      '</td><td class="num">' + fPct(c.ctor) + '</td><td class="num ' + semClass(c.cr, THRESHOLDS.campCr) + '">' + fPct(c.cr, 3) +
      '</td><td class="num' + (c.unsub > UNSUB_LIMIT ? " sem sem--bad" : "") + '">' + fPct(c.unsub, 3) + '</td><td class="num">' + fInt(c.conv) +
      '</td><td class="num"><strong>' + fEur2(c.rev) + '</strong></td><td class="num">' + fEur2(c.aov) + '</td><td class="num">' + fRpr(c.rpr) + "</td></tr>"
    ).join("") : '<tr><td colspan="12">Ninguna campaña coincide con la búsqueda.</td></tr>';
  }

  /* ---------- Render: flujos ---------- */
  function healthScore(a) {
    const part = (v, [target, pts]) => isNum(v) ? Math.min(v / target, 1) * pts : 0;
    return Math.round(part(a.rpr, HEALTH.rpr) + part(a.or, HEALTH.or) + part(a.cr, HEALTH.cr) + part(a.recipients, HEALTH.vol));
  }
  const healthLevel = (score) => HEALTH_LEVELS.find(([min]) => score >= min);

  function flowDiagnosis(name, a) {
    const n = name.toLowerCase();
    const parts = [];
    if (a.rpr >= 2) parts.push("Muy rentable (" + fEur2(a.rpr) + "/dest.).");
    else if (a.rpr >= 0.5) parts.push("Rentabilidad correcta (" + fEur2(a.rpr) + "/dest.).");
    else if (a.rpr > 0) parts.push("Rentabilidad baja (" + fEur2(a.rpr) + "/dest.).");
    else parts.push(isNum(a.rpr) ? "Sin revenue atribuido." : "Sin revenue de plataforma: medir en Shopify.");
    if (a.or >= 0.45) parts.push("Apertura alta (" + fPct(a.or, 1) + ").");
    else if (a.or < 0.30) parts.push("Apertura floja (" + fPct(a.or, 1) + ").");
    let action = "Revisa asuntos, timing e incentivo.";
    if (n.includes("welcome")) action = "Motor principal del ciclo de vida: protegerlo y testar el asunto del primer email.";
    else if (n.includes("abandoned") || n.includes("carrito")) action = "Revisa la espera del primer impacto y añade prueba social en el recordatorio.";
    else if (n.includes("producto visto")) action = "Buen alcance y conversión baja: refuerza el producto visto y añade urgencia.";
    else if (n.includes("winback")) action = a.cr < 0.005 ? "Conversión casi nula: trigger a 120-150 días e incentivo caducable." : "Revisa incentivo y cadencia.";
    else if (n.includes("thank") || n.includes("gracias")) action = "Sin venta directa por diseño: añade petición de reseña y cross-sell suave.";
    else if (n.includes("cumplea")) action = a.rev === 0 ? "Buen OR sin revenue: añade un código personal con caducidad." : "Mantén el incentivo y añade recordatorio.";
    else if (n.includes("aniversario")) action = "Volumen mínimo: comprueba que el trigger dispara y añade incentivo.";
    else if (n.includes("sin compra")) action = "Revisa copy, incentivo y timing de envíos.";
    return esc(parts.join(" ")) + " <strong>Acción:</strong> " + esc(action);
  }

  function renderFlows(months) {
    const list = flowsWithAgg(months);
    const all = flowsAggFor(months, selectedFlowIds());
    const prev = flowsAggFor(yoyMonths(months), selectedFlowIds());
    const label = rangeLabel(months);
    $("flow-count").textContent = list.length + " flujos con datos · " + label;
    $("health-period").textContent = label;
    renderFlowMonthly(months);
    if (!all) {
      $("flow-kpis").innerHTML = '<p class="note">No hay datos de flujos en el periodo.</p>';
      $("flow-table").innerHTML = ""; $("flow-health").innerHTML = ""; $("flow-opps").innerHTML = "";
      drawChart("flowRevenue", null); drawChart("flowRpr", null);
      return;
    }
    const pv = prev || {};
    const vs = "vs año ant.";
    const best = list.slice().sort((a, b) => b.agg.rev - a.agg.rev)[0];
    const shopT = periodTotals(months);
    const shopPrev = periodTotals(yoyMonths(months));
    $("flow-kpis").innerHTML =
      kpiCard({ navy: true, label: "Revenue flujos", value: all.rev, text: fEur(all.rev), note: fInt(all.conv) + " pedidos", delta: deltaChip(all.rev, pv.rev, false, vs), src: "Fuente: " + plat() }) +
      kpiCard({ label: "Revenue flujos · Shopify", value: shopT.shopifyFlow, text: fEur(shopT.shopifyFlow), note: splitNote(shopT) + (state.flowSel ? " (todos los flujos)" : ""), delta: deltaChip(shopT.shopifyFlow, shopPrev.shopifyFlow, false, vs), src: "Fuente: Shopify" }) +
      kpiCard({ label: "Envíos de flujos", value: all.recipients, text: fInt(all.recipients), delta: deltaChip(all.recipients, pv.recipients, false, vs) }) +
      kpiCard({ label: "Open rate ponderado", value: all.or, text: fPct(all.or), delta: deltaChip(all.or, pv.or, true, vs) }) +
      kpiCard({ label: "Conversión", value: all.cr, text: fPct(all.cr), delta: deltaChip(all.cr, pv.cr, true, vs) }) +
      kpiCard({ label: "€ por destinatario", value: all.rpr, text: fEur2(all.rpr), delta: deltaChip(all.rpr, pv.rpr, false, vs) }) +
      kpiCard({ label: "Flujo con más revenue", value: best.name, text: best.name, note: fEur(best.agg.rev) + " · " + fPct(best.agg.rev / all.rev, 0) + " del total" });

    const sorted = list.slice().sort((a, b) => b.agg.rev - a.agg.rev);
    const p = palette();
    const hbar = (name, values, fmt) => drawChart(name, {
      type: "bar",
      data: { labels: sorted.map((x) => x.name), datasets: [{ data: values, backgroundColor: p.azul2, borderRadius: 4 }] },
      options: baseOptions(p, { indexAxis: "y", plugins: Object.assign(baseOptions(p).plugins, { legend: { display: false }, tooltip: Object.assign({}, baseOptions(p).plugins.tooltip, { callbacks: { label: (c) => fmt(c.parsed.x) } }) }), scales: { x: axis(p, { ticks: { color: p.apagado, callback: fmt } }), y: axis(p, { grid: { display: false } }) } })
    });
    hbar("flowRevenue", sorted.map((x) => x.agg.rev), (v) => fK(v) + " €");
    hbar("flowRpr", sorted.map((x) => isNum(x.agg.rpr) ? +x.agg.rpr.toFixed(2) : null), (v) => v.toLocaleString("es-ES") + " €");

    $("flow-table").innerHTML = sorted.map((x) => {
      const a = x.agg;
      return '<tr><td class="name">' + esc(x.name) + '</td><td class="num">' + a.months + '</td><td class="num">' + fInt(a.recipients) +
        '</td><td class="num ' + semClass(a.or, THRESHOLDS.flowOr) + '">' + fPct(a.or) + '</td><td class="num ' + semClass(a.ctr, THRESHOLDS.flowCtr) + '">' + fPct(a.ctr) +
        '</td><td class="num ' + semClass(a.cr, THRESHOLDS.flowCr) + '">' + fPct(a.cr) + '</td><td class="num">' + fInt(a.conv) +
        '</td><td class="num"><strong>' + fEur2(a.rev) + '</strong></td><td class="num">' + fEur2(a.aov) + '</td><td class="num">' + fEur2(a.rpr) + "</td></tr>";
    }).join("");

    $("flow-health").innerHTML = list.map((x) => Object.assign({ score: healthScore(x.agg) }, x)).sort((a, b) => b.score - a.score).map((x, i) => {
      const lvl = healthLevel(x.score);
      const a = x.agg;
      return '<article class="health__card"><span class="health__rank">' + (i + 1) + '</span><div class="health__body"><div class="health__head"><span class="health__name">' + esc(x.name) +
        '</span><span class="badge badge--' + lvl[1] + '">' + lvl[2] + '</span><span class="health__score">Salud <b>' + x.score + "</b>/100</span></div>" +
        '<div class="health__metrics"><span><b>' + fEur(a.rev) + "</b>Revenue</span><span><b>" + fEur2(a.rpr) + "</b>€/dest.</span><span><b>" + fPct(a.or, 1) + "</b>Open rate</span><span><b>" + fPct(a.cr) + "</b>Conversión</span><span><b>" + fInt(a.recipients) + "</b>Envíos</span></div>" +
        '<p class="health__diag">' + flowDiagnosis(x.name, a) + "</p></div></article>";
    }).join("");
    renderFlowOpportunities(list, all);
  }

  function renderFlowOpportunities(list, all) {
    const find = (s) => list.find((x) => x.name.toLowerCase().includes(s));
    const opps = [];
    list.forEach((x) => {
      const a = x.agg;
      if (a.rev === 0 && a.or >= 0.40 && a.recipients >= 100) opps.push(["alta", "Monetizar «" + x.name + "»", "Abre bien (" + fPct(a.or, 1) + " sobre " + fInt(a.recipients) + " envíos) y no genera revenue. Añadir código personal con caducidad y un bloque de producto."]);
    });
    const wb = find("winback");
    if (wb && wb.agg.recipients >= MIN_RELEVANT_FLOW_RECIPIENTS && wb.agg.cr < 0.005) opps.push(["alta", "Reactivar Customer Winback", fInt(wb.agg.recipients) + " envíos con conversión del " + fPct(wb.agg.cr, 3) + ". Trigger a 120-150 días sin compra e incentivo escalonado (10 % → 15 %) con urgencia."]);
    const ac = find("abandoned") || find("carrito");
    if (ac && ac.agg.rpr < 2) opps.push(["alta", "Recuperar Abandoned Cart", "€/dest. de " + fEur2(ac.agg.rpr) + ". Revisar filtros y espera del primer email y añadir prueba social."]);
    const ssc = find("sin compra");
    if (ssc && ssc.agg.rpr < 0.6) opps.push(["media", "Optimizar «Suscritos sin compra»", fEur2(ssc.agg.rpr) + "/dest. y OR " + fPct(ssc.agg.or, 1) + ". Revisar copy, incentivo y timing."]);
    const pv = find("producto visto");
    if (pv && pv.agg.recipients >= 500 && pv.agg.cr < 0.02) opps.push(["media", "Exprimir «Recordatorio producto visto»", fInt(pv.agg.recipients) + " envíos y conversión del " + fPct(pv.agg.cr) + ". Añadir un segundo email con escasez y producto relacionado."]);
    const ty = find("thank");
    if (ty && ty.agg.or >= 0.40) opps.push(["media", "Convertir Customer Thank You en recompra", "OR del " + fPct(ty.agg.or, 1) + ". Añadir reseña y cross-sell, y enlazar con un flujo de segunda compra a 20-30 días."]);
    const toCreate = (state.config && Array.isArray(state.config.flujosPorCrear)) ? state.config.flujosPorCrear : DEFAULT_FLOWS_TO_CREATE;
    if (toCreate.length) opps.push(["media", "Flujos por crear", toCreate.join(" · ")]);
    $("flow-opps").innerHTML = opps.map(([pri, title, body]) =>
      '<article class="opp"><div class="opp__head">' + esc(title) + '<span class="badge badge--' + PRIORITY_CLASS[pri] + '">Prioridad ' + pri + '</span></div><p class="opp__body">' + esc(body) + "</p></article>").join("");
  }

  function renderFlowMonthly(months) {
    const p = palette();
    const ids = selectedFlowIds();
    const rows = months.map((m) => ({ label: m.label, agg: flowsAggFor([m], ids) }));
    drawChart("flowMonthly", {
      type: "bar",
      data: { labels: rows.map((r) => r.label), datasets: [
        { type: "line", label: "Open rate ponderado (%)", data: rows.map((r) => r.agg ? +(r.agg.or * 100).toFixed(2) : null), borderColor: p.navy2, backgroundColor: p.navy2, borderWidth: 2, tension: .3, yAxisID: "y1", pointRadius: 3, spanGaps: true },
        { label: "Revenue flujos (€)", data: rows.map((r) => r.agg ? r.agg.rev : 0), backgroundColor: p.azul2, borderRadius: 4 }
      ] },
      options: baseOptions(p, { scales: { x: axis(p, { grid: { display: false } }), y: axis(p, { ticks: { color: p.apagado, callback: eurTick } }), y1: axis(p, { position: "right", grid: { display: false }, suggestedMin: 0, ticks: { color: p.apagado, callback: (v) => v + " %" } }) } })
    });
  }

  /* ---------- Render: interanual ---------- */
  function renderYoy(rangeList) {
    const months = withPrevYear(rangeList);
    const prevMonths = yoyMonths(months);
    const cur = periodTotals(months);
    const prev = periodTotals(prevMonths);
    if (!prevMonths.length) {
      $("yoy-sub").textContent = "No hay datos del año anterior para este periodo.";
      $("yoy-range").textContent = ""; $("yoy-cards").innerHTML = ""; drawChart("yoyChart", null);
      return;
    }
    const curLabel = rangeLabel(months);
    const prevLabel = rangeLabel(prevMonths);
    $("yoy-range").textContent = curLabel + " vs " + prevLabel;
    $("yoy-sub").textContent = months.length + (months.length === 1 ? " mes comparado" : " meses comparados") + " con el mismo mes del año anterior" + (months.length < rangeList.length ? "; se omiten " + (rangeList.length - months.length) + " meses del rango sin equivalente." : ".");
    const klav = (t) => addKnown(t.camp && t.camp.rev, t.flows && t.flows.rev);
    const sends = (t) => (t.camp ? t.camp.recipients : 0) + (t.flows ? t.flows.recipients : 0);
    const card = (label, c, pv, fmt, isRate, navy) => kpiCard({ navy, label, value: c, text: fmt(c), delta: deltaChip(c, pv, isRate), note: "Año anterior: " + fmt(pv) });
    const g = (t, k) => t.camp ? t.camp[k] : null;
    $("yoy-cards").innerHTML =
      card("Revenue " + plat() + " total", klav(cur), klav(prev), fEur, false, true) +
      card("Revenue campañas", g(cur, "rev"), g(prev, "rev"), fEur) +
      card("Revenue flujos", cur.flows && cur.flows.rev, prev.flows && prev.flows.rev, fEur) +
      card("Emails enviados", sends(cur), sends(prev), fInt) +
      card("Open rate campañas", g(cur, "or"), g(prev, "or"), (v) => fPct(v), true) +
      card("CTR campañas", g(cur, "ctr"), g(prev, "ctr"), (v) => fPct(v), true) +
      card("Ingresos canal email (Shopify)", cur.shopifyRev, prev.shopifyRev, fEur) +
      card("Campañas · Shopify", cur.shopifyCamp, prev.shopifyCamp, fEur) +
      card("Flujos · Shopify", cur.shopifyFlow, prev.shopifyFlow, fEur) +
      card("Venta neta", cur.ventaNeta, prev.ventaNeta, fEur) +
      card("Peso de venta", cur.peso, prev.peso, (v) => fPct(v), true);
    const p = palette();
    const series = (list) => list.map((m) => { const s = monthSummary(m); return isNum(s.klaviyoRev) ? Math.round(s.klaviyoRev) : null; });
    drawChart("yoyChart", {
      type: "line",
      data: { labels: months.map((m) => m.label.slice(0, 3)), datasets: [
        { label: "Año anterior", data: months.map((m) => { const pm = findMonth(prevYearKey(m.key)); return pm ? series([pm])[0] : null; }), borderColor: p.apagado, backgroundColor: p.apagado, borderDash: [5, 4], borderWidth: 2, tension: .3, pointRadius: 3 },
        { label: "Periodo seleccionado", data: series(months), borderColor: p.azul2, backgroundColor: p.azul2, borderWidth: 3, tension: .3, pointRadius: 4 }
      ] },
      options: baseOptions(p, { scales: { x: axis(p, { grid: { display: false } }), y: axis(p, { beginAtZero: true, ticks: { color: p.apagado, callback: eurTick } }) },
        plugins: Object.assign(baseOptions(p).plugins, { tooltip: Object.assign({}, baseOptions(p).plugins.tooltip, { callbacks: { label: tooltipEur } }) }) })
    });
  }

  /* ---------- Render: análisis ---------- */
  function listHtml(items, cls) {
    return items && items.length ? '<ul class="list ' + (cls || "") + '">' + items.map((i) => "<li>" + rich(i) + "</li>").join("") + "</ul>" : '<p class="note">Sin contenido todavía.</p>';
  }
  function proposalsHtml(items) {
    if (!items || !items.length) return '<p class="note">Sin propuestas todavía.</p>';
    return '<div class="proposals">' + items.map((line) => {
      const [title, when, text] = String(line).split("|").map((s) => s.trim());
      return '<article class="proposal"><h4 class="proposal__title">' + rich(title) + "</h4>" + (when ? '<span class="proposal__when">' + esc(when) + "</span>" : "") + (text ? '<p class="proposal__text">' + rich(text) + "</p>" : "") + "</article>";
    }).join("") + "</div>";
  }

  function renderAnalysis() {
    const m = findMonth(state.analysisKey) || state.months[state.months.length - 1];
    if (!m) return;
    state.analysisKey = m.key;
    const a = m.analisis || {};
    const s = monthSummary(m);
    const prevMonth = state.months[state.months.indexOf(m) - 1];
    const ps = prevMonth ? monthSummary(prevMonth) : null;
    const py = findMonth(prevYearKey(m.key));
    const pys = py ? monthSummary(py) : null;
    const mini = (v, l, d) => '<div class="mini"><div class="mini__v">' + esc(v) + '</div><div class="mini__l">' + esc(l) + "</div>" + (d || "") + "</div>";
    const c = s.camp || {};
    $("analysis-view").innerHTML =
      '<section class="section"><h2 class="section__title"><span class="tag">01</span>Contexto de ' + esc(m.label) + "</h2>" + contextBlock(m) + "</section>" +
      '<section class="section"><h2 class="section__title"><span class="tag">02</span>Resumen de ' + esc(m.label) + '</h2><div class="card highlight card--navy"><p>' + (a.resumen ? rich(a.resumen) : "Sin resumen todavía.") + "</p></div>" +
      '<div class="analysis-kpis">' +
      mini(fInt(c.n || 0), "Campañas B2C") +
      mini(fPct(c.or, 1), "Open rate", ps && ps.camp ? deltaChip(c.or, ps.camp.or, true, "vs mes ant.") : "") +
      mini(fEur(s.campRev), "Revenue campañas", ps ? deltaChip(s.campRev, ps.campRev, false, "vs mes ant.") : "") +
      mini(fEur(s.flowRev), "Revenue flujos", ps ? deltaChip(s.flowRev, ps.flowRev, false, "vs mes ant.") : "") +
      mini(fEur(s.klaviyoRev), "Revenue " + plat(), pys ? deltaChip(s.klaviyoRev, pys.klaviyoRev, false, "vs año ant.") : "") +
      mini(fPct(c.unsub, 3), "Tasa de baja", ps && ps.camp ? deltaChip(c.unsub, ps.camp.unsub, true, "vs mes ant.", true) : "") + "</div></section>" +
      '<section class="section"><div class="grid-2"><div class="card"><h3 class="card__title">Lo que ha funcionado</h3>' + listHtml(a.funciono, "list--good") + '</div><div class="card"><h3 class="card__title">Lo que hay que corregir</h3>' + listHtml(a.corregir, "list--warn") + "</div></div></section>" +
      '<section class="section"><h2 class="section__title"><span class="tag">03</span>Acciones realizadas en ' + esc(m.label) + '</h2><div class="card">' + listHtml(a.acciones) + "</div></section>" +
      '<section class="section"><h2 class="section__title"><span class="tag">04</span>Propuestas de newsletters</h2>' + proposalsHtml(a.propuestas) + "</section>";
    renderRecommendations();
    renderStrategy();
  }

  /** Contexto del mes: textarea editable si el visitante puede guardar, texto si no. Conserva lo que se esté escribiendo. */
  /** Contexto del mes en modo lectura: se escribe en «Editar datos». */
  function contextBlock(m) {
    return '<div class="card context">' + (m.contexto
      ? '<p class="context__text">' + rich(m.contexto) + "</p>"
      : '<p class="context__empty">Sin contexto para este mes. Se escribe en «Editar datos».</p>') + "</div>";
  }

  function li(html, tag) {
    return "<li>" + html + (tag ? ' <span class="badge badge--' + tag[0] + '">' + esc(tag[1]) + "</span>" : "") + "</li>";
  }
  const metric = (v) => "<strong>" + esc(v) + "</strong>";

  function renderRecommendations() {
    const months = rangeMonths();
    const all = state.months;
    $("reco-period-label").textContent = "(" + rangeLabel(months) + ")";
    const t = periodTotals(months);
    const hist = aggregateCampaigns([].concat(...all.map(b2cCampaigns)));
    const P = [];
    if (t.camp && hist) {
      const c = t.camp;
      const diff = (c.or - hist.or) * 100;
      P.push(c.or >= hist.or
        ? li("Open rate de campañas del " + metric(fPct(c.or)) + ", por encima de la media histórica (" + fPct(hist.or) + "). Mantén la audiencia y replica los asuntos que han funcionado.", ["good", "Bien"])
        : li("Open rate de campañas del " + metric(fPct(c.or)) + ", " + Math.abs(diff).toFixed(1).replace(".", ",") + " pp por debajo de la media histórica. Ajusta la segmentación hacia engaged y revisa asuntos.", ["warn", "Mejorable"]));
      const perMonth = c.n / months.length;
      if (perMonth > CADENCE.high) P.push(li("Cadencia alta: " + metric(perMonth.toFixed(1).replace(".", ",") + " campañas/mes") + ". Por encima de 14-16 al mes la apertura cae.", ["bad", "Reducir"]));
      else if (perMonth < CADENCE.low && months.length > 1) P.push(li("Cadencia baja: " + metric(perMonth.toFixed(1).replace(".", ",") + " campañas/mes") + ". Hay margen hasta 11-14 al mes con audiencia engaged.", ["warn", "Subir"]));
      else P.push(li("Cadencia de " + metric(perMonth.toFixed(1).replace(".", ",") + " campañas/mes") + ".", ["ok", "Cadencia"]));
      const elig = t.camps.filter((x) => x.recipients >= MIN_RELEVANT_RECIPIENTS && isNum(x.rpr));
      if (elig.length) {
        const best = elig.slice().sort((a, b) => b.rpr - a.rpr)[0];
        const worst = elig.slice().sort((a, b) => a.rpr - b.rpr)[0];
        P.push(li("Mejor campaña por €/dest.: «" + esc(best.name) + "» (" + metric(best.rpr.toLocaleString("es-ES", { maximumFractionDigits: 3 }) + " €") + ", " + fInt(best.conv) + " pedidos). Replica formato y oferta.", ["good", "Replicar"]));
        if (worst !== best) P.push(li("Campaña menos rentable: «" + esc(worst.name) + "» (" + metric(worst.rpr.toLocaleString("es-ES", { maximumFractionDigits: 3 }) + " €/dest.") + ", OR " + fPct(worst.or, 1) + "). Revisa tema, oferta y momento.", ["warn", "Revisar"]));
      }
      if (c.unsub > UNSUB_LIMIT) P.push(li("Tasa de baja del " + metric(fPct(c.unsub, 3)) + ", por encima del 0,3 %. Excluye inactivos y no abridores.", ["bad", "Entregabilidad"]));
    }
    if (t.flows && isNum(t.flows.rev)) {
      const total = addKnown(t.camp && t.camp.rev, t.flows.rev);
      P.push(li("Los flujos generan " + metric(fEur(t.flows.rev)) + " (" + fPct(total ? t.flows.rev / total : 0, 0) + " del revenue de email) con " + fEur2(t.flows.rpr) + "/dest.", ["good", "Flujos"]));
      const weak = flowsWithAgg(months).filter((x) => x.agg.recipients >= MIN_RELEVANT_FLOW_RECIPIENTS).sort((a, b) => a.agg.rpr - b.agg.rpr)[0];
      if (weak && weak.agg.rpr < 0.5) P.push(li("Flujo a optimizar: «" + esc(weak.name) + "» (" + metric(fEur2(weak.agg.rpr) + "/dest.") + ", OR " + fPct(weak.agg.or, 1) + ").", ["warn", "Optimizar"]));
    }
    $("reco-period").innerHTML = P.join("") || li("Sin datos para el periodo seleccionado.");

    const T = [];
    const rows = all.map(monthSummary).filter((r) => r.camp);
    if (rows.length >= 3) {
      const byOr = rows.slice().sort((a, b) => b.camp.or - a.camp.or);
      T.push(li("Mejor apertura en " + metric(byOr.slice(0, 3).map((r) => r.label).join(", ")) + " y peor en " + metric(byOr.slice(-3).map((r) => r.label).join(", ")) + ".", ["ok", "Estacionalidad"]));
      const busiest = rows.slice().sort((a, b) => b.camp.n - a.camp.n)[0];
      const medianOr = byOr[Math.floor(byOr.length / 2)].camp.or;
      if (busiest.camp.or < medianOr) T.push(li("El mes con más campañas (" + metric(busiest.label + ", " + busiest.camp.n) + ") tuvo un OR del " + fPct(busiest.camp.or, 1) + ", por debajo de la mediana (" + fPct(medianOr, 1) + "). Más envíos no es mejor.", ["warn", "Frecuencia"]));
    }
    const flowHist = flowsAggFor(all, flowIds());
    if (flowHist && hist && isNum(flowHist.rev) && isNum(hist.rev)) {
      const share = flowHist.rev / (flowHist.rev + hist.rev);
      T.push(li("En todo el histórico los flujos suman " + metric(fEur(flowHist.rev)) + " frente a " + metric(fEur(hist.rev)) + " de campañas: el " + metric(fPct(share, 0)) + " del revenue de email es automatizado.", ["good", "Flujos"]));
      const perFlow = flowIds().map((id) => ({ name: flowName(id), agg: flowAggFor(all, id) })).filter((x) => x.agg);
      const weak = perFlow.filter((x) => x.agg.recipients >= 2000 && (x.agg.or < 0.25 || x.agg.rpr < 0.15)).map((x) => x.name);
      if (weak.length) T.push(li("Bajo rendimiento sostenido: " + metric(weak.join(", ")) + ". Reescribir y revisar trigger e incentivo.", ["bad", "Rehacer"]));
    }
    if (rows.length >= 6) {
      const rate = (list) => sum(list, (r) => r.camp.unsub * r.camp.recipients) / sum(list, (r) => r.camp.recipients);
      const first = rate(rows.slice(0, 3));
      const last = rate(rows.slice(-3));
      if (last > first * 1.15) T.push(li("La tasa de baja sube de " + fPct(first, 3) + " a " + metric(fPct(last, 3)) + " entre el inicio y los últimos tres meses. Aplica sunset de inactivos.", ["warn", "Entregabilidad"]));
    }
    const withBbdd = all.filter((m) => m.bbdd && isNum(m.bbdd.total));
    if (withBbdd.length >= 2) {
      const f = withBbdd[0];
      const l = withBbdd[withBbdd.length - 1];
      T.push(li("La BBDD total crece un " + metric(fPct((l.bbdd.total - f.bbdd.total) / f.bbdd.total, 0)) + " entre " + esc(f.label) + " y " + esc(l.label) + " (de " + fInt(f.bbdd.total) + " a " + fInt(l.bbdd.total) + " perfiles).", ["good", "Captación"]));
    }
    $("reco-trend").innerHTML = T.join("") || li("Hacen falta al menos tres meses con datos.");
  }

  function renderStrategy() {
    const est = (state.config && state.config.estrategia) || {};
    $("strategy-view").innerHTML = STRATEGY_BLOCKS.map(([key, title]) =>
      '<div class="card"><h3 class="card__title">' + esc(title) + '</h3><ul class="list">' + (est[key] || []).map((line) => {
        const r = splitRecommendation(line);
        return "<li>" + rich(r.title) + (PRIORITY_CLASS[r.priority] ? ' <span class="badge badge--' + PRIORITY_CLASS[r.priority] + '">' + esc(r.priority) + "</span>" : "") + (r.detail ? " " + rich(r.detail) : "") + "</li>";
      }).join("") + "</ul></div>").join("");
  }

  /* ---------- Render: editar datos ---------- */
  function numInput(col, value, step, extra) {
    const v = isNum(value) ? value : "";
    return '<input class="input input--num" type="number" min="0" step="any" data-step="' + step + '" data-col="' + col + '" value="' + esc(v) + '"' + (extra || "") + ' aria-label="' + esc(col) + '">';
  }
  const pctValue = (v) => isNum(v) ? +(v * 100).toFixed(4) : "";

  function campaignRow(c) {
    const inc = (c.audiences && c.audiences.included) || [];
    return '<tr data-id="' + esc(c.id || "") + '"' + (c.b2b ? ' class="is-b2b"' : "") + ">" +
      '<td class="check-cell"><input type="checkbox" class="check" data-col="include"' + (c.b2b ? "" : " checked") + ' aria-label="Incluir «' + esc(c.name || "campaña nueva") + '» en los cálculos"></td>' +
      '<td><input class="input input--name" type="text" maxlength="' + MAX_NAME + '" data-col="name" value="' + esc(c.name || "") + '" aria-label="Nombre de campaña" required></td>' +
      '<td><input class="input input--aud" type="text" maxlength="300" data-col="subject" value="' + esc(c.subject || "") + '" aria-label="Asunto"></td>' +
      '<td><input class="input input--date" type="date" data-col="date" value="' + esc(c.date || "") + '" aria-label="Fecha" required></td>' +
      '<td><input class="input input--aud" type="text" maxlength="' + MAX_AUDIENCES + '" data-col="included" value="' + esc(inc.join(" | ")) + '" aria-label="Segmentos de envío"></td>' +
      "<td>" + numInput("recipients", c.recipients, "1") + "</td>" +
      "<td>" + numInput("or", pctValue(c.or), "0.01", ' max="100"') + "</td>" +
      "<td>" + numInput("ctr", pctValue(c.ctr), "0.01", ' max="100"') + "</td>" +
      "<td>" + numInput("ctor", pctValue(c.ctor), "0.01", ' max="100"') + "</td>" +
      "<td>" + numInput("cr", pctValue(c.cr), "0.001", ' max="100"') + "</td>" +
      "<td>" + numInput("unsub", pctValue(c.unsub), "0.001", ' max="100"') + "</td>" +
      "<td>" + numInput("conv", c.conv, "1") + "</td>" +
      "<td>" + numInput("rev", c.rev, "0.01") + "</td>" +
      '<td><button class="btn btn--ghost btn--icon" type="button" data-js="remove-campaign" aria-label="Quitar campaña">Quitar</button></td></tr>';
  }

  function renderEditor() {
    const m = findMonth(state.editKey) || state.months[state.months.length - 1];
    if (!m) return;
    state.editKey = m.key;
    const form = $("month-form");
    $("billing-edit").hidden = !hasBilling();
    form.querySelectorAll("[data-field]").forEach((el) => {
      const v = getPath(m, el.dataset.field);
      el.value = Array.isArray(v) ? v.join("\n") : (v == null ? "" : v);
    });
    fillStrategyForm();
    $("edit-campaigns").innerHTML = (m.campaigns || []).slice().sort((a, b) => a.date < b.date ? -1 : 1).map(campaignRow).join("");
    $("edit-flows").innerHTML = flowIds().map((id) => {
      const d = (m.flows || {})[id] || {};
      return '<tr data-flow="' + esc(id) + '"><td class="name">' + esc(flowName(id)) + "</td><td>" + numInput("r", d.r, "1") + "</td><td>" + numInput("o", pctValue(d.o), "0.01", ' max="100"') + "</td><td>" + numInput("c", pctValue(d.c), "0.01", ' max="100"') + "</td><td>" + numInput("p", d.p, "1") + "</td><td>" + numInput("rev", d.rev, "0.01") + "</td></tr>";
    }).join("");
    setMsg("month-msg", "");
    applyWriteAccess();
  }

  /* ---------- Lectura y validación de formularios ---------- */
  function readNumber(el, opts) {
    const raw = el.value.trim();
    if (raw === "") return null;
    const v = Number(raw);
    if (!isFinite(v) || v < 0 || (opts && opts.max != null && v > opts.max)) throw new Error("Valor no válido en «" + (el.getAttribute("aria-label") || el.dataset.field || el.dataset.col) + "».");
    return opts && opts.pct ? v / 100 : v;
  }
  const PCT_COLS = ["or", "ctr", "ctor", "cr", "unsub"];

  function readCampaignRows(base) {
    const monthKey = base.key;
    const previous = {};
    (base.campaigns || []).forEach((c) => { previous[c.id] = c; });
    return Array.from($("edit-campaigns").querySelectorAll("tr")).map((tr, i) => {
      const get = (col) => tr.querySelector('[data-col="' + col + '"]');
      const name = get("name").value.trim().slice(0, MAX_NAME);
      const date = get("date").value;
      if (!name) throw new Error("La campaña de la fila " + (i + 1) + " no tiene nombre.");
      if (!DATE_RX.test(date) || date.slice(0, 7) !== monthKey) throw new Error("La fecha de «" + name + "» debe estar dentro de " + monthKey + ".");
      const prev = previous[tr.dataset.id] || {};
      const included = get("included").value.split("|").map((s) => s.trim()).filter(Boolean).slice(0, 20);
      const c = { id: tr.dataset.id || "n" + Date.now().toString(36) + i, name, date, b2b: !get("include").checked,
        subject: get("subject").value.trim().slice(0, 300),
        audiences: { included, excluded: (prev.audiences && prev.audiences.excluded) || [] } };
      ["recipients", "conv"].concat(PCT_COLS).forEach((col) => { c[col] = readNumber(get(col), { pct: PCT_COLS.includes(col), max: PCT_COLS.includes(col) ? 100 : null }) || 0; });
      c.rev = readNumber(get("rev"));
      c.aov = isNum(c.rev) && c.conv ? +(c.rev / c.conv).toFixed(2) : null;
      c.rpr = isNum(c.rev) && c.recipients ? +(c.rev / c.recipients).toFixed(5) : null;
      return c;
    });
  }

  function readFlowRows() {
    const flows = {};
    $("edit-flows").querySelectorAll("tr").forEach((tr) => {
      const get = (col) => tr.querySelector('[data-col="' + col + '"]');
      const r = readNumber(get("r"));
      if (!r) return;
      flows[tr.dataset.flow] = { r, o: readNumber(get("o"), { pct: true, max: 100 }) || 0, c: readNumber(get("c"), { pct: true, max: 100 }) || 0, p: readNumber(get("p")) || 0, rev: readNumber(get("rev")) };
    });
    return flows;
  }

  function buildMonthFromForm() {
    const base = findMonth(state.editKey);
    const doc = JSON.parse(JSON.stringify(base));
    $("month-form").querySelectorAll("[data-field]").forEach((el) => {
      let value;
      if (el.closest("[hidden]")) return;
      if (el.type === "date" && el.value && !DATE_RX.test(el.value)) throw new Error("Fecha no válida en «" + el.dataset.field + "».");
      if (el.type === "number") value = readNumber(el);
      else if (el.dataset.list) value = linesOf(el.value);
      else value = el.value.trim().slice(0, el.tagName === "TEXTAREA" ? MAX_TEXT : 300);
      setPath(doc, el.dataset.field, value);
    });
    doc.campaigns = readCampaignRows(base);
    doc.flows = readFlowRows();
    doc.updatedAt = new Date().toISOString();
    return doc;
  }

  const linesOf = (text) => String(text || "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 40).map((s) => s.slice(0, MAX_TEXT));

  function setMsg(name, text, kind) {
    const el = $(name);
    el.textContent = text;
    el.className = "form__msg" + (kind ? " form__msg--" + kind : "");
  }

  /* ---------- Escrituras ---------- */
  async function saveMonth(event) {
    event.preventDefault();
    if (!state.db || !state.canWrite) return;
    let doc;
    try { doc = buildMonthFromForm(); } catch (err) { setMsg("month-msg", err.message, "error"); return; }
    setMsg("month-msg", "Guardando…");
    try {
      await state.db.doc(MONTHS_COLLECTION + "/" + doc.key).set(doc);
      setMsg("month-msg", "Guardado.", "ok");
    } catch (err) {
      handleWriteError(err, "month-msg");
    }
  }

  async function saveStrategy(event) {
    event.preventDefault();
    if (!state.db || !state.canWrite) return;
    const form = $("strategy-form");
    const estrategia = {};
    STRATEGY_BLOCKS.forEach(([key]) => { estrategia[key] = linesOf(form.querySelector('[data-field="' + key + '"]').value); });
    setMsg("strategy-msg", "Guardando…");
    try {
      await state.db.doc(CONFIG_DOC).update({ estrategia, updatedAt: new Date().toISOString() });
      setMsg("strategy-msg", "Guardado.", "ok");
    } catch (err) { handleWriteError(err, "strategy-msg"); }
  }

  async function addMonth(event) {
    event.preventDefault();
    const key = $("new-month").value;
    if (!MONTH_KEY_RX.test(key)) { setMsg("month-msg", "Elige un mes válido.", "error"); return; }
    if (findMonth(key)) { state.editKey = key; renderEditor(); populateSelect("edit-month", key); return; }
    if (!state.db || !state.canWrite) return;
    const doc = { key, label: labelForKey(key), shopify: { rev: null, ventaNeta: null }, bbdd: { total: null, activos: null, suscritos: null, enviamos: null }, campaigns: [], flows: {}, contexto: "", analisis: { resumen: "", funciono: [], corregir: [], acciones: [], propuestas: [] }, fuentes: { klaviyo: "", shopify: "", bbdd: "" }, updatedAt: new Date().toISOString() };
    try {
      await state.db.doc(MONTHS_COLLECTION + "/" + key).set(doc);
      state.editKey = key;
      setMsg("month-msg", "Mes " + doc.label + " creado. Completa sus datos y guarda.", "ok");
    } catch (err) { handleWriteError(err, "month-msg"); }
  }

  function handleWriteError(err, msgName) {
    const code = err && err.code;
    if (code === "invalid_argument") { state.canWrite = false; applyWriteAccess(); setMsg(msgName, "No tienes permiso para guardar cambios en este panel.", "error"); return; }
    if (code === "quota_exceeded") { setMsg(msgName, "La base de datos del panel está llena. Avisa a quien lo mantiene.", "error"); return; }
    setMsg(msgName, "No se ha podido guardar. Inténtalo de nuevo en unos segundos.", "error");
  }

  /* ---------- Controles ---------- */
  function populateSelect(name, selectedKey) {
    const el = $(name);
    if (!el) return;
    el.innerHTML = state.months.map((m) => '<option value="' + esc(m.key) + '"' + (m.key === selectedKey ? " selected" : "") + ">" + esc(m.label) + "</option>").join("");
  }

  function populateFilters() {
    const all = state.months;
    if (!all.length) return;
    if (state.preset !== "custom") applyPreset(state.preset);
    populateSelect("month-from", state.fromKey);
    populateSelect("month-to", state.toKey);
    populateSelect("analysis-month", state.analysisKey || all[all.length - 1].key);
    populateSelect("edit-month", state.editKey || all[all.length - 1].key);
    $("flow-options").innerHTML = flowIds().map((id) =>
      '<label class="multi__item"><input type="checkbox" data-flow-id="' + esc(id) + '"' + (!state.flowSel || state.flowSel.has(id) ? " checked" : "") + "> " + esc(flowName(id)) + "</label>").join("");
    updateFlowLabel();
  }

  function applyPreset(preset) {
    const all = state.months;
    state.preset = preset;
    state.toKey = all[all.length - 1].key;
    state.fromKey = preset === "all" ? all[0].key : all[Math.max(0, all.length - Number(preset))].key;
    document.querySelectorAll("[data-preset]").forEach((b) => b.classList.toggle("is-active", b.dataset.preset === preset));
  }

  function updateFlowLabel() {
    const total = flowIds().length;
    const n = state.flowSel ? state.flowSel.size : total;
    $("flow-picker-label").textContent = n === total ? "Todos los flujos" : n + " de " + total + " flujos";
  }

  function fillStrategyForm() {
    const est = (state.config && state.config.estrategia) || {};
    $("strategy-form").querySelectorAll("[data-field]").forEach((el) => { el.value = (est[el.dataset.field] || []).join("\n"); });
    setMsg("strategy-msg", "");
  }

  function applyWriteAccess() {
    const can = state.canWrite && !!state.db;
    document.querySelectorAll('[data-js="add-campaign"], [data-js="add-month-form"]').forEach((el) => { el.hidden = !can; });
    if ($("strategy-form")) $("strategy-form").querySelectorAll("textarea, button").forEach((el) => { el.disabled = !can; });
    if ($("edit-readonly")) $("edit-readonly").hidden = can;
    if ($("month-form")) $("month-form").querySelectorAll("input, button, textarea, select").forEach((el) => { el.disabled = !can; });
  }

  /* ---------- Render principal ---------- */
  function render() {
    const hasData = state.months.length > 0;
    $("empty").hidden = hasData || !state.loaded;
    $("filters").hidden = !hasData || state.tab === "datos";
    document.querySelectorAll("[data-panel]").forEach((p) => { p.hidden = !hasData || p.dataset.panel !== state.tab; });
    if (!hasData) return;
    const months = rangeMonths();
    const all = state.months;
    $("hero-meta").textContent = "Datos de " + all[0].label + " a " + all[all.length - 1].label + " · " + plat() + " y " + ((state.config && state.config.tienda) || "Shopify");
    if (state.config && state.config.cliente) $("client-name").textContent = state.config.cliente;
    document.querySelectorAll("[data-platform]").forEach((el) => { el.textContent = plat(); });
    if (state.config && state.config.notaFuentes && !state.static) $("footer-sources").textContent = state.config.notaFuentes;
    const t = periodTotals(months);
    $("filter-info").textContent = months.length + (months.length === 1 ? " mes" : " meses") + " · " + (t.camp ? t.camp.n : 0) + " campañas B2C · " + flowsWithAgg(months).length + " flujos con datos";
    const views = {
      general: () => { renderSummary(months); renderGlobal(months); renderBbdd(months); renderBilling(months); numberSections("general"); renderPeriodKpis(months); renderHistory(); },
      campanas: () => renderCampaigns(months),
      flujos: () => renderFlows(months),
      interanual: () => { renderYoy(months); renderYoyTops(months); },
      analisis: () => renderAnalysis(),
      datos: () => renderEditor()
    };
    views[state.tab]();
  }

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    try { history.replaceState(null, "", "#" + tab); } catch (e) { /* el marco puede bloquear el historial */ }
    render();
  }

  function bindEvents() {
    $("tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });
    $("presets").addEventListener("click", (e) => {
      const b = e.target.closest("[data-preset]");
      if (!b) return;
      applyPreset(b.dataset.preset);
      $("month-from").value = state.fromKey; $("month-to").value = state.toKey;
      render();
    });
    const onRange = () => {
      let from = $("month-from").value, to = $("month-to").value;
      if (from > to) { if (document.activeElement === $("month-from")) to = from; else from = to; }
      state.fromKey = from; state.toKey = to; state.preset = "custom";
      $("month-from").value = from; $("month-to").value = to;
      document.querySelectorAll("[data-preset]").forEach((b) => b.classList.remove("is-active"));
      render();
    };
    $("month-from").addEventListener("change", onRange);
    $("month-to").addEventListener("change", onRange);
    $("flow-options").addEventListener("change", (e) => {
      const id = e.target.dataset.flowId;
      if (!id) return;
      if (!state.flowSel) state.flowSel = new Set(flowIds());
      if (e.target.checked) state.flowSel.add(id); else state.flowSel.delete(id);
      updateFlowLabel(); render();
    });
    $("flows-all").addEventListener("click", () => { state.flowSel = null; populateFilters(); render(); });
    $("flows-none").addEventListener("click", () => { state.flowSel = new Set(); populateFilters(); render(); });
    $("camp-search").addEventListener("input", (e) => { state.search = e.target.value; renderCampaignTable(periodTotals(rangeMonths()).camps.slice().sort((a, b) => a.date < b.date ? -1 : 1)); });
    $("analysis-month").addEventListener("change", (e) => { state.analysisKey = e.target.value; renderAnalysis(); });
    $("edit-campaigns").addEventListener("change", (e) => { if (e.target.dataset.col === "include") e.target.closest("tr").classList.toggle("is-b2b", !e.target.checked); });
    $("strategy-form").addEventListener("submit", saveStrategy);
    $("edit-month").addEventListener("change", (e) => { state.editKey = e.target.value; renderEditor(); });
    $("month-form").addEventListener("submit", saveMonth);
    $("month-reset").addEventListener("click", renderEditor);
    $("add-month-form").addEventListener("submit", addMonth);
    $("add-campaign").addEventListener("click", () => {
      $("edit-campaigns").insertAdjacentHTML("beforeend", campaignRow({ date: state.editKey + "-01" }));
    });
    $("edit-campaigns").addEventListener("click", (e) => { if (e.target.closest('[data-js="remove-campaign"]')) e.target.closest("tr").remove(); });
    document.addEventListener("click", (e) => { const d = $("flow-picker"); if (d.open && !d.contains(e.target)) d.open = false; });
    if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
  }

  /* ---------- Datos ---------- */
  function showStatus(text) {
    const el = $("status");
    el.textContent = text || "";
    el.hidden = !text;
  }

  function onMonths(snap) {
    state.months = snap.docs.map((d) => d.data()).filter((m) => m && MONTH_KEY_RX.test(m.key))
      .map((m) => Object.assign({}, m, { label: m.label || labelForKey(m.key) }))
      .sort((a, b) => a.key < b.key ? -1 : 1);
    state.loaded = !snap.metadata.fromCache || state.months.length > 0;
    if (state.months.length) populateFilters();
    render();
  }

  /** Datos incrustados por la versión estática (build-static.js); null en el panel con base de datos. */
  function readEmbeddedData() {
    const el = document.getElementById("panel-data");
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }

  /** Versión estática: solo lectura, sin pestaña de edición, con los datos del HTML. */
  function startStatic(data) {
    state.static = true;
    state.canWrite = false;
    if (data.config && data.config.notaFuentes) $("footer-sources").textContent = data.config.notaFuentes;
    state.config = data.config || { flujos: {}, estrategia: {} };
    const tab = document.querySelector('[data-tab="datos"]');
    if (tab) tab.remove();
    const panel = document.querySelector('[data-panel="datos"]');
    if (panel) panel.remove();
    if (state.tab === "datos") state.tab = "general";
    if (data.generatedAt) $("footer-sources").textContent += " Versión estática generada el " + data.generatedAt + ".";
    onMonths({ docs: (data.months || []).map((m) => ({ data: () => m })), metadata: { fromCache: false } });
    applyWriteAccess();
  }

  async function init() {
    bindEvents();
    const hashTab = (location.hash || "").slice(1);
    if (document.querySelector('[data-tab="' + hashTab + '"]')) state.tab = hashTab;
    document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === state.tab)));
    const embedded = readEmbeddedData();
    if (embedded) { startStatic(embedded); return; }
    if (!window.claude || typeof window.claude.use !== "function") { showStatus("Este panel necesita abrirse desde claude.ai para leer sus datos."); return; }
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!db) { showStatus("No se puede acceder a los datos del panel en esta vista. Inicia sesión en claude.ai con una cuenta con acceso."); return; }
    state.db = db;
    if (user) {
      const can = await user.can("data.write");
      state.canWrite = can !== false || (await user.isOwner()) || (await user.canEdit());
    }
    const timer = setTimeout(() => showStatus("Los datos están tardando en cargar. Si no aparecen, recarga la página."), LOAD_TIMEOUT_MS);
    const onError = () => { clearTimeout(timer); showStatus("Se ha perdido la conexión con los datos del panel. Recarga la página."); };
    db.doc(CONFIG_DOC).onSnapshot((snap) => {
      state.config = snap.exists ? snap.data() : { flujos: {}, estrategia: {} };
      if (state.months.length) { populateFilters(); render(); }
    }, onError);
    db.collection(MONTHS_COLLECTION).onSnapshot((snap) => {
      if (!snap.metadata.fromCache) { clearTimeout(timer); showStatus(""); }
      onMonths(snap);
    }, onError);
    applyWriteAccess();
  }

  init();
})();

/* Paneles Email · validación de formularios y peticiones para las sesiones de Claude Code. Funciones puras. */
(() => {
  "use strict";

  const COLLECTION = "paneles";
  const PLATAFORMAS = ["Klaviyo", "iCommkt", "Connectif", "HubSpot"];
  const SOCIEDADES = ["D2C eCommerce", "Webimpacto", "Fotografía eCommerce"];
  const SOCIEDAD_CON_PLANTILLA = "D2C eCommerce";
  const ARTIFACT_URL_RE = /^https:\/\/claude\.ai\/(?:code\/)?artifact\/([A-Za-z0-9-]{8,64})\/?$/;
  const SHEET_URL_RE = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]{20,100}(?:\/edit)?(?:[?#][A-Za-z0-9=&_.#-]{0,100})?$/;
  const CLIENTE_RE = /^[\p{L}\p{N}][\p{L}\p{N} .&'-]{0,59}$/u;
  const CONECTOR_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.-]{1,59}$/u;
  const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

  /** Datos que la skill marca como manuales, por plataforma (SKILL.md y plataformas/*.md). */
  const MANUAL_COMUN = [{ dato: "Venta neta del mes", detalle: "La facilita el cliente." }];
  const MANUAL_POR_PLATAFORMA = {
    Klaviyo: [],
    iCommkt: [
      { dato: "Suscritos (Masterdata_total)", detalle: "El conector de iCommkt no lee segmentos." },
      { dato: "Flujos de Shopify e iCommkt", detalle: "El conector no da los flujos: indica en el nombre de qué herramienta sale cada uno." },
    ],
    Connectif: [{ dato: "Todos los datos del mes", detalle: "Sin conector: campañas, flujos y BBDD desde la exportación del equipo." }],
    HubSpot: [{ dato: "Todos los datos del mes", detalle: "Sin conector: campañas, flujos y BBDD desde la exportación del equipo." }],
  };

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function previousMonth(today) {
    return monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  }

  function isValidMonth(value, today) {
    return MONTH_RE.test(value || "") && value <= monthKey(today);
  }

  function slugify(text) {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function sameName(a, b) {
    return slugify(a || "") === slugify(b || "");
  }

  function validateCliente(value) {
    const name = (value || "").trim();
    return CLIENTE_RE.test(name) ? name : null;
  }

  /** Alta de un panel que ya existe: nombre, enlace del artefacto y plataforma. */
  function validatePanel(fields, paneles) {
    const cliente = validateCliente(fields.cliente);
    const url = (fields.url || "").trim();
    const match = ARTIFACT_URL_RE.exec(url);
    if (!cliente) return { error: "Revisa el nombre del cliente: solo letras, números, espacios y . - & '." };
    if (!match) return { error: "El enlace tiene que ser de un artefacto de claude.ai (https://claude.ai/artifact/…)." };
    if (!PLATAFORMAS.includes(fields.plataforma)) return { error: "Elige una plataforma de la lista." };
    if (paneles.some((p) => p.url === url || p.id === match[1])) return { error: "Ese panel ya está en el listado." };
    return { id: match[1], data: { cliente, url, plataforma: fields.plataforma } };
  }

  /** Petición de un panel nuevo: los datos que el modo A de la skill necesita. */
  function validateNuevoPanel(fields, paneles, today) {
    const cliente = validateCliente(fields.cliente);
    const conector = (fields.conector || "").trim();
    const fuente = (fields.fuente || "").trim();
    if (!cliente) return { error: "Revisa el nombre del cliente: solo letras, números, espacios y . - & '." };
    if (paneles.some((p) => sameName(p.cliente, cliente))) return { error: `Ya hay un panel para ${cliente} en el listado.` };
    if (!PLATAFORMAS.includes(fields.plataforma)) return { error: "Elige una plataforma de la lista." };
    if (!SOCIEDADES.includes(fields.sociedad)) return { error: "Elige la sociedad que factura." };
    if (fields.sociedad !== SOCIEDAD_CON_PLANTILLA) return { error: `Solo existe la plantilla de ${SOCIEDAD_CON_PLANTILLA}. Para ${fields.sociedad} hace falta su plantilla antes de crear el panel.` };
    if (conector && !CONECTOR_RE.test(conector)) return { error: "Revisa el nombre del conector: letras, números, espacios, guiones y puntos." };
    if (!isValidMonth(fields.desde, today)) return { error: "Elige desde qué mes cargar (no puede ser futuro)." };
    if (fuente && !ARTIFACT_URL_RE.test(fuente) && !SHEET_URL_RE.test(fuente)) return { error: "El histórico anterior tiene que ser un artefacto de claude.ai o una hoja de Google." };
    return { data: { cliente, plataforma: fields.plataforma, sociedad: fields.sociedad, conector, desde: fields.desde, fuente, slug: slugify(cliente) } };
  }

  function expectedManual(plataforma) {
    return [...MANUAL_COMUN, ...(MANUAL_POR_PLATAFORMA[plataforma] || [])];
  }

  function hubReference(hubUrl) {
    return hubUrl ? `el artefacto «Paneles Email» (${hubUrl})` : "el artefacto «Paneles Email» (búscalo con Artifact list)";
  }

  function resultFields(month) {
    return [
      `ultimaActualizacion = {fecha: <ahora en ISO>, mes: ${month}, estado: "ok" | "incompleta" | "error", nota: <una frase sobre lo que ha fallado o "Sin incidencias">}`,
      `pendientesManual = [{dato, mes: "AAAA-MM", detalle}] con cada dato que el equipo tiene que meter a mano en «Editar datos» porque sigue vacío tras la carga (venta neta, ingresos de Shopify si el conector no es de su tienda, y lo que su fichero de plataforma marque como manual), o [] si no falta nada`,
    ].join("; ");
  }

  /** Petición del modo B: actualizar un mes de un panel. */
  function buildUpdatePrompt(panel, month, hubUrl) {
    return [
      `Actualiza el panel de email de ${panel.cliente} con la skill panel-email-cliente (modo B, actualizar un mes).`,
      "",
      `- Panel: ${panel.url}`,
      `- Mes: ${month}`,
      `- Plataforma: ${panel.plataforma}`,
      "",
      `Trabaja solo con datos de ${panel.cliente}: no leas ni uses datos de otros clientes.`,
      "",
      `Al terminar, deja el resultado en ${hubReference(hubUrl)} con ArtifactData: update del documento ${COLLECTION}/${panel.id} (léelo antes y usa if_version) con ${resultFields(`"${month}"`)}. No escribas cifras ni datos personales en ese artefacto.`,
    ].join("\n");
  }

  /** Petición del modo A: crear el panel de un cliente nuevo y añadirlo al listado. */
  function buildCreatePrompt(nuevo, hubUrl) {
    return [
      `Crea el panel de email de ${nuevo.cliente} con la skill panel-email-cliente (modo A, crear el panel de un cliente nuevo). Confirmo que es un cliente nuevo.`,
      "",
      `- Cliente: ${nuevo.cliente} (slug: ${nuevo.slug})`,
      `- Sociedad que factura: ${nuevo.sociedad}`,
      `- Plataforma: ${nuevo.plataforma}`,
      `- Conector: ${nuevo.conector || "sin indicar; búscalo entre mis conectores y confirma que es el del cliente antes de leer datos"}`,
      `- Cargar desde: ${nuevo.desde}`,
      `- Histórico anterior: ${nuevo.fuente || "no hay"}`,
      "",
      `Trabaja solo con datos de ${nuevo.cliente}: no leas ni uses datos de otros clientes.`,
      "",
      `Al publicar el panel, regístralo en ${hubReference(hubUrl)} con ArtifactData: set del documento ${COLLECTION}/<id del artefacto del panel> con cliente = "${nuevo.cliente}", plataforma = "${nuevo.plataforma}", url = <enlace del panel>, ${resultFields("<último mes cargado>")}. No escribas cifras ni datos personales en ese artefacto.`,
    ].join("\n");
  }

  window.PanelesEmail = Object.freeze({
    peticiones: Object.freeze({
      COLLECTION, PLATAFORMAS, SOCIEDADES, SOCIEDAD_CON_PLANTILLA, ARTIFACT_URL_RE, MONTH_RE,
      monthKey, previousMonth, isValidMonth, validatePanel, validateNuevoPanel, expectedManual,
      buildUpdatePrompt, buildCreatePrompt,
    }),
  });
})();

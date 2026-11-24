/* Paneles Email · interfaz: listado, avisos de datos manuales, alta de paneles y peticiones para copiar. */
(() => {
  "use strict";

  const P = window.PanelesEmail.peticiones;

  // Constantes
  const HUB_CONFIG_DOC = "config/hub";
  const DB_TIMEOUT_MS = 10000;
  const UPDATE_STATES = {
    ok: { text: "OK", tone: "good" },
    incompleta: { text: "Incompleta", tone: "warn" },
    error: { text: "Error", tone: "bad" },
  };

  // Estado
  const state = {
    db: null,
    paneles: [],
    hubUrl: "",
    canWrite: true,
    userId: null,
  };

  // DOM
  const $ = (sel) => document.querySelector(`[data-js="${sel}"]`);
  const el = {
    heroMeta: $("hero-meta"),
    status: $("status"),
    count: $("count"),
    month: $("update-month"),
    rows: $("rows"),
    empty: $("empty"),
    rowTemplate: $("row-template"),
    groupTemplate: $("group-template"),
    avisosSection: $("avisos-section"),
    avisos: $("avisos"),
    avisoTemplate: $("aviso-template"),
    avisoItemTemplate: $("aviso-item-template"),
    createSection: $("create-section"),
    createForm: $("create-form"),
    createMsg: $("create-msg"),
    addSection: $("add-section"),
    addForm: $("add-form"),
    addMsg: $("add-msg"),
    addGestion: $("add-gestion"),
    addSkillWrap: $("add-skill-wrap"),
    addSkill: $("add-skill"),
    dialog: $("prompt-dialog"),
    promptTitle: $("prompt-title"),
    prompt: $("prompt-text"),
    promptMsg: $("prompt-msg"),
    promptCopy: $("prompt-copy"),
  };

  // Utilidades puras
  function formatMonth(key) {
    if (!P.MONTH_RE.test(key || "")) return "";
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function itemKey(item) {
    return `${item.dato || ""}|${item.mes || ""}`;
  }

  function isPropio(panel) {
    return panel.gestion === "propia";
  }

  function avisoFor(panel) {
    if (Array.isArray(panel.pendientesManual)) {
      const items = panel.pendientesManual.filter((i) => i && typeof i.dato === "string");
      return items.length ? { items, reported: true } : null;
    }
    // Un panel con skill propia no sigue la lista prevista por plataforma: solo se avisa de lo que informe su skill.
    if (isPropio(panel)) return null;
    return { items: P.expectedManual(panel.plataforma), reported: false };
  }

  function platformOrder(plataforma) {
    const i = P.PLATAFORMAS.indexOf(plataforma);
    return i === -1 ? P.PLATAFORMAS.length : i;
  }

  function sortPaneles(list) {
    return [...list].sort((a, b) =>
      platformOrder(a.plataforma) - platformOrder(b.plataforma)
      || String(a.cliente).localeCompare(String(b.cliente), "es"));
  }

  function readForm(form) {
    return Object.fromEntries([...form.querySelectorAll("[data-field]")].map((f) => [f.dataset.field, f.value]));
  }

  // Efectos: interfaz
  function setStatus(text) {
    el.status.textContent = text || "";
    el.status.hidden = !text;
  }

  function setMsg(node, text, tone) {
    node.textContent = text || "";
    node.classList.toggle("form__msg--ok", tone === "ok");
    node.classList.toggle("form__msg--error", tone === "error");
  }

  function setBadge(node, info) {
    node.hidden = !info;
    if (!info) return;
    node.textContent = info.text;
    node.className = `badge badge--${info.tone}`;
  }

  function fillRow(row, panel) {
    const slot = (name) => row.querySelector(`[data-slot="${name}"]`);
    const link = slot("link");
    link.textContent = panel.cliente;
    link.href = panel.url;
    link.setAttribute("aria-label", `Abrir el panel de ${panel.cliente} en una pestaña nueva`);
    slot("plataforma").textContent = panel.plataforma || "";

    const upd = panel.ultimaActualizacion;
    setBadge(slot("upd-badge"), upd && UPDATE_STATES[upd.estado]);
    slot("upd-text").textContent = upd ? `${formatMonth(upd.mes)} · ${formatDateTime(upd.fecha)}` : "Sin registro";
    slot("upd-note").textContent = (upd && upd.nota) || "";

    const updateBtn = row.querySelector('[data-action="update"]');
    updateBtn.dataset.id = panel.id;
    updateBtn.setAttribute("aria-label", `Petición de actualización de ${panel.cliente}`);
    const propio = isPropio(panel);
    updateBtn.hidden = propio;
    const gestion = slot("gestion");
    gestion.hidden = !propio;
    gestion.textContent = propio ? `Se actualiza con su skill propia${panel.skill ? ` (${panel.skill})` : ""}, no con la petición de este listado.` : "";
    const removeBtn = row.querySelector('[data-action="remove"]');
    removeBtn.dataset.id = panel.id;
    removeBtn.hidden = !state.canWrite;
    removeBtn.setAttribute("aria-label", `Quitar ${panel.cliente} del listado`);
  }

  function buildAvisoItem(panel, item, reported) {
    const li = el.avisoItemTemplate.content.firstElementChild.cloneNode(true);
    li.querySelector('[data-slot="dato"]').textContent = item.dato;
    li.querySelector('[data-slot="mes"]').textContent = item.mes ? `· ${formatMonth(item.mes)}` : "";
    li.querySelector('[data-slot="detalle"]').textContent = item.detalle || "";
    const btn = li.querySelector('[data-action="done"]');
    btn.hidden = !reported || !state.canWrite;
    btn.dataset.id = panel.id;
    btn.dataset.key = itemKey(item);
    btn.setAttribute("aria-label", `Marcar como hecho: ${item.dato} de ${panel.cliente}`);
    return li;
  }

  function buildAviso(panel, aviso) {
    const card = el.avisoTemplate.content.firstElementChild.cloneNode(true);
    card.classList.toggle("aviso--previsto", !aviso.reported);
    card.querySelector('[data-slot="cliente"]').textContent = panel.cliente;
    card.querySelector('[data-slot="origen"]').textContent = aviso.reported
      ? "según la última actualización"
      : "previsto por su plataforma, sin revisar todavía";
    card.querySelector('[data-slot="items"]').replaceChildren(...aviso.items.map((item) => buildAvisoItem(panel, item, aviso.reported)));
    const link = card.querySelector('[data-slot="link"]');
    link.href = panel.url;
    link.setAttribute("aria-label", `Abrir el panel de ${panel.cliente} para meter los datos`);
    return card;
  }

  function renderAvisos(list) {
    const cards = list.map((panel) => [panel, avisoFor(panel)]).filter(([, aviso]) => aviso).map(([panel, aviso]) => buildAviso(panel, aviso));
    el.avisos.replaceChildren(...cards);
    el.avisosSection.hidden = cards.length === 0;
  }

  function buildGroupRow(plataforma, count) {
    const row = el.groupTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('[data-slot="grupo"]').textContent = `${plataforma || "Sin plataforma"} · ${count} ${count === 1 ? "panel" : "paneles"}`;
    return row;
  }

  function render() {
    const list = sortPaneles(state.paneles.filter((p) => P.ARTIFACT_URL_RE.test(p.url || "")));
    const rows = [];
    list.forEach((panel, i) => {
      if (i === 0 || list[i - 1].plataforma !== panel.plataforma) {
        rows.push(buildGroupRow(panel.plataforma, list.filter((p) => p.plataforma === panel.plataforma).length));
      }
      const row = el.rowTemplate.content.firstElementChild.cloneNode(true);
      fillRow(row, panel);
      rows.push(row);
    });
    el.rows.replaceChildren(...rows);
    renderAvisos(list);
    el.empty.hidden = list.length > 0;
    el.count.textContent = `${list.length} ${list.length === 1 ? "panel" : "paneles"}`;
    el.heroMeta.textContent = state.canWrite
      ? "Abre cada panel, copia su petición de actualización o prepara uno nuevo."
      : "Solo lectura: tu acceso no permite añadir paneles ni marcar datos como hechos.";
    el.addSection.hidden = !state.canWrite;
  }

  function fillSelects() {
    const sources = {
      plataformas: P.PLATAFORMAS.map((v) => [v, v]),
      sociedades: P.SOCIEDADES.map((v) => [v, v]),
      gestiones: Object.entries(P.GESTIONES).map(([v, t]) => [t, v]),
    };
    document.querySelectorAll("select[data-options]").forEach((select) => {
      select.replaceChildren(...sources[select.dataset.options].map(([t, v]) => new Option(t, v)));
    });
  }

  function syncSkillField() {
    const propia = el.addGestion.value === "propia";
    el.addSkillWrap.hidden = !propia;
    el.addSkill.required = propia;
  }

  function openPromptDialog(title, prompt) {
    el.promptTitle.textContent = title;
    el.prompt.value = prompt;
    setMsg(el.promptMsg, "");
    el.dialog.showModal();
  }

  // Efectos: datos
  function subscribePaneles() {
    const timer = setTimeout(() => setStatus("La base de datos tarda en responder. Si no aparecen los paneles, vuelve a abrir la página."), DB_TIMEOUT_MS);
    state.db.collection(P.COLLECTION).onSnapshot(
      (snap) => {
        clearTimeout(timer);
        setStatus("");
        state.paneles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        render();
      },
      (err) => { clearTimeout(timer); setStatus(`No se pueden leer los paneles (${err.code}).`); },
    );
  }

  async function loadHubUrl() {
    try {
      const snap = await state.db.doc(HUB_CONFIG_DOC).get();
      const url = snap.exists ? String(snap.data().url || "") : "";
      state.hubUrl = P.ARTIFACT_URL_RE.test(url) ? url : "";
    } catch {
      state.hubUrl = "";
    }
  }

  async function copyPrompt() {
    el.prompt.select();
    try {
      await navigator.clipboard.writeText(el.prompt.value);
      setMsg(el.promptMsg, "Petición copiada. Pégala en una conversación nueva de Claude.", "ok");
    } catch {
      setMsg(el.promptMsg, "No se ha podido copiar automáticamente: el texto está seleccionado, cópialo con Ctrl+C o Cmd+C.", "error");
    }
  }

  // Manejadores
  function handleUpdateClick(panel) {
    if (isPropio(panel)) return;
    const month = el.month.value;
    if (!P.isValidMonth(month, new Date())) {
      setStatus("Elige un mes válido que no sea futuro en «Mes a actualizar».");
      el.month.focus();
      return;
    }
    openPromptDialog(`Actualizar ${panel.cliente} · ${formatMonth(month)}`, P.buildUpdatePrompt(panel, month, state.hubUrl));
  }

  function handleCreate(event) {
    event.preventDefault();
    const { data, error } = P.validateNuevoPanel(readForm(el.createForm), state.paneles, new Date());
    if (error) { setMsg(el.createMsg, error, "error"); return; }
    setMsg(el.createMsg, "");
    openPromptDialog(`Crear el panel de ${data.cliente}`, P.buildCreatePrompt(data, state.hubUrl));
  }

  async function handleAdd(event) {
    event.preventDefault();
    const { id, data, error } = P.validatePanel(readForm(el.addForm), state.paneles);
    if (error) { setMsg(el.addMsg, error, "error"); return; }
    try {
      await state.db.doc(`${P.COLLECTION}/${id}`).set({ ...data, alta: { fecha: new Date().toISOString(), por: state.userId } });
      el.addForm.reset();
      syncSkillField();
      setMsg(el.addMsg, `${data.cliente} añadido.`, "ok");
    } catch (err) {
      setMsg(el.addMsg, `No se ha podido guardar (${err.code}).`, "error");
    }
  }

  async function handleRemove(panel) {
    if (!window.confirm(`¿Quitar ${panel.cliente} del listado? El panel no se borra, solo deja de aparecer aquí.`)) return;
    try {
      await state.db.doc(`${P.COLLECTION}/${panel.id}`).delete();
      setStatus(`${panel.cliente} quitado del listado.`);
    } catch (err) {
      setStatus(`No se ha podido quitar (${err.code}).`);
    }
  }

  async function handleDone(panel, key) {
    const items = (panel.pendientesManual || []).filter((item) => itemKey(item) !== key);
    try {
      await state.db.doc(`${P.COLLECTION}/${panel.id}`).update({ pendientesManual: items });
    } catch (err) {
      setStatus(`No se ha podido marcar como hecho (${err.code}).`);
    }
  }

  function handleActionClick(event) {
    const btn = event.target.closest("[data-action]");
    const panel = btn && state.paneles.find((p) => p.id === btn.dataset.id);
    if (!panel) return;
    if (btn.dataset.action === "update") handleUpdateClick(panel);
    if (btn.dataset.action === "remove") handleRemove(panel);
    if (btn.dataset.action === "done") handleDone(panel, btn.dataset.key);
  }

  // Inicio
  function bindEvents() {
    el.rows.addEventListener("click", handleActionClick);
    el.avisos.addEventListener("click", handleActionClick);
    el.createForm.addEventListener("submit", handleCreate);
    el.addForm.addEventListener("submit", handleAdd);
    el.addGestion.addEventListener("change", syncSkillField);
    el.promptCopy.addEventListener("click", copyPrompt);
  }

  async function init() {
    const today = new Date();
    el.month.value = P.previousMonth(today);
    el.month.max = P.monthKey(today);
    el.createForm.querySelector('[data-field="desde"]').max = P.monthKey(today);
    fillSelects();
    syncSkillField();
    bindEvents();
    render();

    const [db, user] = await Promise.all(["db", "user"].map((name) => window.claude.use(name)));
    state.db = db;
    if (!db) {
      setStatus("Inicia sesión en claude.ai para ver el listado de paneles.");
      el.heroMeta.textContent = "Sin acceso a la base de datos.";
      return;
    }
    if (user) {
      state.canWrite = (await user.can("data.write")) !== false;
      state.userId = (await user.id()) || null;
    }
    await loadHubUrl();
    subscribePaneles();
  }

  init();
})();

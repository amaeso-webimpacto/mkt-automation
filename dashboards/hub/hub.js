/* Paneles Email · interfaz: listado, avisos de datos manuales, alta y lanzamiento de sesiones con la skill. */
(() => {
  "use strict";

  const P = window.PanelesEmail.peticiones;

  // Constantes
  const HUB_CONFIG_DOC = "config/hub";
  const REMOTE_SERVER = "Claude Code Remote";
  const TOOL_CREATE = "create_session";
  const TOOL_ENVS = "list_environments";
  const TOOL_GET = "get_session";
  const REPO_URL = "https://github.com/amaeso-webimpacto/mkt-automation";
  const REPO_BRANCH = "main";
  const SESSION_BASE_URL = "https://claude.ai/code/";
  const SESSION_ID_RE = /session_[A-Za-z0-9]+/;
  const DB_TIMEOUT_MS = 10000;
  const ENV_STORAGE_KEY = "hub.environmentId";
  const ESTADO_CREANDO = "creando";
  const SESSION_STATES = {
    working: { text: "En curso", tone: "ok" },
    blocked: { text: "Esperando permiso", tone: "warn" },
    review_ready: { text: "Lista", tone: "good" },
    completed: { text: "Terminada", tone: "good" },
    failed: { text: "Con error", tone: "bad" },
  };
  const UPDATE_STATES = {
    ok: { text: "OK", tone: "good" },
    incompleta: { text: "Incompleta", tone: "warn" },
    error: { text: "Error", tone: "bad" },
  };
  const CREANDO_BADGE = { text: "Creando", tone: "warn" };
  const MCP_ERROR_COPY = {
    server_not_connected: "Añade el conector Claude Code Remote en claude.ai, Ajustes → Conectores, y vuelve a abrir esta página.",
    needs_reauth: "Vuelve a conectar Claude Code Remote en claude.ai, Ajustes → Conectores.",
    selection_required: "Elige qué conector Claude Code Remote usar en el aviso de claude.ai.",
    not_in_manifest: "No has permitido el conector Claude Code Remote en esta página. Actívalo en el menú Permisos del artefacto.",
    approval_required: "Hace falta tu aprobación para usar Claude Code Remote desde esta página.",
    blocked_by_policy: "La política de tu organización no permite lanzar sesiones desde esta página.",
    server_unavailable: "Claude Code Remote no ha respondido. Puede que la sesión se haya creado: revisa claude.ai/code antes de volver a lanzarla.",
    upstream_error: "No se ha podido confirmar la sesión. Revisa claude.ai/code antes de volver a lanzarla.",
  };

  // Estado
  const state = {
    db: null,
    user: null,
    mcp: null,
    remoteTools: null,
    paneles: [],
    hubUrl: "",
    canWrite: true,
    names: {},
    sessionStatus: {},
    busy: new Set(),
    pendingLaunch: null,
    environments: null,
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
    dialog: $("launch-dialog"),
    launchTitle: $("launch-title"),
    envGroup: $("env-group"),
    envSelect: $("launch-env"),
    prompt: $("launch-prompt"),
    launchMsg: $("launch-msg"),
    launchSubmit: $("launch-submit"),
    launchCopy: $("launch-copy"),
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

  function isCreating(panel) {
    return !panel.url && panel.estado === ESTADO_CREANDO;
  }

  function itemKey(item) {
    return `${item.dato || ""}|${item.mes || ""}`;
  }

  function avisoFor(panel) {
    if (Array.isArray(panel.pendientesManual)) {
      const items = panel.pendientesManual.filter((i) => i && typeof i.dato === "string");
      return items.length ? { items, reported: true } : null;
    }
    if (isCreating(panel)) return null;
    return { items: P.expectedManual(panel.plataforma), reported: false };
  }

  function extractSessionId(result) {
    const payload = result && result.payload;
    const candidates = [payload && payload.session_id, payload && payload.id, payload && payload.session && payload.session.id];
    const direct = candidates.find((v) => typeof v === "string" && SESSION_ID_RE.test(v));
    if (direct) return direct.match(SESSION_ID_RE)[0];
    const found = JSON.stringify(payload ?? result ?? "").match(SESSION_ID_RE);
    return found ? found[0] : null;
  }

  function extractEnvironments(result) {
    const list = (result && result.payload && result.payload.environments) || [];
    return list
      .filter((e) => e && typeof e.environment_id === "string" && e.state !== "archived")
      .map((e) => ({ id: e.environment_id, name: String(e.name || e.environment_id) }));
  }

  function extractStatusBucket(result) {
    const p = (result && result.payload) || {};
    return p.status_bucket || (p.session && p.session.status_bucket) || null;
  }

  function sortPaneles(list) {
    return [...list].sort((a, b) => String(a.cliente).localeCompare(String(b.cliente), "es"));
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

  function mcpErrorText(err) {
    if (err && err.code === "tool_error") return `Claude Code Remote ha respondido con un error: ${err.message || "sin detalle"}.`;
    return (err && MCP_ERROR_COPY[err.code]) || "No se ha podido usar Claude Code Remote desde esta página.";
  }

  function launchErrorText(err) {
    const code = err && err.code;
    if (code === "tool_error" || code in MCP_ERROR_COPY) return mcpErrorText(err);
    return `No se ha podido lanzar la sesión (${code || "error desconocido"}).`;
  }

  function setBadge(node, info) {
    node.hidden = !info;
    if (!info) return;
    node.textContent = info.text;
    node.className = `badge badge--${info.tone}`;
  }

  function fillLastUpdate(slot, panel) {
    const upd = panel.ultimaActualizacion;
    if (isCreating(panel)) {
      setBadge(slot("upd-badge"), CREANDO_BADGE);
      slot("upd-text").textContent = "El enlace llegará cuando la sesión publique el panel.";
      slot("upd-note").textContent = "";
      return;
    }
    setBadge(slot("upd-badge"), upd && UPDATE_STATES[upd.estado]);
    slot("upd-text").textContent = upd ? `${formatMonth(upd.mes)} · ${formatDateTime(upd.fecha)}` : "Sin registro";
    slot("upd-note").textContent = (upd && upd.nota) || "";
  }

  function fillLastRequest(slot, panel) {
    const req = panel.ultimaPeticion;
    const who = req && req.por ? state.names[req.por] || "" : "";
    const what = req && req.tipo === "crear" ? "Creación" : formatMonth(req && req.mes);
    slot("req-text").textContent = req ? `${what} · ${formatDateTime(req.fecha)}${who ? ` · ${who}` : ""}` : "—";
    setBadge(slot("req-badge"), req && SESSION_STATES[state.sessionStatus[req.sessionId]]);
    const link = slot("req-link");
    link.hidden = !(req && req.sessionId);
    if (req && req.sessionId) {
      link.href = SESSION_BASE_URL + req.sessionId;
      link.setAttribute("aria-label", `Ver la sesión de ${panel.cliente}`);
    }
  }

  function fillRow(row, panel) {
    const slot = (name) => row.querySelector(`[data-slot="${name}"]`);
    const link = slot("link");
    link.hidden = !panel.url;
    slot("name-text").hidden = Boolean(panel.url);
    if (panel.url) {
      link.textContent = panel.cliente;
      link.href = panel.url;
      link.setAttribute("aria-label", `Abrir el panel de ${panel.cliente} en una pestaña nueva`);
    } else {
      slot("name-text").textContent = panel.cliente;
    }
    slot("plataforma").textContent = panel.plataforma || "";
    fillLastUpdate(slot, panel);
    fillLastRequest(slot, panel);

    row.querySelectorAll("[data-action]").forEach((btn) => {
      btn.dataset.id = panel.id;
      btn.hidden = !state.canWrite;
    });
    const updateBtn = row.querySelector('[data-action="update"]');
    updateBtn.setAttribute("aria-label", `Actualizar el panel de ${panel.cliente}`);
    updateBtn.disabled = !panel.url || state.busy.has(panel.id);
    row.querySelector('[data-action="remove"]').setAttribute("aria-label", `Quitar ${panel.cliente} del listado`);
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
    link.hidden = !panel.url;
    if (panel.url) {
      link.href = panel.url;
      link.setAttribute("aria-label", `Abrir el panel de ${panel.cliente} para meter los datos`);
    }
    return card;
  }

  function renderAvisos(list) {
    const cards = list.map((panel) => [panel, avisoFor(panel)]).filter(([, aviso]) => aviso).map(([panel, aviso]) => buildAviso(panel, aviso));
    el.avisos.replaceChildren(...cards);
    el.avisosSection.hidden = cards.length === 0;
  }

  function render() {
    const list = sortPaneles(state.paneles);
    el.rows.replaceChildren(...list.map((panel) => {
      const row = el.rowTemplate.content.firstElementChild.cloneNode(true);
      fillRow(row, panel);
      return row;
    }));
    renderAvisos(list);
    el.empty.hidden = list.length > 0;
    el.count.textContent = `${list.length} ${list.length === 1 ? "panel" : "paneles"}`;
    el.heroMeta.textContent = state.canWrite
      ? "Abre cada panel, lanza su actualización mensual o crea uno nuevo."
      : "Solo lectura: tu acceso no permite añadir paneles ni lanzar sesiones.";
    el.addSection.hidden = !state.canWrite;
    el.createSection.hidden = !state.canWrite;
  }

  function fillSelects() {
    const sources = { plataformas: P.PLATAFORMAS, sociedades: P.SOCIEDADES };
    document.querySelectorAll("select[data-options]").forEach((select) => {
      select.replaceChildren(...sources[select.dataset.options].map((v) => new Option(v, v)));
    });
  }

  // Efectos: datos
  async function currentUserId() {
    return state.user ? (await state.user.id()) || null : null;
  }

  async function resolveNames(ids) {
    const missing = [...new Set(ids)].filter((id) => id && !(id in state.names));
    if (!missing.length || !state.user) return;
    try {
      const profiles = await state.user.profiles(missing);
      missing.forEach((id) => { state.names[id] = (profiles[id] && profiles[id].name) || ""; });
    } catch {
      missing.forEach((id) => { state.names[id] = ""; });
    }
  }

  function hasRemoteTool(name) {
    return Boolean(state.remoteTools && state.remoteTools.has(name));
  }

  async function loadRemoteTools() {
    if (!state.mcp) return;
    try {
      const { servers } = await state.mcp.listTools(REMOTE_SERVER);
      const remote = servers.find((s) => s.server === REMOTE_SERVER);
      state.remoteTools = new Set(remote ? remote.tools.map((t) => t.name) : []);
    } catch {
      state.remoteTools = new Set();
    }
  }

  async function isRemoteGranted() {
    const permissions = await window.claude.use("permissions");
    if (!permissions) return false;
    const granted = await permissions.state(`mcp:${REMOTE_SERVER}`).catch(() => "unavailable");
    return granted === "granted";
  }

  /** Estado de las sesiones lanzadas; solo si el conector ya está permitido, para no pedir permiso al abrir. */
  async function refreshSessionStatus(sessionIds) {
    const pending = sessionIds.filter((id) => id && !(id in state.sessionStatus));
    if (!pending.length || !hasRemoteTool(TOOL_GET) || !(await isRemoteGranted())) return;
    await Promise.all(pending.map(async (id) => {
      state.sessionStatus[id] = null;
      try {
        state.sessionStatus[id] = extractStatusBucket(await state.mcp.callTool(REMOTE_SERVER, TOOL_GET, { session_id: id }));
      } catch {
        state.sessionStatus[id] = null;
      }
    }));
  }

  async function onPanelesSnapshot(snap) {
    state.paneles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
    const requests = state.paneles.map((p) => p.ultimaPeticion).filter(Boolean);
    await resolveNames(requests.map((r) => r.por));
    await refreshSessionStatus(requests.map((r) => r.sessionId));
    render();
  }

  function subscribePaneles() {
    const timer = setTimeout(() => setStatus("La base de datos tarda en responder. Si no aparecen los paneles, vuelve a abrir la página."), DB_TIMEOUT_MS);
    state.db.collection(P.COLLECTION).onSnapshot(
      (snap) => { clearTimeout(timer); setStatus(""); onPanelesSnapshot(snap); },
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

  async function loadEnvironments() {
    if (state.environments) return state.environments;
    state.environments = extractEnvironments(await state.mcp.callTool(REMOTE_SERVER, TOOL_ENVS, { limit: 50 }));
    return state.environments;
  }

  function readStoredEnvironment() {
    try { return localStorage.getItem(ENV_STORAGE_KEY) || ""; } catch { return ""; }
  }

  function storeEnvironment(id) {
    try { localStorage.setItem(ENV_STORAGE_KEY, id); } catch { /* preferencia local opcional */ }
  }

  async function createSession({ prompt, title, tag, environmentId }) {
    const result = await state.mcp.callTool(REMOTE_SERVER, TOOL_CREATE, {
      prompt,
      title,
      environment_id: environmentId,
      source_url: REPO_URL,
      source_revision: REPO_BRANCH,
      tags: ["panel-email", tag],
    });
    const sessionId = extractSessionId(result);
    if (sessionId) state.sessionStatus[sessionId] = "working";
    return sessionId;
  }

  async function recordRequest(panelId, request) {
    try {
      await state.db.doc(`${P.COLLECTION}/${panelId}`).update({ ultimaPeticion: { ...request, fecha: new Date().toISOString(), por: await currentUserId() } });
    } catch (err) {
      setStatus(`La sesión se ha lanzado, pero no se ha podido guardar aquí (${err.code}).`);
    }
  }

  async function copyPrompt() {
    el.prompt.select();
    try {
      await navigator.clipboard.writeText(el.prompt.value);
      setMsg(el.launchMsg, "Petición copiada. Pégala en una sesión de Claude Code con el repositorio mkt-automation.", "ok");
    } catch {
      setMsg(el.launchMsg, "No se ha podido copiar automáticamente: el texto está seleccionado, cópialo con Ctrl+C o Cmd+C.", "error");
    }
  }

  // Lanzamiento de sesiones
  async function openLaunchDialog(launch) {
    state.pendingLaunch = launch;
    el.dialog.returnValue = "";
    el.launchTitle.textContent = launch.title;
    el.prompt.value = launch.prompt;
    setMsg(el.launchMsg, "");
    el.dialog.showModal();
    await prepareEnvironments();
  }

  async function prepareEnvironments() {
    const canLaunch = hasRemoteTool(TOOL_CREATE) && hasRemoteTool(TOOL_ENVS);
    el.launchSubmit.disabled = true;
    el.envGroup.hidden = !canLaunch;
    if (!canLaunch) {
      setMsg(el.launchMsg, "Desde aquí no se pueden lanzar sesiones (falta el conector Claude Code Remote o no lo permite tu organización). Copia la petición y pégala en Claude Code.", "error");
      return;
    }
    try {
      const envs = await loadEnvironments();
      if (!envs.length) {
        setMsg(el.launchMsg, "No tienes entornos de Claude Code. Crea uno en claude.ai/code o copia la petición.", "error");
        return;
      }
      const stored = readStoredEnvironment();
      el.envSelect.replaceChildren(...envs.map((e) => new Option(e.name, e.id, false, e.id === stored)));
      el.launchSubmit.disabled = false;
    } catch (err) {
      setMsg(el.launchMsg, mcpErrorText(err), "error");
    }
  }

  async function runUpdate(panel, month, environmentId) {
    setStatus(`Lanzando la actualización de ${panel.cliente}…`);
    const sessionId = await createSession({
      prompt: P.buildUpdatePrompt(panel, month, state.hubUrl),
      title: `Panel Email ${panel.cliente} · ${month}`,
      tag: `panel-email:${panel.id}`,
      environmentId,
    });
    await recordRequest(panel.id, { tipo: "actualizar", mes: month, sessionId });
    return sessionId;
  }

  async function runCreate(id, nuevo, environmentId) {
    setStatus(`Lanzando la creación del panel de ${nuevo.cliente}…`);
    const ref = state.db.doc(`${P.COLLECTION}/${id}`);
    await ref.set({
      cliente: nuevo.cliente, plataforma: nuevo.plataforma, url: null, estado: ESTADO_CREANDO,
      alta: { fecha: new Date().toISOString(), por: await currentUserId() },
    });
    try {
      const sessionId = await createSession({
        prompt: P.buildCreatePrompt(id, nuevo, state.hubUrl),
        title: `Crear Panel Email ${nuevo.cliente}`,
        tag: `panel-email:${id}`,
        environmentId,
      });
      await recordRequest(id, { tipo: "crear", mes: nuevo.desde, sessionId });
      el.createForm.reset();
      return sessionId;
    } catch (err) {
      if (err && (err.code === "server_unavailable" || err.code === "upstream_error")) throw err;
      await ref.delete().catch(() => {});
      throw err;
    }
  }

  async function launchPending(environmentId) {
    const launch = state.pendingLaunch;
    state.pendingLaunch = null;
    if (!launch || !environmentId) return;
    storeEnvironment(environmentId);
    state.busy.add(launch.id);
    render();
    try {
      const sessionId = await launch.run(environmentId);
      setStatus(sessionId
        ? `Sesión lanzada para ${launch.cliente}. Síguela con «Ver sesión».`
        : `Sesión lanzada para ${launch.cliente}, pero no se ha podido leer su identificador. Búscala en claude.ai/code.`);
    } catch (err) {
      setStatus(launchErrorText(err));
    } finally {
      state.busy.delete(launch.id);
      render();
    }
  }

  // Manejadores
  function handleUpdateClick(panel) {
    const month = el.month.value;
    if (!P.isValidMonth(month, new Date())) {
      setStatus("Elige un mes válido que no sea futuro en «Mes a actualizar».");
      el.month.focus();
      return;
    }
    openLaunchDialog({
      id: panel.id,
      cliente: panel.cliente,
      title: `Actualizar ${panel.cliente} · ${formatMonth(month)}`,
      prompt: P.buildUpdatePrompt(panel, month, state.hubUrl),
      run: (environmentId) => runUpdate(panel, month, environmentId),
    });
  }

  function handleCreate(event) {
    event.preventDefault();
    const { id, data, error } = P.validateNuevoPanel(readForm(el.createForm), state.paneles, new Date());
    if (error) { setMsg(el.createMsg, error, "error"); return; }
    setMsg(el.createMsg, "");
    openLaunchDialog({
      id,
      cliente: data.cliente,
      title: `Crear el panel de ${data.cliente}`,
      prompt: P.buildCreatePrompt(id, data, state.hubUrl),
      run: (environmentId) => runCreate(id, data, environmentId),
    });
  }

  async function handleAdd(event) {
    event.preventDefault();
    const { id, data, error } = P.validatePanel(readForm(el.addForm), state.paneles);
    if (error) { setMsg(el.addMsg, error, "error"); return; }
    try {
      await state.db.doc(`${P.COLLECTION}/${id}`).set({ ...data, alta: { fecha: new Date().toISOString(), por: await currentUserId() } });
      el.addForm.reset();
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

  function handleDialogClose() {
    if (el.dialog.returnValue !== "launch") { state.pendingLaunch = null; return; }
    launchPending(el.envSelect.value);
  }

  // Inicio
  function bindEvents() {
    el.rows.addEventListener("click", handleActionClick);
    el.avisos.addEventListener("click", handleActionClick);
    el.createForm.addEventListener("submit", handleCreate);
    el.addForm.addEventListener("submit", handleAdd);
    el.dialog.addEventListener("close", handleDialogClose);
    el.launchCopy.addEventListener("click", copyPrompt);
  }

  async function init() {
    const today = new Date();
    el.month.value = P.previousMonth(today);
    el.month.max = P.monthKey(today);
    el.createForm.querySelector('[data-field="desde"]').max = P.monthKey(today);
    fillSelects();
    bindEvents();
    render();

    const [db, user, mcp] = await Promise.all(["db", "user", "mcp"].map((name) => window.claude.use(name)));
    Object.assign(state, { db, user, mcp });
    if (!db) {
      setStatus("Inicia sesión en claude.ai para ver y editar el listado de paneles.");
      el.heroMeta.textContent = "Sin acceso a la base de datos.";
      return;
    }
    state.canWrite = user ? (await user.can("data.write")) !== false : true;
    await Promise.all([loadHubUrl(), loadRemoteTools()]);
    subscribePaneles();
  }

  init();
})();

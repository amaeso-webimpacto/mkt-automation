/* Listado de paneles de email: alta de paneles y lanzamiento de la skill panel-email-cliente por cliente. */
(() => {
  "use strict";

  // Constantes
  const COLLECTION = "paneles";
  const HUB_CONFIG_DOC = "config/hub";
  const REMOTE_SERVER = "Claude Code Remote";
  const TOOL_CREATE = "create_session";
  const TOOL_ENVS = "list_environments";
  const TOOL_GET = "get_session";
  const REPO_URL = "https://github.com/amaeso-webimpacto/mkt-automation";
  const REPO_BRANCH = "main";
  const SESSION_BASE_URL = "https://claude.ai/code/";
  const PLATAFORMAS = ["Klaviyo", "iCommkt", "Connectif", "HubSpot"];
  const ARTIFACT_URL_RE = /^https:\/\/claude\.ai\/(?:code\/)?artifact\/([A-Za-z0-9-]{8,64})\/?$/;
  const CLIENTE_RE = /^[\p{L}\p{N}][\p{L}\p{N} .&'-]{0,59}$/u;
  const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  const SESSION_ID_RE = /session_[A-Za-z0-9]+/;
  const DB_TIMEOUT_MS = 10000;
  const ENV_STORAGE_KEY = "hub.environmentId";
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
    launching: null,
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
    addSection: $("add-section"),
    addForm: $("add-form"),
    addMsg: $("add-msg"),
    dialog: $("launch-dialog"),
    launchClient: $("launch-client"),
    envGroup: $("env-group"),
    envSelect: $("launch-env"),
    prompt: $("launch-prompt"),
    launchMsg: $("launch-msg"),
    launchSubmit: $("launch-submit"),
    launchCopy: $("launch-copy"),
  };

  // Utilidades puras
  function previousMonth(today) {
    const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function currentMonth(today) {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }

  function isValidMonth(value, today) {
    return MONTH_RE.test(value) && value <= currentMonth(today);
  }

  function formatMonth(key) {
    if (!MONTH_RE.test(key || "")) return "";
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function validatePanel({ cliente, url, plataforma }) {
    const name = (cliente || "").trim();
    const link = (url || "").trim();
    if (!CLIENTE_RE.test(name)) return { error: "Revisa el nombre del cliente: solo letras, números, espacios y . - & '." };
    const match = ARTIFACT_URL_RE.exec(link);
    if (!match) return { error: "El enlace tiene que ser de un artefacto de claude.ai (https://claude.ai/artifact/…)." };
    if (!PLATAFORMAS.includes(plataforma)) return { error: "Elige una plataforma de la lista." };
    return { id: match[1], data: { cliente: name, url: link, plataforma } };
  }

  /** Petición que recibe la sesión de Claude Code: un cliente, un panel y un mes. */
  function buildPrompt(panel, month, hubUrl) {
    const hub = hubUrl ? `el artefacto «Paneles Email» (${hubUrl})` : "el artefacto «Paneles Email» (búscalo con Artifact list)";
    return [
      `Actualiza el panel de email de ${panel.cliente} con la skill panel-email-cliente (modo B, actualizar un mes).`,
      "",
      `- Panel: ${panel.url}`,
      `- Mes: ${month}`,
      `- Plataforma: ${panel.plataforma}`,
      "",
      `Esta sesión es solo para ${panel.cliente}: no leas ni uses datos de otros clientes.`,
      "",
      `Al terminar, deja el resultado en ${hub} con ArtifactData: update del documento ${COLLECTION}/${panel.id} (léelo antes y usa if_version) con el campo ultimaActualizacion = {fecha: <ahora en ISO>, mes: "${month}", estado: "ok" | "incompleta" | "error", nota: <una frase sobre lo que falta de dato manual o lo que ha fallado>}. No escribas cifras ni datos personales en ese artefacto.`,
      "",
      "No hagas commits ni push.",
    ].join("\n");
  }

  function extractSessionId(result) {
    const payload = result && result.payload;
    const candidates = [payload && payload.session_id, payload && payload.id, payload && payload.session && payload.session.id];
    const direct = candidates.find((v) => typeof v === "string" && SESSION_ID_RE.test(v));
    if (direct) return direct.match(SESSION_ID_RE)[0];
    const text = JSON.stringify(payload ?? result ?? "");
    const found = text.match(SESSION_ID_RE);
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
    return [...list].sort((a, b) => a.cliente.localeCompare(b.cliente, "es"));
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

  function setBadge(node, info) {
    node.hidden = !info;
    if (!info) return;
    node.textContent = info.text;
    node.className = `badge badge--${info.tone}`;
  }

  function fillRow(row, panel) {
    const slot = (name) => row.querySelector(`[data-slot="${name}"]`);
    slot("link").textContent = panel.cliente;
    slot("link").href = panel.url;
    slot("link").setAttribute("aria-label", `Abrir el panel de ${panel.cliente} en una pestaña nueva`);
    slot("plataforma").textContent = panel.plataforma || "";

    const upd = panel.ultimaActualizacion;
    setBadge(slot("upd-badge"), upd && UPDATE_STATES[upd.estado]);
    slot("upd-text").textContent = upd ? `${formatMonth(upd.mes)} · ${formatDateTime(upd.fecha)}` : "Sin registro";
    slot("upd-note").textContent = (upd && upd.nota) || "";

    const req = panel.ultimaPeticion;
    const who = req && req.por ? state.names[req.por] || "" : "";
    slot("req-text").textContent = req ? `${formatMonth(req.mes)} · ${formatDateTime(req.fecha)}${who ? ` · ${who}` : ""}` : "—";
    setBadge(slot("req-badge"), req && SESSION_STATES[state.sessionStatus[req.sessionId]]);
    const link = slot("req-link");
    link.hidden = !(req && req.sessionId);
    if (req && req.sessionId) {
      link.href = SESSION_BASE_URL + req.sessionId;
      link.setAttribute("aria-label", `Ver la sesión de actualización de ${panel.cliente}`);
    }

    row.querySelectorAll("[data-action]").forEach((btn) => {
      btn.dataset.id = panel.id;
      btn.hidden = !state.canWrite;
    });
    const updateBtn = row.querySelector('[data-action="update"]');
    updateBtn.setAttribute("aria-label", `Actualizar el panel de ${panel.cliente}`);
    updateBtn.disabled = state.launching === panel.id;
    row.querySelector('[data-action="remove"]').setAttribute("aria-label", `Quitar ${panel.cliente} del listado`);
  }

  function render() {
    const list = sortPaneles(state.paneles);
    el.rows.replaceChildren(...list.map((panel) => {
      const row = el.rowTemplate.content.firstElementChild.cloneNode(true);
      fillRow(row, panel);
      return row;
    }));
    el.empty.hidden = list.length > 0;
    el.count.textContent = `${list.length} ${list.length === 1 ? "panel" : "paneles"}`;
    el.heroMeta.textContent = state.canWrite
      ? "Abre cada panel o lanza su actualización mensual."
      : "Solo lectura: tu acceso no permite añadir paneles ni lanzar actualizaciones.";
    el.addSection.hidden = !state.canWrite;
  }

  function fillPlataformas() {
    el.addForm.querySelector('[data-field="plataforma"]').replaceChildren(...PLATAFORMAS.map((p) => new Option(p, p)));
  }

  // Efectos: datos
  async function resolveNames(ids) {
    const missing = ids.filter((id) => id && !(id in state.names));
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
    if (!hasRemoteTool(TOOL_GET) || !(await isRemoteGranted())) return;
    await Promise.all(sessionIds.filter((id) => id && !(id in state.sessionStatus)).map(async (id) => {
      state.sessionStatus[id] = null;
      try {
        const result = await state.mcp.callTool(REMOTE_SERVER, TOOL_GET, { session_id: id });
        state.sessionStatus[id] = extractStatusBucket(result);
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
    state.db.collection(COLLECTION).onSnapshot(
      (snap) => { clearTimeout(timer); setStatus(""); onPanelesSnapshot(snap); },
      (err) => { clearTimeout(timer); setStatus(`No se pueden leer los paneles (${err.code}).`); },
    );
  }

  async function loadHubUrl() {
    try {
      const snap = await state.db.doc(HUB_CONFIG_DOC).get();
      const url = snap.exists ? String(snap.data().url || "") : "";
      state.hubUrl = ARTIFACT_URL_RE.test(url) ? url : "";
    } catch {
      state.hubUrl = "";
    }
  }

  async function loadEnvironments() {
    if (state.environments) return state.environments;
    const result = await state.mcp.callTool(REMOTE_SERVER, TOOL_ENVS, { limit: 50 });
    state.environments = extractEnvironments(result);
    return state.environments;
  }

  function readStoredEnvironment() {
    try { return localStorage.getItem(ENV_STORAGE_KEY) || ""; } catch { return ""; }
  }

  function storeEnvironment(id) {
    try { localStorage.setItem(ENV_STORAGE_KEY, id); } catch { /* preferencia local opcional */ }
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

  // Manejadores
  async function openLaunchDialog(panel) {
    const month = el.month.value;
    if (!isValidMonth(month, new Date())) {
      setStatus("Elige un mes válido que no sea futuro en «Mes a actualizar».");
      el.month.focus();
      return;
    }
    el.dialog.returnValue = "";
    el.dialog.dataset.id = panel.id;
    el.dialog.dataset.month = month;
    el.launchClient.textContent = `${panel.cliente} · ${formatMonth(month)}`;
    el.prompt.value = buildPrompt(panel, month, state.hubUrl);
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

  async function launchSession(panelId, month) {
    const panel = state.paneles.find((p) => p.id === panelId);
    const environmentId = el.envSelect.value;
    if (!panel || !environmentId || !isValidMonth(month, new Date())) return;
    storeEnvironment(environmentId);
    state.launching = panel.id;
    render();
    setStatus(`Lanzando la actualización de ${panel.cliente}…`);
    try {
      const result = await state.mcp.callTool(REMOTE_SERVER, TOOL_CREATE, {
        prompt: buildPrompt(panel, month, state.hubUrl),
        title: `Panel Email ${panel.cliente} · ${month}`,
        environment_id: environmentId,
        source_url: REPO_URL,
        source_revision: REPO_BRANCH,
        tags: ["panel-email", `panel-email:${panel.id}`],
      });
      const sessionId = extractSessionId(result);
      if (sessionId) state.sessionStatus[sessionId] = "working";
      await recordRequest(panel.id, month, sessionId);
      setStatus(sessionId
        ? `Sesión lanzada para ${panel.cliente}. Síguela con «Ver sesión».`
        : `Sesión lanzada para ${panel.cliente}, pero no se ha podido leer su identificador. Búscala en claude.ai/code.`);
    } catch (err) {
      setStatus(mcpErrorText(err));
    } finally {
      state.launching = null;
      render();
    }
  }

  async function recordRequest(panelId, month, sessionId) {
    const por = state.user ? await state.user.id() : null;
    try {
      await state.db.doc(`${COLLECTION}/${panelId}`).update({
        ultimaPeticion: { fecha: new Date().toISOString(), mes: month, sessionId: sessionId || null, por: por || null },
      });
    } catch (err) {
      setStatus(`La sesión se ha lanzado, pero no se ha podido guardar aquí (${err.code}).`);
    }
  }

  async function handleAdd(event) {
    event.preventDefault();
    const fields = Object.fromEntries([...el.addForm.querySelectorAll("[data-field]")].map((f) => [f.dataset.field, f.value]));
    const { id, data, error } = validatePanel(fields);
    if (error) { setMsg(el.addMsg, error, "error"); return; }
    if (state.paneles.some((p) => p.id === id)) { setMsg(el.addMsg, "Ese panel ya está en el listado.", "error"); return; }
    const por = state.user ? await state.user.id() : null;
    try {
      await state.db.doc(`${COLLECTION}/${id}`).set({ ...data, alta: { fecha: new Date().toISOString(), por: por || null } });
      el.addForm.reset();
      setMsg(el.addMsg, `${data.cliente} añadido.`, "ok");
    } catch (err) {
      setMsg(el.addMsg, `No se ha podido guardar (${err.code}).`, "error");
    }
  }

  async function handleRemove(panel) {
    if (!window.confirm(`¿Quitar ${panel.cliente} del listado? El panel no se borra, solo deja de aparecer aquí.`)) return;
    try {
      await state.db.doc(`${COLLECTION}/${panel.id}`).delete();
      setStatus(`${panel.cliente} quitado del listado.`);
    } catch (err) {
      setStatus(`No se ha podido quitar (${err.code}).`);
    }
  }

  function handleRowClick(event) {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const panel = state.paneles.find((p) => p.id === btn.dataset.id);
    if (!panel) return;
    if (btn.dataset.action === "update") openLaunchDialog(panel);
    if (btn.dataset.action === "remove") handleRemove(panel);
  }

  function handleDialogClose() {
    if (el.dialog.returnValue !== "launch") return;
    launchSession(el.dialog.dataset.id, el.dialog.dataset.month);
  }

  // Inicio
  function bindEvents() {
    el.rows.addEventListener("click", handleRowClick);
    el.addForm.addEventListener("submit", handleAdd);
    el.dialog.addEventListener("close", handleDialogClose);
    el.launchCopy.addEventListener("click", copyPrompt);
  }

  async function init() {
    const today = new Date();
    el.month.value = previousMonth(today);
    el.month.max = currentMonth(today);
    fillPlataformas();
    bindEvents();
    render();

    const [db, user, mcp] = await Promise.all(["db", "user", "mcp"].map((name) => window.claude.use(name)));
    state.db = db;
    state.user = user;
    state.mcp = mcp;
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

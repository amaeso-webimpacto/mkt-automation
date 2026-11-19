import {
  CATEGORIES,
  CONNECTION,
  DEFAULT_CONFIG,
  DEFAULT_VIEW,
  STATUS,
  STATUS_LABELS,
  TOAST_DURATION_MS,
  VIEWS,
} from "./constants.js";
import { fillSelect, ref, refs } from "./dom.js";
import {
  addTeamToRotation,
  buildEmail,
  buildMonthGrid,
  buildTurnSummary,
  changePeriodTeam,
  createItem,
  filterItems,
  findPeriodIndex,
  formatMonthTitle,
  formatShortDate,
  formatSlashDate,
  getItemsToOrder,
  groupByCategory,
  monthOf,
  nextItemOrder,
  readRotation,
  sanitizeItemPatch,
  shiftMonth,
  teamLabel,
  toIsoDate,
  parseSlashDate,
  validateItemName,
  withDateStamp,
} from "./logic.js";
import {
  buildFilterSelects,
  renderBanner,
  renderCalendar,
  renderCalendarHead,
  renderCount,
  renderEmailPreview,
  renderFilters,
  renderInventoryTable,
  renderLegend,
  renderMembers,
  renderOrderList,
  renderReview,
  renderRotation,
  renderTurn,
  renderTurnSummary,
  renderView,
  showToast,
} from "./render.js";
import * as store from "./store.js";

const SAVE_ERROR = "No se ha podido guardar. Inténtalo de nuevo.";

const state = {
  items: [],
  config: { ...DEFAULT_CONFIG },
  review: null,
  rotation: readRotation(null),
  connection: CONNECTION.LOADING,
  readOnly: false,
  filters: { query: "", category: "", status: "" },
  notes: "",
  calendar: monthOf(toIsoDate()),
  editingItemId: null,
  editingPeriodIndex: null,
};

let toastTimer = null;
let renderPending = false;

const today = () => toIsoDate();
const findItem = (id) => state.items.find((item) => item.id === id);
const currentPeriodIndex = () => findPeriodIndex(state.rotation.periods, today());
const currentTeam = () => state.rotation.periods[currentPeriodIndex()]?.team ?? "";
const itemIdFrom = (element) => element.closest("[data-js-item-id]")?.getAttribute("data-js-item-id") ?? "";

function notify(message) {
  showToast(message);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => showToast(""), TOAST_DURATION_MS);
}

async function run(action, failureMessage) {
  try {
    await action();
    return true;
  } catch {
    notify(failureMessage);
    return false;
  }
}

/* Rendering */

function isEditingInPlace() {
  const active = document.activeElement;
  return ref("table").contains(active) || ref("order-list").contains(active);
}

function renderInventory() {
  const visibleItems = filterItems(state.items, state.filters);
  renderFilters({ filters: state.filters, items: state.items });
  renderCount(state.items.length, visibleItems.length);
  renderInventoryTable({
    groups: groupByCategory(visibleItems),
    total: state.items.length,
    visible: visibleItems.length,
    connection: state.connection,
  });
}

function renderOrder() {
  const toOrder = getItemsToOrder(state.items);
  renderOrderList({ items: toOrder });
  const team = currentTeam();
  const email = buildEmail({
    items: toOrder,
    notes: state.notes,
    signature: teamLabel(team),
    todayIso: today(),
  });
  renderEmailPreview(email);
}

function renderTurns() {
  const { teams, periods } = state.rotation;
  const grid = buildMonthGrid(state.calendar, { periods, teams, todayIso: today() });
  renderTurnSummary(buildTurnSummary({ periods, teams, todayIso: today() }));
  renderCalendar({ title: formatMonthTitle(state.calendar), grid });
  renderLegend(teams);
  renderMembers(teams);
  renderRotation({ periods, teams, currentIndex: currentPeriodIndex() });
}

function renderAll() {
  renderTurn(state.rotation.periods, currentPeriodIndex());
  renderReview(state);
  renderTurns();
  if (isEditingInPlace()) {
    renderPending = true;
    renderFilters({ filters: state.filters, items: state.items });
  } else {
    renderInventory();
    renderOrder();
  }
  renderBanner(state);
}

function flushPendingRender() {
  if (renderPending && !isEditingInPlace()) {
    renderPending = false;
    renderAll();
  }
}

/* Item actions */

async function updateField(id, key, rawValue) {
  const item = findItem(id);
  if (!item) return;
  let value = rawValue;
  if (key === "orderDate") {
    const parsed = parseSlashDate(rawValue);
    if (parsed.error) {
      notify(parsed.error);
      const input = document.querySelector(`[data-js-item-id="${id}"] [data-js-edit="orderDate"]`);
      if (input) input.value = formatSlashDate(item.orderDate);
      return;
    }
    value = parsed.iso;
  }
  const patch = sanitizeItemPatch({ [key]: value });
  const nameError = key === "name" ? validateItemName(patch.name) : "";
  if (nameError) {
    notify(nameError);
    renderPending = true;
    return;
  }
  if (item[key] === patch[key]) return;
  await run(() => store.updateItem(id, withDateStamp(item, patch, today())), SAVE_ERROR);
}

function openDialog(name) {
  const dialog = ref(`dialog-${name}`);
  if (!dialog.open) dialog.showModal();
  return dialog;
}

function closeDialog(name) {
  const dialog = ref(`dialog-${name}`);
  if (dialog.open) dialog.close();
}

function toggleOrderQtyField() {
  ref("order-qty-field").hidden = ref("item-form").elements.status.value !== STATUS.TO_ORDER;
}

function openItemDialog(item) {
  state.editingItemId = item?.id ?? null;
  const form = ref("item-form");
  form.reset();
  ref("item-error").textContent = "";
  ref("item-delete-confirm").hidden = true;
  ref("item-delete").hidden = !item;
  ref("item-dialog-title").textContent = item ? "Editar ubicación y detalles" : "Añadir producto";
  const values = item ?? { category: state.filters.category || CATEGORIES[0].id };
  ["name", "qty", "status", "orderQty", "location", "spare", "category"].forEach((key) => {
    form.elements[key].value = values[key] ?? "";
  });
  toggleOrderQtyField();
  openDialog("item");
}

async function handleItemSubmit(event) {
  event.preventDefault();
  const form = ref("item-form");
  const fields = Object.fromEntries(new FormData(form));
  const patch = sanitizeItemPatch(fields);
  const error = validateItemName(patch.name);
  ref("item-error").textContent = error;
  if (error) {
    form.elements.name.focus();
    return;
  }
  const existing = state.editingItemId ? findItem(state.editingItemId) : null;
  const saved = await run(
    () =>
      existing
        ? store.updateItem(existing.id, withDateStamp(existing, patch, today()))
        : store.createItemDoc(
            store.newItemId(),
            createItem({ ...fields, orderDate: today() }, nextItemOrder(state.items)),
          ),
    SAVE_ERROR,
  );
  if (!saved) return;
  closeDialog("item");
  notify(existing ? "Producto actualizado." : "Producto añadido.");
}

async function handleItemDelete() {
  const deleted = await run(
    () => store.deleteItem(state.editingItemId),
    "No se ha podido eliminar. Inténtalo de nuevo.",
  );
  if (!deleted) return;
  closeDialog("item");
  notify("Producto eliminado.");
}

async function markReviewDone() {
  const saved = await run(
    () => store.saveReview({ date: today(), team: currentTeam() }),
    "No se ha podido registrar la revisión.",
  );
  if (saved) notify("Revisión registrada.");
}

/* Order actions */

async function copyField(name, successMessage) {
  const element = ref(name);
  try {
    await navigator.clipboard.writeText(element.value);
    notify(successMessage);
  } catch {
    element.focus();
    element.select();
    notify("Selecciona el texto y cópialo con tu teclado.");
  }
}

function openOrderConfirm() {
  const count = getItemsToOrder(state.items).length;
  ref("confirm-text").textContent = `Se marcarán ${count} productos como Pedido con la fecha de hoy.`;
  ref("order-confirm").hidden = false;
  ref("confirm-yes").focus();
}

async function confirmOrdered() {
  const items = getItemsToOrder(state.items);
  const date = today();
  let done = 0;
  for (const item of items) {
    const saved = await run(
      () => store.updateItem(item.id, sanitizeItemPatch({ status: STATUS.ORDERED, orderDate: date })),
      "No se han podido marcar todos los productos. Revisa el inventario.",
    );
    if (!saved) break;
    done += 1;
  }
  if (done === items.length) {
    await run(() => store.saveConfig({ lastOrder: date }), "No se ha podido guardar la fecha del pedido.");
    notify(`${done} productos marcados como Pedido.`);
  }
  ref("order-confirm").hidden = true;
}

/* Rotation actions */

function openPeriodDialog(index) {
  const period = state.rotation.periods[index];
  if (!period) return;
  state.editingPeriodIndex = index;
  const select = ref("team-select");
  fillSelect(select, state.rotation.teams.map((team) => ({ value: team.name, label: teamLabel(team.name) })));
  select.value = period.team;
  ref("team-period").textContent = `Turno del ${formatShortDate(period.from)} al ${formatShortDate(period.to)}`;
  openDialog("team");
}

async function handleTeamChange(event) {
  event.preventDefault();
  const periods = changePeriodTeam(state.rotation.periods, state.editingPeriodIndex, ref("team-select").value);
  const saved = await run(
    () => store.saveRotation({ teams: state.rotation.teams, periods }),
    "No se ha podido guardar el turno.",
  );
  if (!saved) return;
  closeDialog("team");
  notify("Equipo actualizado.");
}

async function handleTeamAdd(event) {
  event.preventDefault();
  const input = ref("new-team");
  const result = addTeamToRotation(state.rotation, input.value, today());
  ref("new-team-error").textContent = result.error ?? "";
  if (result.error) {
    input.focus();
    return;
  }
  const saved = await run(() => store.saveRotation(result), "No se ha podido añadir el equipo.");
  if (!saved) return;
  input.value = "";
  notify("Equipo añadido al final de la rotación.");
}

function moveCalendar(delta) {
  state.calendar = shiftMonth(state.calendar, delta);
  renderTurns();
}

/* Wiring */

function syncView() {
  const name = location.hash.slice(1);
  renderView(VIEWS.includes(name) ? name : DEFAULT_VIEW);
  window.scrollTo(0, 0);
}

function bindFilters() {
  const query = ref("filter-query");
  query.addEventListener("input", () => {
    state.filters.query = query.value;
    renderAll();
  });
  ref("filter-clear").addEventListener("click", () => {
    query.value = "";
    state.filters.query = "";
    renderAll();
    query.focus();
  });
  ref("filter-category").addEventListener("change", (event) => {
    state.filters.category = event.target.value;
    renderAll();
  });
  ref("filter-status").addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    renderAll();
  });
}

function bindTable() {
  const wrap = ref("table-wrap");
  wrap.addEventListener("change", (event) => {
    const input = event.target.closest("[data-js-edit]");
    if (input) updateField(itemIdFrom(input), input.getAttribute("data-js-edit"), input.value);
  });
  wrap.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("textarea")) {
      event.preventDefault();
      event.target.blur();
    }
  });
  wrap.addEventListener("click", (event) => {
    if (event.target.closest("[data-js-item-details]")) openItemDialog(findItem(itemIdFrom(event.target)));
  });
  ref("item-add").addEventListener("click", () => openItemDialog(null));
  ref("review-done").addEventListener("click", markReviewDone);
}

function bindItemDialog() {
  const form = ref("item-form");
  form.addEventListener("submit", handleItemSubmit);
  form.elements.status.addEventListener("change", toggleOrderQtyField);
  ref("item-cancel").addEventListener("click", () => closeDialog("item"));
  ref("item-delete").addEventListener("click", () => {
    ref("item-delete-confirm").hidden = false;
    ref("item-delete-yes").focus();
  });
  ref("item-delete-no").addEventListener("click", () => {
    ref("item-delete-confirm").hidden = true;
  });
  ref("item-delete-yes").addEventListener("click", handleItemDelete);
}

function bindOrder() {
  const list = ref("order-list");
  list.addEventListener("change", (event) => {
    if (event.target.matches("[data-js-field='qty-input']")) {
      updateField(itemIdFrom(event.target), "orderQty", event.target.value);
    }
  });
  list.addEventListener("click", (event) => {
    if (event.target.closest("[data-js-order-remove]")) {
      updateField(itemIdFrom(event.target), "status", STATUS.NONE);
    }
  });
  ref("email-notes").addEventListener("input", (event) => {
    state.notes = event.target.value;
    renderOrder();
  });
  ref("copy-subject").addEventListener("click", () => copyField("email-subject", "Asunto copiado."));
  ref("copy-body").addEventListener("click", () => copyField("email-body", "Mensaje copiado."));
  ref("order-mark").addEventListener("click", openOrderConfirm);
  ref("confirm-no").addEventListener("click", () => {
    ref("order-confirm").hidden = true;
  });
  ref("confirm-yes").addEventListener("click", confirmOrdered);
}

function bindRotation() {
  ref("calendar-prev").addEventListener("click", () => moveCalendar(-1));
  ref("calendar-next").addEventListener("click", () => moveCalendar(1));
  ref("rotation-list").addEventListener("click", (event) => {
    const row = event.target.closest("[data-js-period-index]");
    if (row && event.target.closest("[data-js-period-edit]")) {
      openPeriodDialog(Number(row.getAttribute("data-js-period-index")));
    }
  });
  ref("team-form").addEventListener("submit", handleTeamChange);
  ref("team-cancel").addEventListener("click", () => closeDialog("team"));
  ref("team-add-form").addEventListener("submit", handleTeamAdd);
}

function bindGlobal() {
  window.addEventListener("hashchange", syncView);
  document.addEventListener("focusout", () => requestAnimationFrame(flushPendingRender));
  refs("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
}

function prepareControls() {
  buildFilterSelects();
  renderCalendarHead();
  const form = ref("item-form");
  fillSelect(form.elements.category, CATEGORIES.map(({ id, label, emoji }) => ({ value: id, label: `${emoji} ${label}` })));
  fillSelect(
    form.elements.status,
    Object.values(STATUS).map((value) => ({ value, label: STATUS_LABELS[value] })),
  );
}

function startStore() {
  const update = (change) => {
    change();
    renderAll();
  };
  store.connect({
    onUnavailable: () => update(() => (state.connection = CONNECTION.UNAVAILABLE)),
    onPermissions: ({ readOnly }) => update(() => (state.readOnly = readOnly)),
    onStale: () =>
      update(() => {
        if (state.connection === CONNECTION.LOADING) state.connection = CONNECTION.STALE;
      }),
    onSynced: () => update(() => (state.connection = CONNECTION.READY)),
    onError: () => update(() => (state.connection = CONNECTION.STALE)),
    onItems: (items) => update(() => (state.items = items)),
    onConfig: (data) => update(() => (state.config = { ...DEFAULT_CONFIG, ...(data ?? {}) })),
    onReview: (data) => update(() => (state.review = data)),
    onRotation: (data) => update(() => (state.rotation = readRotation(data))),
  });
}

function init() {
  prepareControls();
  bindFilters();
  bindTable();
  bindItemDialog();
  bindOrder();
  bindRotation();
  bindGlobal();
  syncView();
  renderAll();
  startStore();
}

init();

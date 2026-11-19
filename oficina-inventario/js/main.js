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
  buildEmail,
  buildMailtoUrl,
  filterItems,
  findPeriodIndex,
  getItemsToOrder,
  isValidEmail,
  nextItemOrder,
  sanitizeItem,
  toIsoDate,
  validateItem,
} from "./logic.js";
import {
  renderBanner,
  renderConfigFields,
  renderCount,
  renderEmailPreview,
  renderItemList,
  renderOrderList,
  renderReview,
  renderRotation,
  renderTurn,
  renderView,
  showToast,
} from "./render.js";
import * as store from "./store.js";

const state = {
  items: [],
  config: { ...DEFAULT_CONFIG },
  review: null,
  periods: [],
  connection: CONNECTION.LOADING,
  readOnly: false,
  filters: { query: "", category: "", status: "" },
  notes: "",
  signature: store.readSignature(),
  editingItemId: null,
  editingPeriodIndex: null,
};

let toastTimer = null;
let renderPending = false;

function today() {
  return toIsoDate();
}

function currentPeriodIndex() {
  return findPeriodIndex(state.periods, today());
}

function currentTeam() {
  return state.periods[currentPeriodIndex()]?.team ?? "";
}

function findItem(id) {
  return state.items.find((item) => item.id === id);
}

function notify(message) {
  showToast(message);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => showToast(""), TOAST_DURATION_MS);
}

function itemIdFrom(element) {
  return element.closest("[data-js-item-id]")?.getAttribute("data-js-item-id") ?? "";
}

function renderOrderTab() {
  const toOrder = getItemsToOrder(state.items);
  renderOrderList({ items: toOrder });
  renderEmailTab(toOrder);
}

function renderEmailTab(toOrder = getItemsToOrder(state.items)) {
  const signature = state.signature || (currentTeam() ? `Equipo ${currentTeam()}` : "");
  const email = buildEmail({
    items: toOrder,
    config: state.config,
    notes: state.notes,
    signature,
    todayIso: today(),
  });
  renderEmailPreview({
    ...email,
    mailtoUrl: buildMailtoUrl({ to: state.config.hrEmail, ...email }),
    config: state.config,
  });
}

function renderAll() {
  const visible = filterItems(state.items, state.filters);
  const toOrderCount = getItemsToOrder(state.items).length;
  renderTurn(state.periods, currentPeriodIndex());
  renderReview(state);
  renderCount(state.items.length, visible.length, toOrderCount);
  renderItemList({ items: visible, total: state.items.length, connection: state.connection });
  renderConfigFields(state.config);
  renderRotation({ periods: state.periods, currentIndex: currentPeriodIndex() });
  if (ref("order-list").contains(document.activeElement)) renderPending = true;
  else renderOrderTab();
  renderBanner(state);
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

function openDialog(name) {
  const dialog = ref(`dialog-${name}`);
  if (!dialog.open) dialog.showModal();
  return dialog;
}

function closeDialog(name) {
  const dialog = ref(`dialog-${name}`);
  if (dialog.open) dialog.close();
}

function openItemDialog(item) {
  state.editingItemId = item?.id ?? null;
  const form = ref("item-form");
  form.reset();
  ref("item-error").textContent = "";
  ref("item-delete-confirm").hidden = true;
  ref("item-delete").hidden = !item;
  ref("item-dialog-title").textContent = item ? "Editar producto" : "Añadir producto";
  const values = item ?? { status: STATUS.NONE, category: state.filters.category || CATEGORIES[0].id };
  Object.entries({
    name: values.name ?? "",
    qty: values.qty ?? "",
    status: values.status ?? STATUS.NONE,
    orderQty: values.orderQty ?? "",
    location: values.location ?? "",
    spare: values.spare ?? "",
    category: values.category ?? CATEGORIES[0].id,
  }).forEach(([name, value]) => {
    form.elements[name].value = value;
  });
  toggleOrderQtyField();
  openDialog("item");
}

function toggleOrderQtyField() {
  const form = ref("item-form");
  ref("order-qty-field").hidden = form.elements.status.value !== STATUS.TO_ORDER;
}

async function handleItemSubmit(event) {
  event.preventDefault();
  const form = ref("item-form");
  const existing = state.editingItemId ? findItem(state.editingItemId) : null;
  const fields = Object.fromEntries(new FormData(form));
  const item = sanitizeItem(
    { ...fields, orderDate: existing?.orderDate ?? "" },
    existing?.order ?? nextItemOrder(state.items),
  );
  const error = validateItem(item);
  ref("item-error").textContent = error;
  if (error) {
    form.elements.name.focus();
    return;
  }
  const id = existing?.id ?? store.newItemId();
  const saved = await run(() => store.saveItem(id, item), "No se ha podido guardar. Inténtalo de nuevo.");
  if (!saved) return;
  closeDialog("item");
  notify(existing ? "Producto actualizado." : "Producto añadido.");
}

async function handleItemDelete() {
  const id = state.editingItemId;
  if (!id) return;
  const deleted = await run(() => store.deleteItem(id), "No se ha podido eliminar. Inténtalo de nuevo.");
  if (!deleted) return;
  closeDialog("item");
  notify("Producto eliminado.");
}

async function toggleToOrder(id) {
  const item = findItem(id);
  if (!item) return;
  const toOrder = item.status === STATUS.TO_ORDER;
  const { id: _id, ...fields } = item;
  const next = sanitizeItem(
    { ...fields, status: toOrder ? STATUS.NONE : STATUS.TO_ORDER },
    item.order,
  );
  await run(() => store.saveItem(id, next), "No se ha podido guardar. Inténtalo de nuevo.");
}

async function saveOrderQty(id, value) {
  const item = findItem(id);
  if (!item || (item.orderQty ?? "") === value.trim()) return;
  const { id: _id, ...fields } = item;
  const next = sanitizeItem({ ...fields, orderQty: value }, item.order);
  await run(() => store.saveItem(id, next), "No se ha podido guardar la cantidad.");
}

async function removeFromOrder(id) {
  const item = findItem(id);
  if (!item) return;
  const { id: _id, ...fields } = item;
  await run(
    () => store.saveItem(id, sanitizeItem({ ...fields, status: STATUS.NONE }, item.order)),
    "No se ha podido guardar. Inténtalo de nuevo.",
  );
}

async function markReviewDone() {
  const saved = await run(
    () => store.saveReview({ date: today(), team: currentTeam() || "Sin turno" }),
    "No se ha podido registrar la revisión.",
  );
  if (saved) notify("Revisión registrada.");
}

async function saveHrField(key, value) {
  const trimmed = value.trim();
  const errorElement = ref("hr-email-error");
  if (key === "hrEmail") {
    const invalid = trimmed !== "" && !isValidEmail(trimmed);
    errorElement.textContent = invalid ? "Escribe una dirección de correo válida." : "";
    if (invalid) return;
  }
  if (state.config[key] === trimmed) return;
  await run(
    () => store.saveConfig({ ...state.config, [key]: trimmed }),
    "No se ha podido guardar el contacto.",
  );
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
    const { id, ...fields } = item;
    const saved = await run(
      () =>
        store.saveItem(
          id,
          sanitizeItem({ ...fields, status: STATUS.ORDERED, orderDate: date, orderQty: "" }, item.order),
        ),
      "No se han podido marcar todos los productos. Revisa el inventario.",
    );
    if (!saved) break;
    done += 1;
  }
  if (done === items.length) {
    await run(() => store.saveConfig({ ...state.config, lastOrder: date }), "No se ha podido guardar la fecha del pedido.");
    notify(`${done} productos marcados como Pedido.`);
  }
  ref("order-confirm").hidden = true;
}

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

function openPeriodDialog(index) {
  const period = state.periods[index];
  if (!period) return;
  state.editingPeriodIndex = index;
  ref("team-input").value = period.team;
  ref("team-error").textContent = "";
  openDialog("team");
}

async function handleTeamSubmit(event) {
  event.preventDefault();
  const team = ref("team-input").value.trim().slice(0, 40);
  if (!team) {
    ref("team-error").textContent = "Escribe el nombre del equipo.";
    return;
  }
  const periods = state.periods.map((period, index) =>
    index === state.editingPeriodIndex ? { ...period, team } : period,
  );
  const saved = await run(() => store.saveRotation(periods), "No se ha podido guardar el turno.");
  if (!saved) return;
  closeDialog("team");
  notify("Equipo actualizado.");
}

function syncView() {
  const name = location.hash.slice(1);
  renderView(VIEWS.includes(name) ? name : DEFAULT_VIEW);
  window.scrollTo(0, 0);
}

function bindFilters() {
  const query = ref("filter-query");
  const category = ref("filter-category");
  const status = ref("filter-status");
  query.addEventListener("input", () => {
    state.filters.query = query.value;
    renderAll();
  });
  category.addEventListener("change", () => {
    state.filters.category = category.value;
    renderAll();
  });
  status.addEventListener("change", () => {
    state.filters.status = status.value;
    renderAll();
  });
}

function bindInventory() {
  ref("item-list").addEventListener("click", (event) => {
    const id = itemIdFrom(event.target);
    if (event.target.closest("[data-js-item-flag]")) toggleToOrder(id);
    else if (event.target.closest("[data-js-item-edit]")) openItemDialog(findItem(id));
  });
  ref("item-add").addEventListener("click", () => openItemDialog(null));
  ref("review-done").addEventListener("click", markReviewDone);
  ref("item-form").addEventListener("submit", handleItemSubmit);
  ref("item-form").elements.status.addEventListener("change", toggleOrderQtyField);
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
      saveOrderQty(itemIdFrom(event.target), event.target.value);
    }
  });
  list.addEventListener("focusout", () => {
    if (!renderPending) return;
    renderPending = false;
    requestAnimationFrame(renderAll);
  });
  list.addEventListener("click", (event) => {
    if (event.target.closest("[data-js-order-remove]")) removeFromOrder(itemIdFrom(event.target));
  });
  ref("hr-name").addEventListener("change", (event) => saveHrField("hrName", event.target.value));
  ref("hr-email").addEventListener("change", (event) => saveHrField("hrEmail", event.target.value));
  ref("email-notes").addEventListener("input", (event) => {
    state.notes = event.target.value;
    renderEmailTab();
  });
  ref("email-signature").value = state.signature;
  ref("email-signature").addEventListener("input", (event) => {
    state.signature = event.target.value.trim();
    store.writeSignature(state.signature);
    renderEmailTab();
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
  ref("rotation-list").addEventListener("click", (event) => {
    const row = event.target.closest("[data-js-period-index]");
    if (row && event.target.closest("[data-js-period-edit]")) {
      openPeriodDialog(Number(row.getAttribute("data-js-period-index")));
    }
  });
  ref("team-form").addEventListener("submit", handleTeamSubmit);
  ref("team-cancel").addEventListener("click", () => closeDialog("team"));
}

function bindDialogBackdrops() {
  refs("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
}

function prepareSelects() {
  const categoryOptions = CATEGORIES.map(({ id, label }) => ({ value: id, label }));
  fillSelect(ref("filter-category"), [{ value: "", label: "Todas" }, ...categoryOptions]);
  fillSelect(ref("filter-status"), [
    { value: "", label: "Todos" },
    ...Object.values(STATUS)
      .filter(Boolean)
      .map((value) => ({ value, label: STATUS_LABELS[value] })),
  ]);
  const itemForm = ref("item-form");
  fillSelect(itemForm.elements.category, categoryOptions);
  fillSelect(
    itemForm.elements.status,
    Object.values(STATUS).map((value) => ({ value, label: STATUS_LABELS[value] })),
  );
}

function startStore() {
  store.connect({
    onUnavailable() {
      state.connection = CONNECTION.UNAVAILABLE;
      renderAll();
    },
    onPermissions({ readOnly }) {
      state.readOnly = readOnly;
      renderAll();
    },
    onStale() {
      if (state.connection === CONNECTION.LOADING) state.connection = CONNECTION.STALE;
      renderAll();
    },
    onSynced() {
      state.connection = CONNECTION.READY;
      renderAll();
    },
    onError() {
      state.connection = CONNECTION.STALE;
      renderAll();
    },
    onItems(items) {
      state.items = items;
      renderAll();
    },
    onConfig(data) {
      state.config = { ...DEFAULT_CONFIG, ...(data ?? {}) };
      renderAll();
    },
    onReview(data) {
      state.review = data;
      renderAll();
    },
    onRotation(data) {
      state.periods = data?.periods ?? [];
      renderAll();
    },
  });
}

function init() {
  prepareSelects();
  bindFilters();
  bindInventory();
  bindOrder();
  bindRotation();
  bindDialogBackdrops();
  window.addEventListener("hashchange", syncView);
  syncView();
  renderAll();
  startStore();
}

init();

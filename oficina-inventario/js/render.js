import { CONNECTION, STATUS, STATUS_LABELS, VIEWS } from "./constants.js";
import { cloneTemplate, field, ref, refs } from "./dom.js";
import {
  describeStock,
  formatShortDate,
} from "./logic.js";

const CONNECTION_MESSAGES = Object.freeze({
  [CONNECTION.LOADING]: "Cargando el inventario compartido…",
  [CONNECTION.STALE]: "No se alcanzan los datos compartidos todavía. Lo que ves puede estar desactualizado.",
  [CONNECTION.UNAVAILABLE]:
    "No se puede conectar con los datos compartidos. Comprueba que has iniciado sesión y que tienes acceso a este artefacto.",
});
const READ_ONLY_MESSAGE = "Tienes acceso de solo lectura. Puedes consultar el inventario pero no cambiarlo.";

export function renderBanner({ connection, readOnly }) {
  const banner = ref("banner");
  const message = CONNECTION_MESSAGES[connection] ?? (readOnly ? READ_ONLY_MESSAGE : "");
  banner.textContent = message;
  banner.hidden = !message;
  refs("write").forEach((control) => {
    control.disabled = readOnly || connection === CONNECTION.UNAVAILABLE;
  });
}

export function renderView(viewName) {
  const current = VIEWS.includes(viewName) ? viewName : VIEWS[0];
  refs("view").forEach((view) => {
    view.hidden = view.getAttribute("data-js-view") !== current;
  });
  refs("tab").forEach((tab) => {
    if (tab.getAttribute("data-js-tab") === current) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
}

export function renderTurn(periods, currentIndex) {
  const period = periods[currentIndex];
  ref("turn").textContent = period
    ? `Turno actual: ${period.team} · ${formatShortDate(period.from)} al ${formatShortDate(period.to)}`
    : "Sin turno asignado para hoy";
}

export function renderReview({ review, config }) {
  ref("review-text").textContent = review
    ? `Última revisión: ${formatShortDate(review.date)} · ${review.team}`
    : "Todavía no hay una revisión registrada.";
  ref("last-order-text").textContent = config.lastOrder
    ? `Último pedido: ${formatShortDate(config.lastOrder)}`
    : "Sin fecha de último pedido.";
}

export function renderCount(total, visible, toOrderCount) {
  const label = total === visible ? `${total} productos` : `${visible} de ${total} productos`;
  ref("count").textContent = `${label} · ${toOrderCount} por pedir`;
}

export function renderItemList({ items, total, connection }) {
  const list = ref("item-list");
  const empty = ref("item-empty");
  list.replaceChildren(...items.map(buildItemCard));
  empty.hidden = items.length > 0;
  if (items.length) return;
  empty.textContent = emptyMessage(total, connection);
}

function emptyMessage(total, connection) {
  if (connection === CONNECTION.LOADING) return "Cargando productos…";
  if (total === 0) return "Todavía no hay productos. Añade el primero con el botón Añadir producto.";
  return "Ningún producto coincide con la búsqueda y los filtros.";
}

function buildItemCard(item) {
  const card = cloneTemplate("item");
  card.setAttribute("data-js-item-id", item.id);
  field(card, "name").textContent = item.name;
  field(card, "qty").textContent = describeStock(item);
  field(card, "where").textContent = item.location ? `Dónde: ${item.location}` : "";

  const pill = field(card, "status");
  pill.hidden = !item.status;
  pill.textContent = STATUS_LABELS[item.status] ?? "";
  pill.classList.add(`pill--${item.status || "none"}`);

  const toOrder = item.status === STATUS.TO_ORDER;
  const flag = ref("item-flag", card);
  flag.textContent = toOrder ? "Quitar" : "Pedir";
  flag.setAttribute("aria-label", `${toOrder ? "Quitar de pedido" : "Pedir"}: ${item.name}`);
  return card;
}

export function renderOrderList({ items }) {
  const list = ref("order-list");
  ref("order-empty").hidden = items.length > 0;
  ref("order-panel").hidden = items.length === 0;
  list.replaceChildren(...items.map(buildOrderRow));
  ref("order-count").textContent = items.length
    ? `${items.length} ${items.length === 1 ? "producto" : "productos"} por pedir`
    : "";
}

function buildOrderRow(item) {
  const row = cloneTemplate("order");
  row.setAttribute("data-js-item-id", item.id);
  field(row, "name").textContent = item.name;
  field(row, "stock").textContent = `Quedan: ${describeStock(item)}`;
  const input = field(row, "qty-input");
  input.id = `order-qty-${item.id}`;
  input.value = item.orderQty ?? "";
  input.setAttribute("aria-label", `Cantidad a pedir de ${item.name}`);
  field(row, "qty-label").setAttribute("for", input.id);
  ref("order-remove", row).setAttribute("aria-label", `Quitar del pedido: ${item.name}`);
  return row;
}

export function renderEmailPreview({ subject, body, mailtoUrl, config }) {
  ref("email-subject").value = subject;
  ref("email-body").value = body;
  ref("hr-address").textContent = config.hrEmail || "Sin dirección. Escríbela arriba.";
  const link = ref("mailto");
  if (mailtoUrl) {
    link.setAttribute("href", mailtoUrl);
    link.removeAttribute("aria-disabled");
  } else {
    link.removeAttribute("href");
    link.setAttribute("aria-disabled", "true");
  }
  refs("email-action").forEach((control) => {
    control.disabled = !body;
  });
}

export function renderConfigFields(config) {
  const nameInput = ref("hr-name");
  const emailInput = ref("hr-email");
  if (document.activeElement !== nameInput) nameInput.value = config.hrName;
  if (document.activeElement !== emailInput) emailInput.value = config.hrEmail;
}

export function renderRotation({ periods, currentIndex }) {
  const list = ref("rotation-list");
  list.replaceChildren(
    ...periods.map((period, index) => {
      const row = cloneTemplate("period");
      row.setAttribute("data-js-period-index", String(index));
      field(row, "range").textContent = `${formatShortDate(period.from)} al ${formatShortDate(period.to)}`;
      field(row, "team").textContent = period.team;
      const badge = field(row, "badge");
      const label = index === currentIndex ? "Ahora" : index === currentIndex + 1 ? "Siguiente" : "";
      badge.hidden = !label;
      badge.textContent = label;
      ref("period-edit", row).setAttribute("aria-label", `Cambiar equipo del periodo ${formatShortDate(period.from)} al ${formatShortDate(period.to)}`);
      return row;
    }),
  );
  ref("rotation-empty").hidden = periods.length > 0;
}

export function showToast(message) {
  const toast = ref("toast");
  toast.textContent = message;
  toast.hidden = !message;
}

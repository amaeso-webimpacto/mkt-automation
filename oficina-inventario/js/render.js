import {
  CATEGORIES,
  CONNECTION,
  STATUS,
  STATUS_LABELS,
  VIEWS,
  WEEKDAYS,
} from "./constants.js";
import { cloneTemplate, field, fillSelect, ref, refs } from "./dom.js";
import { describeStock, formatShortDate, teamLabel } from "./logic.js";

const CONNECTION_MESSAGES = Object.freeze({
  [CONNECTION.LOADING]: "Cargando el inventario compartido…",
  [CONNECTION.STALE]: "No se alcanzan los datos compartidos todavía. Lo que ves puede estar desactualizado.",
  [CONNECTION.UNAVAILABLE]:
    "No se puede conectar con los datos compartidos. Comprueba que has iniciado sesión y que tienes acceso a este artefacto.",
});
const READ_ONLY_MESSAGE = "Tienes acceso de solo lectura. Puedes consultar el inventario pero no cambiarlo.";

const STATUS_OPTIONS = Object.values(STATUS).map((value) => ({ value, label: STATUS_LABELS[value] }));

function teamColorClass(colorIndex) {
  return colorIndex >= 0 ? `team-color-${colorIndex}` : "";
}

/* Shell */

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
  ref("app").setAttribute("data-view", current);
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
    ? `Turno actual: ${teamLabel(period.team)} · ${formatShortDate(period.from)} al ${formatShortDate(period.to)}`
    : "Sin turno asignado para hoy";
}

export function renderReview({ review, config }) {
  ref("review-text").textContent = review
    ? `Última revisión: ${formatShortDate(review.date)} · ${teamLabel(review.team) || "Sin turno"}`
    : "Todavía no hay una revisión registrada.";
  ref("last-order-text").textContent = config.lastOrder
    ? `Último pedido: ${formatShortDate(config.lastOrder)}`
    : "Sin fecha de último pedido.";
}

export function showToast(message) {
  const toast = ref("toast");
  toast.textContent = message;
  toast.hidden = !message;
}

/* Inventory: filters */

const CATEGORY_FILTER_OPTIONS = Object.freeze([
  { value: "", label: "Todas" },
  ...CATEGORIES.map(({ id, label, emoji }) => ({ value: id, label: `${emoji} ${label}` })),
]);

const STATUS_FILTER_OPTIONS = Object.freeze([
  { value: "", label: "Todos" },
  ...Object.values(STATUS)
    .filter(Boolean)
    .map((status) => ({ value: status, label: STATUS_LABELS[status] })),
]);

export function buildFilterSelects() {
  fillSelect(ref("filter-category"), CATEGORY_FILTER_OPTIONS);
  fillSelect(ref("filter-status"), STATUS_FILTER_OPTIONS);
}

function updateFilterSelect(select, options, selected, counts) {
  [...select.options].forEach((option, index) => {
    const { value, label } = options[index];
    option.textContent = `${label} (${counts[value] ?? 0})`;
  });
  select.value = selected;
}

export function renderFilters({ filters, items }) {
  const categoryCounts = {};
  const statusCounts = {};
  items.forEach((item) => {
    categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
    statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1;
  });
  categoryCounts[""] = items.length;
  statusCounts[""] = items.length;
  updateFilterSelect(ref("filter-category"), CATEGORY_FILTER_OPTIONS, filters.category, categoryCounts);
  updateFilterSelect(ref("filter-status"), STATUS_FILTER_OPTIONS, filters.status, statusCounts);
  ref("filter-clear").hidden = !filters.query;
}

export function renderCount(total, visible) {
  ref("count").textContent = total === visible ? `${total} productos` : `${visible} de ${total} productos`;
}

/* Inventory: table */

function emptyMessage(total, connection) {
  if (connection === CONNECTION.LOADING) return "Cargando productos…";
  if (total === 0) return "Todavía no hay productos. Añade el primero con el botón Añadir producto.";
  return "Ningún producto coincide con la búsqueda y los filtros.";
}

export function renderInventoryTable({ groups, total, visible, connection }) {
  const table = ref("table");
  table.querySelectorAll("tbody").forEach((body) => body.remove());
  groups.forEach((group) => table.append(buildGroup(group)));
  const empty = ref("item-empty");
  empty.hidden = visible > 0;
  empty.textContent = visible > 0 ? "" : emptyMessage(total, connection);
  ref("table-wrap").hidden = visible === 0;
}

function buildGroup({ category, items }) {
  const group = cloneTemplate("category");
  group.setAttribute("data-js-category-id", category.id);
  field(group, "emoji").textContent = category.emoji;
  field(group, "label").textContent = category.label;
  const toOrder = items.filter((item) => item.status === STATUS.TO_ORDER).length;
  field(group, "meta").textContent = `${items.length} ${items.length === 1 ? "producto" : "productos"} · ${toOrder} por pedir`;
  group.append(...items.flatMap(buildRows));
  return group;
}

function buildRows(item) {
  return [buildMainRow(item), buildDetailsRow(item)];
}

function buildMainRow(item) {
  const row = cloneTemplate("row");
  row.setAttribute("data-js-item-id", item.id);

  const name = field(row, "name");
  name.value = item.name;
  name.setAttribute("aria-label", `Producto: ${item.name}`);

  const qty = field(row, "qty");
  qty.value = item.qty ?? "";
  qty.setAttribute("aria-label", `Cantidad disponible de ${item.name}`);

  const date = field(row, "orderDate");
  date.value = item.orderDate ?? "";
  date.setAttribute("aria-label", `Fecha de pedido de ${item.name}`);

  const status = field(row, "status");
  fillSelect(status, STATUS_OPTIONS);
  status.value = item.status ?? STATUS.NONE;
  status.setAttribute("aria-label", `Estado del pedido de ${item.name}`);
  field(row, "statusBox").classList.add(`status-select--${item.status || "none"}`);
  return row;
}

function buildDetailsRow(item) {
  const row = cloneTemplate("details");
  row.setAttribute("data-js-item-id", item.id);
  const parts = [
    item.location ? `Dónde: ${item.location}` : "",
    item.spare ? `Repuestos: ${item.spare}` : "",
  ].filter(Boolean);
  const button = ref("item-details", row);
  button.textContent = parts.length ? parts.join(" · ") : "Añadir ubicación";
  button.setAttribute("aria-label", `Editar ubicación y detalles de ${item.name}`);
  return row;
}

/* Order */

export function renderOrderList({ items }) {
  ref("order-empty").hidden = items.length > 0;
  ref("order-panel").hidden = items.length === 0;
  ref("order-list").replaceChildren(...items.map(buildOrderRow));
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

export function renderEmailPreview({ subject, body, mailtoUrl }) {
  ref("email-subject").value = subject;
  ref("email-body").value = body;
  const link = ref("mailto");
  link.setAttribute("href", mailtoUrl);
  refs("email-action").forEach((control) => {
    control.disabled = !body;
  });
}

/* Rotation */

function describeDays(days) {
  if (days <= 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days} días`;
}

function describeDaysLeft(days) {
  if (days <= 0) return "hoy es el último día";
  if (days === 1) return "queda 1 día";
  return `quedan ${days} días`;
}

export function renderTurnSummary({ current, next, warn }) {
  const strip = ref("turn-now");
  strip.className = "turn-now";
  if (current) {
    if (current.colorIndex >= 0) strip.classList.add(teamColorClass(current.colorIndex));
    strip.textContent = `Turno actual: ${teamLabel(current.team)} · ${formatShortDate(current.from)} al ${formatShortDate(current.to)} · ${describeDaysLeft(current.days)}`;
  } else {
    strip.textContent = "Sin turno asignado para hoy";
  }

  const notice = ref("turn-next");
  notice.classList.toggle("notice--warn", warn);
  notice.hidden = !next;
  if (!next) return;
  const range = `${formatShortDate(next.from)} al ${formatShortDate(next.to)}`;
  notice.textContent = warn
    ? `Aviso: el turno cambia ${describeDays(next.days)} · ${teamLabel(next.team)} (${range})`
    : `Siguiente: ${teamLabel(next.team)} · ${range}`;
}

export function renderCalendarHead() {
  const row = document.createElement("tr");
  WEEKDAYS.forEach(({ short, full }) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    const abbreviation = document.createElement("abbr");
    abbreviation.title = full;
    abbreviation.textContent = short;
    cell.append(abbreviation);
    row.append(cell);
  });
  ref("calendar-head").replaceChildren(row);
}

function buildDay(cell) {
  const day = cloneTemplate("day");
  if (!cell) {
    day.classList.add("day--empty");
    day.replaceChildren();
    return day;
  }
  field(day, "num").textContent = String(cell.day);
  const description = [cell.team ? teamLabel(cell.team) : "sin turno", cell.isToday ? "hoy" : ""]
    .filter(Boolean)
    .join(", ");
  field(day, "sr").textContent = `, ${description}`;
  if (cell.colorIndex >= 0) day.classList.add(teamColorClass(cell.colorIndex));
  if (cell.isToday) day.classList.add("day--today");
  return day;
}

export function renderCalendar({ title, grid }) {
  ref("calendar-title").textContent = title;
  ref("calendar-body").replaceChildren(
    ...grid.map((week) => {
      const row = document.createElement("tr");
      row.append(...week.map(buildDay));
      return row;
    }),
  );
}

export function renderLegend(teams) {
  ref("legend").replaceChildren(
    ...teams.map((team) => {
      const item = cloneTemplate("legend");
      item.classList.add(teamColorClass(team.colorIndex));
      field(item, "label").textContent = teamLabel(team.name);
      return item;
    }),
  );
}

export function renderRotation({ periods, teams, currentIndex }) {
  ref("rotation-list").replaceChildren(
    ...periods.map((period, index) => {
      const row = cloneTemplate("period");
      const colorIndex = teams.find((team) => team.name === period.team)?.colorIndex ?? -1;
      row.classList.add(teamColorClass(colorIndex));
      row.setAttribute("data-js-period-index", String(index));
      field(row, "team").textContent = teamLabel(period.team);
      field(row, "range").textContent = `${formatShortDate(period.from)} al ${formatShortDate(period.to)}`;
      const badge = field(row, "badge");
      const label = index === currentIndex ? "Ahora" : index === currentIndex + 1 ? "Siguiente" : "";
      badge.hidden = !label;
      badge.textContent = label;
      ref("period-edit", row).setAttribute(
        "aria-label",
        `Cambiar equipo del turno ${formatShortDate(period.from)} al ${formatShortDate(period.to)}`,
      );
      return row;
    }),
  );
  ref("rotation-empty").hidden = periods.length > 0;
}

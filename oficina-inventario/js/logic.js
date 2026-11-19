import {
  CATEGORIES,
  EMAIL_PATTERN,
  MAX_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  STATUS,
  STATUS_LABELS,
} from "./constants.js";

export function normalizeText(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function toIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatShortDate(iso) {
  if (!iso) return "";
  const [, month, day] = iso.split("-");
  return `${day}-${month}`;
}

export function formatLongDate(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}-${month}-${year}`;
}

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value ?? "").trim());
}

export function sortItems(items) {
  return [...items].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, "es"),
  );
}

export function filterItems(items, { query = "", category = "", status = "" } = {}) {
  const needle = normalizeText(query);
  return sortItems(items).filter((item) => {
    if (category && item.category !== category) return false;
    if (status && item.status !== status) return false;
    if (!needle) return true;
    const haystack = normalizeText(`${item.name} ${item.location} ${item.spare}`);
    return haystack.includes(needle);
  });
}

export function getItemsToOrder(items) {
  return sortItems(items.filter((item) => item.status === STATUS.TO_ORDER));
}

export function nextItemOrder(items) {
  return items.reduce((max, item) => Math.max(max, item.order ?? 0), 0) + 1;
}

export function findPeriodIndex(periods, iso) {
  return periods.findIndex((period) => iso >= period.from && iso <= period.to);
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function sanitizeItem(fields, order) {
  const status = Object.values(STATUS).includes(fields.status) ? fields.status : STATUS.NONE;
  const category = CATEGORIES.some((entry) => entry.id === fields.category)
    ? fields.category
    : CATEGORIES[0].id;
  return {
    name: cleanText(fields.name, MAX_NAME_LENGTH),
    qty: cleanText(fields.qty, MAX_TEXT_LENGTH),
    status,
    orderQty: status === STATUS.TO_ORDER ? cleanText(fields.orderQty, MAX_TEXT_LENGTH) : "",
    orderDate: status === STATUS.NONE ? "" : cleanText(fields.orderDate, 10),
    location: cleanText(fields.location, MAX_TEXT_LENGTH),
    spare: cleanText(fields.spare, MAX_TEXT_LENGTH),
    category,
    order,
  };
}

export function validateItem(item) {
  return item.name ? "" : "Escribe el nombre del producto.";
}

export function buildEmail({ items, config, notes, signature, todayIso }) {
  const subject = `Pedido de material de oficina - ${formatLongDate(todayIso)}`;
  if (!items.length) return { subject, body: "" };

  const lines = items.map((item) => {
    const amount = item.orderQty ? `: ${item.orderQty}` : "";
    const stock = item.qty ? ` (quedan: ${item.qty})` : "";
    return `- ${item.name}${amount}${stock}`;
  });
  const parts = [
    `Hola ${config.hrName || "RRHH"},`,
    "Tras la revisión del inventario de la oficina, necesitamos pedir lo siguiente:",
    lines.join("\n"),
  ];
  if (notes.trim()) parts.push(notes.trim());
  parts.push(`Gracias,\n${signature || "Equipo de revisión"}`);
  return { subject, body: parts.join("\n\n") };
}

export function buildMailtoUrl({ to, subject, body }) {
  if (!isValidEmail(to)) return "";
  return `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function describeStock(item) {
  return item.qty || "sin datos";
}

export function describeStatus(status) {
  return STATUS_LABELS[status] ?? STATUS_LABELS[STATUS.NONE];
}

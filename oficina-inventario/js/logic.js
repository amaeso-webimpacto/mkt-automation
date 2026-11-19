import {
  CATEGORIES,
  DATE_STAMPED_FIELDS,
  LOCALE,
  MAIL_RECIPIENTS,
  MAX_NAME_LENGTH,
  MAX_TEAM_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  MS_PER_DAY,
  NEXT_TURN_WARNING_DAYS,
  OFFICE_LABEL,
  STATUS,
  TEAM_PALETTE_SIZE,
  TEAM_PREFIX,
  TURN_LENGTH_DAYS,
} from "./constants.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_PER_WEEK = 7;

export function normalizeText(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function toIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
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

/* Items */

const EMPTY_ITEM = Object.freeze({
  name: "",
  qty: "",
  status: STATUS.NONE,
  orderQty: "",
  orderDate: "",
  location: "",
  spare: "",
  category: CATEGORIES[0].id,
});

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

const FIELD_CLEANERS = Object.freeze({
  name: (value) => cleanText(value, MAX_NAME_LENGTH),
  qty: (value) => cleanText(value, MAX_TEXT_LENGTH),
  status: (value) => (Object.values(STATUS).includes(value) ? value : STATUS.NONE),
  orderQty: (value) => cleanText(value, MAX_TEXT_LENGTH),
  orderDate: (value) => (DATE_PATTERN.test(value) ? value : ""),
  location: (value) => cleanText(value, MAX_TEXT_LENGTH),
  spare: (value) => cleanText(value, MAX_TEXT_LENGTH),
  category: (value) => (CATEGORIES.some((entry) => entry.id === value) ? value : CATEGORIES[0].id),
});

export function sanitizeItemPatch(patch) {
  const clean = {};
  Object.entries(FIELD_CLEANERS).forEach(([key, cleaner]) => {
    if (key in patch) clean[key] = cleaner(patch[key]);
  });
  if ("status" in clean && clean.status !== STATUS.TO_ORDER) clean.orderQty = "";
  return clean;
}

export function createItem(fields, order) {
  return { ...EMPTY_ITEM, ...sanitizeItemPatch(fields), order };
}

export function withDateStamp(item, patch, todayIso) {
  if ("orderDate" in patch) return patch;
  const changed = DATE_STAMPED_FIELDS.some((key) => key in patch && patch[key] !== (item?.[key] ?? ""));
  return changed ? { ...patch, orderDate: todayIso } : patch;
}

export function validateItemName(name) {
  return name ? "" : "Escribe el nombre del producto.";
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
    return normalizeText(`${item.name} ${item.location} ${item.spare}`).includes(needle);
  });
}

export function groupByCategory(items) {
  return CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category.id),
  })).filter((group) => group.items.length > 0);
}

export function countBy(items, key) {
  return items.reduce((counts, item) => {
    counts[item[key]] = (counts[item[key]] ?? 0) + 1;
    return counts;
  }, {});
}

export function getItemsToOrder(items) {
  return sortItems(items.filter((item) => item.status === STATUS.TO_ORDER));
}

export function nextItemOrder(items) {
  return items.reduce((max, item) => Math.max(max, item.order ?? 0), 0) + 1;
}

export function describeStock(item) {
  return item.qty || "sin datos";
}

/* Teams and rotation */

export function teamLabel(name) {
  return name ? `${TEAM_PREFIX} ${name}` : "";
}

export function normalizeTeamName(input) {
  return String(input ?? "")
    .trim()
    .replace(new RegExp(`^${TEAM_PREFIX}\\s+`, "i"), "")
    .trim()
    .slice(0, MAX_TEAM_NAME_LENGTH);
}

export function findPeriodIndex(periods, iso) {
  return periods.findIndex((period) => iso >= period.from && iso <= period.to);
}

function deriveTeams(periods) {
  const names = [...new Set(periods.map((period) => period.team))];
  return names.map((name, index) => ({ name, colorIndex: index % TEAM_PALETTE_SIZE }));
}

export function readRotation(data) {
  const periods = data?.periods ?? [];
  const teams = data?.teams?.length ? data.teams : deriveTeams(periods);
  return { teams, periods };
}

function pickColorIndex(teams) {
  const used = new Set(teams.map((team) => team.colorIndex));
  for (let index = 0; index < TEAM_PALETTE_SIZE; index += 1) {
    if (!used.has(index)) return index;
  }
  return teams.length % TEAM_PALETTE_SIZE;
}

export function teamColorIndex(teams, name) {
  return teams.find((team) => team.name === name)?.colorIndex ?? -1;
}

export function addTeamToRotation({ teams, periods }, rawName, todayIso) {
  const name = normalizeTeamName(rawName);
  if (!name) return { error: "Escribe el nombre del equipo." };
  if (teams.some((team) => normalizeText(team.name) === normalizeText(name))) {
    return { error: "Ese equipo ya existe." };
  }
  const last = periods[periods.length - 1];
  const from = last ? addDays(last.to, 1) : todayIso;
  return {
    teams: [...teams, { name, colorIndex: pickColorIndex(teams) }],
    periods: [...periods, { from, to: addDays(from, TURN_LENGTH_DAYS - 1), team: name }],
  };
}

function daysBetween(fromIso, toIso) {
  const toUtc = (iso) => {
    const [year, month, day] = iso.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / MS_PER_DAY);
}

function describePeriod(period, teams, days) {
  return {
    team: period.team,
    from: period.from,
    to: period.to,
    days,
    colorIndex: teamColorIndex(teams, period.team),
  };
}

export function buildTurnSummary({ periods, teams, todayIso }) {
  const currentIndex = findPeriodIndex(periods, todayIso);
  const nextPeriod =
    currentIndex >= 0 ? periods[currentIndex + 1] : periods.find((period) => period.from > todayIso);
  const current = currentIndex >= 0 ? describePeriod(periods[currentIndex], teams, daysBetween(todayIso, periods[currentIndex].to)) : null;
  const next = nextPeriod ? describePeriod(nextPeriod, teams, daysBetween(todayIso, nextPeriod.from)) : null;
  return { current, next, warn: Boolean(next) && next.days <= NEXT_TURN_WARNING_DAYS };
}

export function changePeriodTeam(periods, index, team) {
  return periods.map((period, position) => (position === index ? { ...period, team } : period));
}

/* Calendar */

export function monthOf(iso) {
  const [year, month] = iso.split("-").map(Number);
  return { year, month: month - 1 };
}

export function shiftMonth({ year, month }, delta) {
  const date = new Date(Date.UTC(year, month + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function formatMonthTitle({ year, month }) {
  const title = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month, 1)),
  );
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function buildMonthGrid({ year, month }, { periods, teams, todayIso }) {
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % DAYS_PER_WEEK;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
    const period = periods.find((entry) => iso >= entry.from && iso <= entry.to);
    cells.push({
      day,
      team: period?.team ?? "",
      colorIndex: period ? teamColorIndex(teams, period.team) : -1,
      isToday: iso === todayIso,
    });
  }
  while (cells.length % DAYS_PER_WEEK) cells.push(null);
  return Array.from({ length: cells.length / DAYS_PER_WEEK }, (_, week) =>
    cells.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK),
  );
}

/* Email */

export function buildEmail({ items, notes, signature, todayIso }) {
  const subject = `Pedido de material - ${OFFICE_LABEL} - ${formatLongDate(todayIso)}`;
  if (!items.length) return { subject, body: "" };

  const lines = items.map((item) => {
    const amount = item.orderQty ? `: ${item.orderQty}` : "";
    const stock = item.qty ? ` (quedan: ${item.qty})` : "";
    return `- ${item.name}${amount}${stock}`;
  });
  const parts = [
    `Hola ${MAIL_RECIPIENTS},`,
    `Tras la revisión del inventario de la ${OFFICE_LABEL}, necesitamos pedir lo siguiente:`,
    lines.join("\n"),
  ];
  if (notes.trim()) parts.push(notes.trim());
  parts.push(`Gracias,\n${signature || "Equipo de revisión"}\n${OFFICE_LABEL[0].toUpperCase()}${OFFICE_LABEL.slice(1)}`);
  return { subject, body: parts.join("\n\n") };
}

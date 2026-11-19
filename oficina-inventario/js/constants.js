export const COLLECTION_ITEMS = "items";
export const DOC_CONFIG = "meta/config";
export const DOC_REVIEW = "meta/review";
export const DOC_ROTATION = "meta/rotation";

export const LOCALE = "es-ES";
export const SNAPSHOT_TIMEOUT_MS = 10000;
export const TOAST_DURATION_MS = 4000;
export const WRITE_PERMISSION = "data.write";

export const DATE_STAMPED_FIELDS = Object.freeze(["qty", "status"]);

export const MAX_NAME_LENGTH = 80;
export const MAX_TEXT_LENGTH = 160;
export const MAX_TEAM_NAME_LENGTH = 40;

export const TEAM_PREFIX = "Team";
export const TEAM_PALETTE_SIZE = 8;
export const TURN_LENGTH_DAYS = 14;
export const MS_PER_DAY = 86400000;

export const MAIL_RECIPIENTS = "Bruno y Blanca";
export const OFFICE_LABEL = "oficina de Madrid";

export const VIEWS = Object.freeze(["turnos", "inventario", "pedido"]);
export const DEFAULT_VIEW = "turnos";
export const NEXT_TURN_WARNING_DAYS = 7;

export const WEEKDAYS = Object.freeze([
  { short: "L", full: "lunes" },
  { short: "M", full: "martes" },
  { short: "X", full: "miércoles" },
  { short: "J", full: "jueves" },
  { short: "V", full: "viernes" },
  { short: "S", full: "sábado" },
  { short: "D", full: "domingo" },
]);

export const STATUS = Object.freeze({
  NONE: "",
  TO_ORDER: "por-pedir",
  ORDERED: "pedido",
  RECEIVED: "recibido",
  PERIODIC: "periodico",
});

export const STATUS_LABELS = Object.freeze({
  [STATUS.NONE]: "Sin estado",
  [STATUS.TO_ORDER]: "Hay que pedir",
  [STATUS.ORDERED]: "Pedido",
  [STATUS.RECEIVED]: "Recibido",
  [STATUS.PERIODIC]: "Periódico",
});

export const CATEGORIES = Object.freeze([
  { id: "cocina", label: "Cocina y bebidas", emoji: "☕" },
  { id: "limpieza", label: "Baño y limpieza", emoji: "🧼" },
  { id: "almacen", label: "Almacén y tecnología", emoji: "📦" },
]);

export const DEFAULT_CONFIG = Object.freeze({ lastOrder: "" });

export const CONNECTION = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  STALE: "stale",
  UNAVAILABLE: "unavailable",
});

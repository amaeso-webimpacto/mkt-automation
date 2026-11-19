export const COLLECTION_ITEMS = "items";
export const DOC_CONFIG = "meta/config";
export const DOC_REVIEW = "meta/review";
export const DOC_ROTATION = "meta/rotation";

export const SNAPSHOT_TIMEOUT_MS = 10000;
export const TOAST_DURATION_MS = 4000;
export const WRITE_PERMISSION = "data.write";
export const SIGNATURE_STORAGE_KEY = "oficina-inventario.firma";

export const MAX_NAME_LENGTH = 80;
export const MAX_TEXT_LENGTH = 160;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const VIEWS = Object.freeze(["inventario", "pedido", "turnos"]);
export const DEFAULT_VIEW = "inventario";

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
  { id: "cocina", label: "Cocina y bebidas" },
  { id: "limpieza", label: "Baño y limpieza" },
  { id: "almacen", label: "Almacén y tecnología" },
]);

export const DEFAULT_CONFIG = Object.freeze({
  hrName: "Blanca",
  hrEmail: "",
  lastOrder: "",
});

export const CONNECTION = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  STALE: "stale",
  UNAVAILABLE: "unavailable",
});

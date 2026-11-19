import {
  COLLECTION_ITEMS,
  DOC_CONFIG,
  DOC_REVIEW,
  DOC_ROTATION,
  SIGNATURE_STORAGE_KEY,
  SNAPSHOT_TIMEOUT_MS,
  WRITE_PERMISSION,
} from "./constants.js";

let database = null;
let writeQueue = Promise.resolve();

function enqueue(task) {
  const run = writeQueue.then(task);
  writeQueue = run.catch(() => {});
  return run;
}

export async function connect(handlers) {
  const claude = window.claude;
  database = (await claude?.use?.("db")) ?? null;
  if (!database) {
    handlers.onUnavailable();
    return;
  }

  const user = await claude.use("user");
  const canWrite = user ? await user.can(WRITE_PERMISSION) : null;
  handlers.onPermissions({ readOnly: canWrite === false });

  const timer = setTimeout(handlers.onStale, SNAPSHOT_TIMEOUT_MS);
  const settle = (snapshot) => {
    if (!snapshot.metadata.fromCache) {
      clearTimeout(timer);
      handlers.onSynced();
    }
  };
  const fail = (error) => {
    clearTimeout(timer);
    handlers.onError(error);
  };

  database.collection(COLLECTION_ITEMS).onSnapshot((snapshot) => {
    settle(snapshot);
    handlers.onItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }, fail);
  subscribeDoc(DOC_CONFIG, handlers.onConfig, fail);
  subscribeDoc(DOC_REVIEW, handlers.onReview, fail);
  subscribeDoc(DOC_ROTATION, handlers.onRotation, fail);
}

function subscribeDoc(path, onData, onError) {
  database.doc(path).onSnapshot(
    (snapshot) => onData(snapshot.exists ? snapshot.data() : null),
    onError,
  );
}

export function newItemId() {
  return database.collection(COLLECTION_ITEMS).doc().id;
}

export function saveItem(id, data) {
  return enqueue(() => database.collection(COLLECTION_ITEMS).doc(id).set(data));
}

export function deleteItem(id) {
  return enqueue(() => database.collection(COLLECTION_ITEMS).doc(id).delete());
}

export function saveConfig(config) {
  return enqueue(() => database.doc(DOC_CONFIG).set(config));
}

export function saveReview(review) {
  return enqueue(() => database.doc(DOC_REVIEW).set(review));
}

export function saveRotation(periods) {
  return enqueue(() => database.doc(DOC_ROTATION).set({ periods }));
}

export function readSignature() {
  try {
    return localStorage.getItem(SIGNATURE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeSignature(value) {
  try {
    localStorage.setItem(SIGNATURE_STORAGE_KEY, value);
  } catch {
    /* the signature is a convenience; the page works without storage */
  }
}

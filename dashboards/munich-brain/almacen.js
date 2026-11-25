const COLECCION = "puntos";

/** Devuelve la base de datos del artefacto, o null si esta vista no puede usarla. */
export async function abrirAlmacen() {
  const claude = window.claude;
  if (!claude || typeof claude.use !== "function") return null;
  try {
    return await claude.use("db");
  } catch {
    return null;
  }
}

export async function abrirDescargas() {
  const claude = window.claude;
  if (!claude || typeof claude.use !== "function") return null;
  try {
    return await claude.use("downloads");
  } catch {
    return null;
  }
}

export function suscribirRespuestas(db, alRecibir, alFallar) {
  return db.collection(COLECCION).onSnapshot((instantanea) => {
    const mapa = {};
    instantanea.docs.forEach((documento) => {
      mapa[documento.id] = documento.data();
    });
    alRecibir(mapa, instantanea.metadata.fromCache);
  }, alFallar);
}

export function guardarRespuesta(db, id, datos) {
  return db.doc(`${COLECCION}/${id}`).set(datos);
}

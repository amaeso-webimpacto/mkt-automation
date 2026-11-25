export const MAX_RESPUESTA = 4000;
export const MAX_FUENTE = 500;
export const FILTROS_VACIOS = Object.freeze({ texto: "", fase: "", estado: "", certeza: "", plataforma: "", soloBloqueantes: false });

function idsDe(lista) {
  return lista.map((opcion) => opcion.id);
}

function valorValido(valor, lista, porDefecto) {
  return idsDe(lista).includes(valor) ? valor : porDefecto;
}

function textoAcotado(valor, maximo) {
  return typeof valor === "string" ? valor.slice(0, maximo) : "";
}

/** Convierte un documento de la base de datos (no fiable) en una respuesta con valores válidos. */
export function normalizarRespuesta(bruta, catalogo) {
  const origen = bruta && typeof bruta === "object" ? bruta : {};
  const { defecto } = catalogo;
  return {
    estado: valorValido(origen.estado, catalogo.estados, defecto.estado),
    certeza: valorValido(origen.certeza, catalogo.certezas, defecto.certeza),
    plataforma: valorValido(origen.plataforma, catalogo.plataformas, defecto.plataforma),
    respuesta: textoAcotado(origen.respuesta, MAX_RESPUESTA),
    fuente: textoAcotado(origen.fuente, MAX_FUENTE),
    actualizado: textoAcotado(origen.actualizado, 40),
  };
}

export function resolverPuntos(catalogo, respuestas) {
  return catalogo.puntos.map((punto) => ({ ...punto, ...normalizarRespuesta(respuestas[punto.id], catalogo) }));
}

export function esBloqueante(punto) {
  return punto.estado === "bloqueado" || (punto.bloquea === true && punto.estado !== "validado");
}

export function contarPorEstado(puntos, estados) {
  return estados.map((estado) => ({ ...estado, cantidad: puntos.filter((punto) => punto.estado === estado.id).length }));
}

export function calcularProgreso(puntos, estadosResueltos) {
  const total = puntos.length;
  const resueltos = puntos.filter((punto) => estadosResueltos.includes(punto.estado)).length;
  const porcentaje = total === 0 ? 0 : Math.round((resueltos / total) * 100);
  return { total, resueltos, porcentaje };
}

function coincideTexto(punto, texto) {
  if (!texto) return true;
  const buscado = texto.trim().toLowerCase();
  return `${punto.titulo} ${punto.respuesta} ${punto.fuente}`.toLowerCase().includes(buscado);
}

export function pasaFiltros(punto, filtros) {
  if (filtros.fase !== "" && String(punto.fase) !== filtros.fase) return false;
  if (filtros.estado !== "" && punto.estado !== filtros.estado) return false;
  if (filtros.certeza !== "" && punto.certeza !== filtros.certeza) return false;
  if (filtros.plataforma !== "" && punto.plataforma !== filtros.plataforma) return false;
  if (filtros.soloBloqueantes && !esBloqueante(punto)) return false;
  return coincideTexto(punto, filtros.texto);
}

export function etiquetaDe(lista, id) {
  const encontrada = lista.find((opcion) => opcion.id === id);
  return encontrada ? encontrada.label : id;
}

import { esBloqueante, etiquetaDe } from "./modelo.js";

const LONGITUD_VISTA_PREVIA = 160;
const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" });

function selector(nombre) {
  return `[data-js="${nombre}"]`;
}

export function pieza(raiz, nombre) {
  return raiz.querySelector(selector(nombre));
}

function clonarPlantilla(nombre) {
  return document.querySelector(selector(nombre)).content.firstElementChild.cloneNode(true);
}

function crearOpcion(valor, texto) {
  const opcion = document.createElement("option");
  opcion.value = valor;
  opcion.textContent = texto;
  return opcion;
}

function rellenarSelect(select, opciones, textoTodos) {
  select.replaceChildren();
  if (textoTodos) select.append(crearOpcion("", textoTodos));
  opciones.forEach((opcion) => select.append(crearOpcion(String(opcion.id), opcion.label)));
}

export function poblarFiltros(catalogo) {
  const fases = catalogo.fases.map((fase) => ({ id: fase.id, label: `Fase ${fase.id}. ${fase.titulo}` }));
  rellenarSelect(pieza(document, "filtro-fase"), fases, "Todas");
  rellenarSelect(pieza(document, "filtro-estado"), catalogo.estados, "Todos");
  rellenarSelect(pieza(document, "filtro-certeza"), catalogo.certezas, "Todas");
  rellenarSelect(pieza(document, "filtro-plataforma"), catalogo.plataformas, "Todas");
}

function enlazarEtiqueta(raiz, campo, idPunto) {
  const control = pieza(raiz, `campo-${campo}`);
  const etiqueta = pieza(raiz, `label-${campo}`);
  control.id = `${idPunto}-${campo}`;
  etiqueta.htmlFor = control.id;
}

function construirPunto(punto, catalogo) {
  const raiz = clonarPlantilla("plantilla-punto");
  raiz.dataset.puntoId = punto.id;
  pieza(raiz, "titulo").textContent = punto.titulo;
  ["estado", "certeza", "plataforma", "respuesta", "fuente"].forEach((campo) => enlazarEtiqueta(raiz, campo, punto.id));
  rellenarSelect(pieza(raiz, "campo-estado"), catalogo.estados);
  rellenarSelect(pieza(raiz, "campo-certeza"), catalogo.certezas);
  rellenarSelect(pieza(raiz, "campo-plataforma"), catalogo.plataformas);
  return raiz;
}

function construirFase(fase, puntosDeFase, catalogo, refs) {
  const raiz = clonarPlantilla("plantilla-fase");
  pieza(raiz, "fase-num").textContent = String(fase.id).padStart(2, "0");
  pieza(raiz, "fase-titulo").textContent = fase.titulo;
  if (fase.nota) {
    const nota = pieza(raiz, "fase-nota");
    nota.textContent = fase.nota;
    nota.hidden = false;
  }
  pieza(raiz, "fase-vacia").hidden = puntosDeFase.length > 0;
  puntosDeFase.forEach((punto) => {
    const elemento = construirPunto(punto, catalogo);
    pieza(raiz, "fase-puntos").append(elemento);
    refs.puntos.set(punto.id, elemento);
  });
  refs.fases.set(fase.id, { raiz, total: puntosDeFase.length });
  return raiz;
}

/** Crea todas las fases y puntos una sola vez y devuelve sus elementos por id. */
export function construirTablero(contenedor, catalogo) {
  const refs = { puntos: new Map(), fases: new Map() };
  const fases = catalogo.fases.map((fase) => construirFase(fase, catalogo.puntos.filter((punto) => punto.fase === fase.id), catalogo, refs));
  contenedor.replaceChildren(...fases);
  return refs;
}

function ponerPildora(elemento, valor, texto) {
  elemento.dataset.valor = valor;
  elemento.textContent = texto;
}

function recortar(texto) {
  const limpio = texto.trim();
  return limpio.length > LONGITUD_VISTA_PREVIA ? `${limpio.slice(0, LONGITUD_VISTA_PREVIA)}…` : limpio;
}

function volcarFormulario(raiz, punto) {
  const form = pieza(raiz, "form");
  if (form.dataset.sucio === "1") return;
  pieza(raiz, "campo-estado").value = punto.estado;
  pieza(raiz, "campo-certeza").value = punto.certeza;
  pieza(raiz, "campo-plataforma").value = punto.plataforma;
  pieza(raiz, "campo-respuesta").value = punto.respuesta;
  pieza(raiz, "campo-fuente").value = punto.fuente;
}

function textoActualizado(iso) {
  const fecha = new Date(iso);
  return iso && !Number.isNaN(fecha.getTime()) ? `Actualizado ${FORMATO_FECHA.format(fecha)}` : "";
}

export function pintarPunto(raiz, punto, catalogo) {
  ponerPildora(pieza(raiz, "pildora-estado"), punto.estado, etiquetaDe(catalogo.estados, punto.estado));
  ponerPildora(pieza(raiz, "pildora-certeza"), punto.certeza, etiquetaDe(catalogo.certezas, punto.certeza));
  const plataforma = pieza(raiz, "pildora-plataforma");
  plataforma.hidden = punto.plataforma === catalogo.defecto.plataforma;
  plataforma.textContent = etiquetaDe(catalogo.plataformas, punto.plataforma);
  pieza(raiz, "pildora-bloqueo").hidden = !esBloqueante(punto);
  pieza(raiz, "vista-previa").textContent = recortar(punto.respuesta);
  pieza(raiz, "actualizado").textContent = textoActualizado(punto.actualizado);
  volcarFormulario(raiz, punto);
}

export function aplicarFiltros(refs, puntos, pasa, hayFiltros) {
  const visiblesPorFase = new Map();
  puntos.forEach((punto) => {
    const visible = pasa(punto);
    refs.puntos.get(punto.id).hidden = !visible;
    if (visible) visiblesPorFase.set(punto.fase, (visiblesPorFase.get(punto.fase) || 0) + 1);
  });
  refs.fases.forEach((fase, id) => {
    const hayVisibles = (visiblesPorFase.get(id) || 0) > 0;
    fase.raiz.hidden = hayFiltros ? !hayVisibles : false;
  });
  pieza(document, "sin-resultados").hidden = !hayFiltros || puntos.some(pasa);
}

export function pintarProgreso(progreso, conteo) {
  pieza(document, "progreso-texto").textContent = `${progreso.resueltos} de ${progreso.total} puntos respondidos o validados (${progreso.porcentaje} %)`;
  const barra = pieza(document, "progreso-barra");
  barra.value = progreso.porcentaje;
  const filas = conteo.map((estado) => {
    const item = document.createElement("li");
    const pildora = document.createElement("span");
    ponerPildora(pildora, estado.id, estado.label);
    pildora.classList.add("pildora");
    item.append(pildora, ` ${estado.cantidad}`);
    return item;
  });
  pieza(document, "conteo").replaceChildren(...filas);
}

export function pintarBloqueantes(puntos, catalogo) {
  const lista = pieza(document, "bloqueantes");
  const filas = puntos.map((punto) => {
    const fila = clonarPlantilla("plantilla-bloqueante");
    fila.dataset.puntoId = punto.id;
    pieza(fila, "bloqueante-titulo").textContent = punto.titulo;
    ponerPildora(pieza(fila, "bloqueante-estado"), punto.estado, etiquetaDe(catalogo.estados, punto.estado));
    return fila;
  });
  lista.replaceChildren(...filas);
  pieza(document, "bloqueantes-vacio").hidden = puntos.length > 0;
}

export function abrirPunto(refs, id) {
  const raiz = refs.puntos.get(id);
  if (!raiz) return;
  raiz.hidden = false;
  pieza(raiz, "detalle").open = true;
  raiz.scrollIntoView({ block: "center" });
  pieza(raiz, "resumen").focus();
}

export function mostrarMensaje(raiz, texto) {
  pieza(raiz, "mensaje").textContent = texto;
}

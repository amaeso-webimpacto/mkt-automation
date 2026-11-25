import { abrirAlmacen, abrirDescargas, guardarRespuesta, suscribirRespuestas } from "./almacen.js";
import { FILTROS_VACIOS, calcularProgreso, contarPorEstado, esBloqueante, normalizarRespuesta, pasaFiltros, resolverPuntos } from "./modelo.js";
import { construirResumen } from "./resumen.js";
import { abrirPunto, aplicarFiltros, construirTablero, mostrarMensaje, pieza, pintarBloqueantes, pintarProgreso, pintarPunto, poblarFiltros } from "./vista.js";

const URL_CHECKLIST = "checklist.json";
const ESPERA_BASE_DATOS_MS = 10000;
const MENSAJES = {
  sinChecklist: "No se pudo cargar el checklist. Recarga la página.",
  sinBaseDatos: "Sin conexión con la base de datos del artefacto: se muestra el checklist, pero no se guardan respuestas.",
  esperando: "La base de datos tarda en responder. Las respuestas mostradas pueden no estar al día.",
  falloLectura: "No se pudieron leer las respuestas guardadas.",
  guardado: "Guardado.",
  soloLectura: "No tienes permiso para guardar en este panel.",
  cupoLleno: "La base de datos del artefacto está llena. No se puede guardar.",
  falloGuardado: "No se pudo guardar. Inténtalo de nuevo en unos segundos.",
  copiado: "Resumen copiado.",
  copiaManual: "Selecciona el texto y cópialo con Ctrl+C.",
  descargado: "Archivo guardado.",
  descargaCancelada: "No se guardó el archivo.",
};

const estado = { catalogo: null, respuestas: {}, filtros: { ...FILTROS_VACIOS }, db: null, refs: null, claveBloqueantes: "", descargas: null };

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function mostrarConexion(texto) {
  pieza(document, "conexion").textContent = texto;
}

function hayFiltros() {
  return Object.keys(FILTROS_VACIOS).some((clave) => estado.filtros[clave] !== FILTROS_VACIOS[clave]);
}

function refrescar() {
  const { catalogo, refs } = estado;
  const puntos = resolverPuntos(catalogo, estado.respuestas);
  puntos.forEach((punto) => pintarPunto(refs.puntos.get(punto.id), punto, catalogo));
  pintarProgreso(calcularProgreso(puntos, catalogo.estadosResueltos), contarPorEstado(puntos, catalogo.estados));
  const bloqueantes = puntos.filter(esBloqueante);
  const clave = bloqueantes.map((punto) => `${punto.id}:${punto.estado}`).join("|");
  if (clave !== estado.claveBloqueantes) {
    estado.claveBloqueantes = clave;
    pintarBloqueantes(bloqueantes, catalogo);
  }
  aplicarFiltros(refs, puntos, (punto) => pasaFiltros(punto, estado.filtros), hayFiltros());
}

function leerFiltros(form) {
  const datos = new FormData(form);
  estado.filtros = {
    texto: String(datos.get("texto") || ""),
    fase: String(datos.get("fase") || ""),
    estado: String(datos.get("estado") || ""),
    certeza: String(datos.get("certeza") || ""),
    plataforma: String(datos.get("plataforma") || ""),
    soloBloqueantes: datos.get("soloBloqueantes") !== null,
  };
  refrescar();
}

function mensajeDeError(error) {
  const codigo = error && error.code;
  if (codigo === "invalid_argument" || codigo === "not_granted") return MENSAJES.soloLectura;
  if (codigo === "quota_exceeded") return MENSAJES.cupoLleno;
  return MENSAJES.falloGuardado;
}

function leerFormulario(form, catalogo) {
  const datos = new FormData(form);
  const normalizados = normalizarRespuesta(Object.fromEntries(datos.entries()), catalogo);
  return { ...normalizados, actualizado: new Date().toISOString() };
}

async function guardarPunto(raiz, form) {
  const boton = pieza(raiz, "guardar");
  boton.disabled = true;
  mostrarMensaje(raiz, "Guardando…");
  try {
    await guardarRespuesta(estado.db, raiz.dataset.puntoId, leerFormulario(form, estado.catalogo));
    delete form.dataset.sucio;
    mostrarMensaje(raiz, MENSAJES.guardado);
  } catch (error) {
    mostrarMensaje(raiz, mensajeDeError(error));
  } finally {
    boton.disabled = false;
  }
}

function alEnviarPunto(evento) {
  evento.preventDefault();
  const raiz = evento.target.closest('[data-js="punto"]');
  if (!raiz || !estado.db) return;
  guardarPunto(raiz, evento.target);
}

function alEditarPunto(evento) {
  const form = evento.target.closest('[data-js="form"]');
  if (form) form.dataset.sucio = "1";
}

function alPulsarBloqueante(evento) {
  const boton = evento.target.closest('[data-js="ir-punto"]');
  if (!boton) return;
  abrirPunto(estado.refs, boton.closest("li").dataset.puntoId);
}

function generarResumen() {
  const puntos = resolverPuntos(estado.catalogo, estado.respuestas);
  pieza(document, "md-texto").value = construirResumen(estado.catalogo, puntos, hoy());
  pieza(document, "md-panel").hidden = false;
  pieza(document, "md-mensaje").textContent = "";
  pieza(document, "md-texto").focus();
}

async function copiarResumen() {
  const area = pieza(document, "md-texto");
  const mensaje = pieza(document, "md-mensaje");
  try {
    await navigator.clipboard.writeText(area.value);
    mensaje.textContent = MENSAJES.copiado;
  } catch {
    area.select();
    mensaje.textContent = MENSAJES.copiaManual;
  }
}

async function descargarResumen() {
  const mensaje = pieza(document, "md-mensaje");
  try {
    await estado.descargas.save({ filename: `Company-brain-${estado.catalogo.cliente}-${hoy()}.md`, data: pieza(document, "md-texto").value });
    mensaje.textContent = MENSAJES.descargado;
  } catch {
    mensaje.textContent = MENSAJES.descargaCancelada;
  }
}

function conectarEventos() {
  const filtros = pieza(document, "filtros");
  filtros.addEventListener("input", () => leerFiltros(filtros));
  filtros.addEventListener("reset", () => setTimeout(() => leerFiltros(filtros), 0));
  const tablero = pieza(document, "tablero");
  tablero.addEventListener("submit", alEnviarPunto);
  tablero.addEventListener("input", alEditarPunto);
  pieza(document, "bloqueantes").addEventListener("click", alPulsarBloqueante);
  pieza(document, "generar-md").addEventListener("click", generarResumen);
  pieza(document, "copiar-md").addEventListener("click", copiarResumen);
  pieza(document, "descargar-md").addEventListener("click", descargarResumen);
}

function desactivarGuardado() {
  estado.refs.puntos.forEach((raiz) => {
    pieza(raiz, "guardar").disabled = true;
  });
}

function escucharRespuestas() {
  const temporizador = setTimeout(() => mostrarConexion(MENSAJES.esperando), ESPERA_BASE_DATOS_MS);
  suscribirRespuestas(
    estado.db,
    (mapa, desdeCache) => {
      estado.respuestas = mapa;
      refrescar();
      if (!desdeCache) {
        clearTimeout(temporizador);
        mostrarConexion("");
      }
    },
    () => {
      clearTimeout(temporizador);
      mostrarConexion(MENSAJES.falloLectura);
    },
  );
}

async function cargarChecklist() {
  const respuesta = await fetch(URL_CHECKLIST);
  if (!respuesta.ok) throw new Error(`checklist ${respuesta.status}`);
  return respuesta.json();
}

async function iniciar() {
  try {
    estado.catalogo = await cargarChecklist();
  } catch {
    mostrarConexion(MENSAJES.sinChecklist);
    return;
  }
  poblarFiltros(estado.catalogo);
  estado.refs = construirTablero(pieza(document, "tablero"), estado.catalogo);
  pieza(document, "meta").textContent = `Cliente: ${estado.catalogo.cliente} · Checklist versión ${estado.catalogo.version}`;
  conectarEventos();
  refrescar();
  estado.descargas = await abrirDescargas();
  pieza(document, "descargar-md").hidden = !estado.descargas;
  estado.db = await abrirAlmacen();
  if (!estado.db) {
    mostrarConexion(MENSAJES.sinBaseDatos);
    desactivarGuardado();
    return;
  }
  escucharRespuestas();
}

iniciar();

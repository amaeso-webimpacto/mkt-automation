const ID_DATOS = "datos-oficina";
const PASO_MS = 2800;
const SALUDO_MS = 2200;
const TEXTO_REPRODUCIR = "Reproducir recorrido";
const TEXTO_PARAR = "Parar recorrido";

const datos = JSON.parse(document.getElementById(ID_DATOS).textContent);
const refs = {
  escena: document.querySelector('[data-js="escena"]'),
  jarvis: document.querySelector('[data-js="jarvis"]'),
  burbuja: document.querySelector('[data-js="burbuja-texto"]'),
  puestos: document.querySelector('[data-js="puestos"]'),
  dice: document.querySelector('[data-js="panel-dice"]'),
  titulo: document.querySelector('[data-js="panel-titulo"]'),
  resumen: document.querySelector('[data-js="panel-resumen"]'),
  datos: document.querySelector('[data-js="panel-datos"]'),
  chips: document.querySelector('[data-js="panel-chips"]'),
  fuente: document.querySelector('[data-js="panel-fuente"]'),
  pasos: document.querySelector('[data-js="pasos"]'),
  reproducir: document.querySelector('[data-js="reproducir"]'),
};
const estado = { lugar: datos.inicial, paso: 0, temporizador: null, saludo: null };

function crear(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function textoBurbuja(lugar, paso) {
  return paso > 0 ? datos.pasos[paso - 1].burbuja : datos.lugares[lugar].burbuja;
}

function pintarPuestos() {
  const botones = datos.orden.map((id) => {
    const boton = crear("button", "puesto", datos.lugares[id].nombre);
    boton.type = "button";
    boton.dataset.jsPuesto = id;
    boton.setAttribute("aria-pressed", String(id === estado.lugar));
    return boton;
  });
  refs.puestos.replaceChildren(...botones);
}

function pintarDatos(lista) {
  const filas = lista.map(({ etiqueta, valor }) => {
    const fila = crear("div");
    fila.append(crear("dt", "", etiqueta), crear("dd", "", valor));
    return fila;
  });
  refs.datos.replaceChildren(...filas);
}

function pintarGrupos(grupos = []) {
  const bloques = grupos.map(({ grupo, estado: tipo, items }) => {
    const bloque = crear("div", "grupo");
    const lista = crear("ul", "grupo__lista");
    lista.setAttribute("aria-label", grupo);
    items.forEach((nombre) => {
      const chip = crear("li", "chip");
      chip.append(crear("span", `chip__punto chip__punto--${tipo}`), nombre);
      chip.firstChild.setAttribute("aria-hidden", "true");
      lista.append(chip);
    });
    bloque.append(crear("p", "grupo__titulo", `${grupo} (${items.length})`), lista);
    return bloque;
  });
  refs.chips.replaceChildren(...bloques);
}

function pintarPanel() {
  const lugar = datos.lugares[estado.lugar];
  refs.titulo.textContent = lugar.nombre;
  refs.resumen.textContent = lugar.resumen;
  refs.dice.textContent = lugar.dice;
  refs.fuente.textContent = `Fuente: ${lugar.fuente}`;
  pintarDatos(lugar.datos);
  pintarGrupos(lugar.chips);
}

function pintarEscena() {
  refs.jarvis.dataset.lugar = estado.lugar;
  refs.escena.dataset.paso = String(estado.paso);
  refs.burbuja.textContent = textoBurbuja(estado.lugar, estado.paso);
  refs.escena.querySelectorAll("[data-js-lugar]").forEach((nodo) => {
    nodo.dataset.activa = String(nodo.dataset.jsLugar === estado.lugar);
  });
  refs.puestos.querySelectorAll("[data-js-puesto]").forEach((boton) => {
    boton.setAttribute("aria-pressed", String(boton.dataset.jsPuesto === estado.lugar));
  });
}

function pintarPasos() {
  const items = datos.pasos.map((paso, indice) => {
    const item = crear("li", "pasos__item");
    const texto = crear("div");
    texto.append(crear("p", "pasos__titulo", paso.titulo), crear("p", "pasos__detalle", paso.detalle));
    item.append(texto);
    if (indice + 1 === estado.paso) item.setAttribute("aria-current", "step");
    if (indice + 1 < estado.paso) item.classList.add("pasos__item--hecho");
    return item;
  });
  refs.pasos.replaceChildren(...items);
  refs.reproducir.textContent = estado.temporizador ? TEXTO_PARAR : TEXTO_REPRODUCIR;
}

function saludar() {
  refs.jarvis.dataset.saluda = "true";
  clearTimeout(estado.saludo);
  estado.saludo = setTimeout(() => { refs.jarvis.dataset.saluda = "false"; }, SALUDO_MS);
}

function pintarTodo() {
  pintarPanel();
  pintarEscena();
  pintarPasos();
}

function detenerRecorrido() {
  clearTimeout(estado.temporizador);
  estado.temporizador = null;
  estado.paso = 0;
}

function avanzarRecorrido() {
  if (estado.paso >= datos.pasos.length) {
    detenerRecorrido();
    estado.lugar = datos.inicial;
    pintarTodo();
    return;
  }
  estado.paso += 1;
  estado.lugar = datos.pasos[estado.paso - 1].lugar;
  estado.temporizador = setTimeout(avanzarRecorrido, PASO_MS);
  pintarTodo();
  saludar();
}

function elegirLugar(lugar) {
  if (!datos.lugares[lugar]) return;
  detenerRecorrido();
  estado.lugar = lugar;
  pintarTodo();
  saludar();
}

function alternarRecorrido() {
  if (estado.temporizador) {
    detenerRecorrido();
    pintarTodo();
    return;
  }
  avanzarRecorrido();
}

refs.puestos.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-js-puesto]");
  if (boton) elegirLugar(boton.dataset.jsPuesto);
});
refs.escena.addEventListener("click", (evento) => {
  const puesto = evento.target.closest("[data-js-lugar]");
  if (puesto) elegirLugar(puesto.dataset.jsLugar);
});
refs.reproducir.addEventListener("click", alternarRecorrido);

pintarPuestos();
pintarTodo();

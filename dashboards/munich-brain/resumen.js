import { calcularProgreso, etiquetaDe } from "./modelo.js";

function citar(texto) {
  return texto.split("\n").map((linea) => `> ${linea}`.trimEnd()).join("\n");
}

function bloquePunto(punto, catalogo) {
  const lineas = [
    `### ${punto.titulo}`,
    `- Estado: ${etiquetaDe(catalogo.estados, punto.estado)}`,
    `- Certeza: ${etiquetaDe(catalogo.certezas, punto.certeza)}`,
    `- Plataforma: ${etiquetaDe(catalogo.plataformas, punto.plataforma)}`,
    `- Fuente: ${punto.fuente.trim() || "sin indicar"}`,
  ];
  if (punto.respuesta.trim()) lineas.push("", citar(punto.respuesta.trim()));
  return lineas.join("\n");
}

function seccionFase(fase, puntosResueltos, catalogo) {
  if (puntosResueltos.length === 0) return "";
  const cuerpo = puntosResueltos.map((punto) => bloquePunto(punto, catalogo)).join("\n\n");
  return `## Fase ${fase.id}. ${fase.titulo}\n\n${cuerpo}`;
}

function listaSinResolver(puntos, catalogo) {
  if (puntos.length === 0) return "";
  const filas = puntos.map((punto) => `- Fase ${punto.fase}: ${punto.titulo} (${etiquetaDe(catalogo.estados, punto.estado)}, ${etiquetaDe(catalogo.certezas, punto.certeza)})`);
  return `## Sin responder todavía\n\n${filas.join("\n")}`;
}

/** Devuelve el resumen en Markdown de los puntos respondidos o validados. */
export function construirResumen(catalogo, puntos, fecha) {
  const resueltos = puntos.filter((punto) => catalogo.estadosResueltos.includes(punto.estado));
  const pendientes = puntos.filter((punto) => !catalogo.estadosResueltos.includes(punto.estado));
  const progreso = calcularProgreso(puntos, catalogo.estadosResueltos);
  const cabecera = [
    `# Company brain de ${catalogo.cliente}: resumen de lo respondido`,
    `Fecha: ${fecha}. Progreso: ${progreso.resueltos} de ${progreso.total} puntos respondidos o validados (${progreso.porcentaje} %).`,
  ].join("\n\n");
  const fases = catalogo.fases.map((fase) => seccionFase(fase, resueltos.filter((punto) => punto.fase === fase.id), catalogo));
  return [cabecera, ...fases, listaSinResolver(pendientes, catalogo)].filter(Boolean).join("\n\n") + "\n";
}

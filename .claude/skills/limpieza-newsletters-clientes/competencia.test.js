const test = require("node:test");
const assert = require("node:assert");
const competencia = require("./competencia.json");
const { confirmados } = require("./remitentes.json");

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

test("cada remitente es una dirección de correo en minúsculas y con nombre", () => {
  assert.ok(competencia.remitentes.length > 0);
  for (const { nombre, remitente } of competencia.remitentes) {
    assert.ok(nombre.length > 0);
    assert.match(remitente, FORMATO_CORREO);
    assert.strictEqual(remitente, remitente.toLowerCase());
  }
});

test("no hay direcciones repetidas", () => {
  const direcciones = competencia.remitentes.map(({ remitente }) => remitente);
  assert.strictEqual(new Set(direcciones).size, direcciones.length);
});

test("una dirección de la competencia nunca es también un cliente", () => {
  const clientes = new Set(confirmados.map(({ remitente }) => remitente.toLowerCase()));
  for (const { remitente } of competencia.remitentes) assert.ok(!clientes.has(remitente), remitente);
});

test("el tope por ejecución es un número positivo", () => {
  assert.ok(Number.isInteger(competencia.tope_hilos_por_ejecucion) && competencia.tope_hilos_por_ejecucion > 0);
});

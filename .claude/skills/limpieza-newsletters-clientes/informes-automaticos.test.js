const test = require("node:test");
const assert = require("node:assert");
const lista = require("./informes-automaticos.json");

const ANTIGUEDAD_MINIMA_EN_DIAS = 2;
const FORMATO_ANTIGUEDAD = /^(\d+)d$/;
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

test("el propietario es una dirección de correo", () => {
  assert.match(lista.propietario, FORMATO_CORREO);
});

test("la antigüedad mínima deja siempre el día de hoy y un día de margen", () => {
  const coincidencia = FORMATO_ANTIGUEDAD.exec(lista.antiguedad_minima);
  assert.ok(coincidencia, lista.antiguedad_minima);
  assert.ok(Number(coincidencia[1]) >= ANTIGUEDAD_MINIMA_EN_DIAS);
});

test("el tope por ejecución es un número positivo", () => {
  assert.ok(Number.isInteger(lista.tope_hilos_por_ejecucion) && lista.tope_hilos_por_ejecucion > 0);
});

test("los prefijos no están vacíos, ni repetidos, ni con espacios en los extremos", () => {
  assert.ok(lista.prefijos.length > 0);
  for (const prefijo of lista.prefijos) assert.strictEqual(prefijo, prefijo.trim());
  assert.ok(lista.prefijos.every((prefijo) => prefijo.length > 0));
  assert.strictEqual(new Set(lista.prefijos).size, lista.prefijos.length);
});

test("ningún prefijo entra en un asunto excluido", () => {
  for (const prefijo of lista.prefijos) {
    for (const excluido of lista.no_entran) {
      assert.ok(!prefijo.startsWith(excluido) && !excluido.startsWith(prefijo), `${prefijo} / ${excluido}`);
    }
  }
});

test("el mínimo de longitud para un prefijo detectado evita prefijos genéricos", () => {
  assert.ok(lista.longitud_minima_de_prefijo_detectado >= 20);
});

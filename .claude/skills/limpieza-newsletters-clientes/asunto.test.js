const test = require("node:test");
const assert = require("node:assert");
const { decodificarAsunto, esAsuntoDeTest } = require("./asunto.js");
const { verificarPlataforma } = require("./verificar-plataforma.js");

test("decodifica asuntos codificados en Q y en B, también mezclados con texto", () => {
  assert.strictEqual(decodificarAsunto("=?UTF-8?q?[Vista_previa]_=C3=9Altimo_d=C3=ADa?="), "[Vista previa] Último día");
  assert.strictEqual(decodificarAsunto("365 =?UTF-8?B?ZMOtYXM=?= cumpliendo"), "365 días cumpliendo");
});

test("une las palabras codificadas contiguas sin espacio de más", () => {
  assert.strictEqual(decodificarAsunto("=?UTF-8?q?Ho?= =?UTF-8?q?la?="), "Hola");
});

test("detecta los asuntos de test aunque vengan codificados o con acentos", () => {
  for (const asunto of ["Test send - New arrivals", "[Vista previa] Tu selección", "=?UTF-8?q?[Vista_previa]_=C3=9Altimo_d=C3=ADa?=", "Prueba de envío", "Bienvenida 1 PREVIEW", "TEST", "Marketing Email Preview Send"]) {
    assert.ok(esAsuntoDeTest(asunto), asunto);
  }
});

test("no confunde campañas reales con tests", () => {
  for (const asunto of ["The latest boots", "Contest winners", "Greatest hits", "Siente la tendencia", "Black Friday: hasta un 30 %", "", "Un testimonio de clientes"]) {
    assert.ok(!esAsuntoDeTest(asunto), asunto);
  }
});

const correo = (asunto) => [
  `Subject: ${asunto}`,
  "List-Unsubscribe: <https://manage.kmail-lists.com/subscriptions/unsubscribe?a=1>",
  "X-Kmail-Account: ABC",
  "",
  "cuerpo",
].join("\r\n");

test("un asunto de test se rechaza aunque las cabeceras sean de Klaviyo", () => {
  const resultado = verificarPlataforma(correo("=?UTF-8?q?[Vista_previa]_Black_Friday?="));
  assert.strictEqual(resultado.ok, false);
  assert.strictEqual(resultado.motivo, "asunto-de-test-interno");
});

test("un asunto normal sigue verificándose como Klaviyo", () => {
  assert.strictEqual(verificarPlataforma(correo("The latest collection")).plataforma, "klaviyo");
});

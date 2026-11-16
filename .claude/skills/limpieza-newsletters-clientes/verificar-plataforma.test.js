const test = require("node:test");
const assert = require("node:assert");
const { verificarPlataforma } = require("./verificar-plataforma.js");

const mime = (cabeceras) => cabeceras.join("\r\n") + "\r\n\r\ncuerpo";

test("reconoce Klaviyo por sus cabeceras", () => {
  const resultado = verificarPlataforma(mime([
    "From: Tienda <hola@tienda.example>",
    "List-Unsubscribe: <https://manage.kmail-lists.com/subscriptions/unsubscribe?a=1>",
    "X-Kmail-Account: ABC123",
  ]));
  assert.strictEqual(resultado.plataforma, "klaviyo");
  assert.ok(resultado.ok);
});

test("reconoce iCommkt por la firma DKIM y por la cabecera plegada", () => {
  const resultado = verificarPlataforma(mime([
    "DKIM-Signature: v=1; a=rsa-sha256;",
    "\td=auth.icommarketing.com; s=k1;",
    "List-Unsubscribe: <https://t.m5icmkt.com/baja?x=1>",
  ]));
  assert.strictEqual(resultado.plataforma, "icommkt");
});

test("reconoce HubSpot por X-HS-Cid", () => {
  const resultado = verificarPlataforma(mime(["List-Unsubscribe: <https://x.example/u>", "X-HS-Cid: 12345"]));
  assert.strictEqual(resultado.plataforma, "hubspot");
});

test("no verifica un correo de una persona", () => {
  const resultado = verificarPlataforma(mime(["From: Persona <persona@empresa.example>", "Subject: Hola", "In-Reply-To: <abc@empresa.example>"]));
  assert.strictEqual(resultado.ok, false);
});

test("no verifica una conversación aunque pase por una plataforma", () => {
  const resultado = verificarPlataforma(mime(["List-Unsubscribe: <https://x.example/u>", "X-Kmail-Account: ABC", "In-Reply-To: <abc@x.example>"]));
  assert.strictEqual(resultado.motivo, "forma-parte-de-una-conversacion");
});

test("no verifica una plataforma desconocida ni Connectif sin firma", () => {
  const resultado = verificarPlataforma(mime(["List-Unsubscribe: <https://x.example/u>", "X-Mailer: Connectif"]));
  assert.strictEqual(resultado.motivo, "plataforma-no-reconocida");
});

test("no verifica un correo sin cabecera de baja de lista", () => {
  assert.strictEqual(verificarPlataforma(mime(["X-Kmail-Account: ABC"])).motivo, "sin-cabecera-de-baja-de-lista");
});

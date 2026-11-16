const test = require("node:test");
const assert = require("node:assert");
const { partesDeTexto, decodificarQuotedPrintable } = require("./mime.js");
const { extraerEnlaces, elegirEnlace } = require("./enlaces-newsletter.js");
const { procesarCorreo } = require("./procesar-correo.js");

const REMITENTES = [{ cliente: "Cliente de prueba", remitente: "news@tienda.example", plataforma: "klaviyo" }];
const html = (cuerpo) => `<html><body>${cuerpo}</body></html>`;

const correo = ({ de = "Tienda <news@tienda.example>", extra = [], cuerpoHtml }) => [
  `From: ${de}`,
  "List-Unsubscribe: <https://manage.kmail-lists.com/subscriptions/unsubscribe?a=1>",
  "X-Kmail-Account: ABC",
  ...extra,
  'Content-Type: multipart/alternative; boundary="LIMITE"',
  "",
  "--LIMITE",
  "Content-Type: text/html; charset=utf-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  cuerpoHtml,
  "--LIMITE--",
  "",
].join("\r\n");

const CUERPO_TIENDA = html(
  '<a href=3D"https://tienda.example/pages/baja">Cancelar suscripci=C3=B3n</a>' +
    '<a href=3D"https://tienda.example/">Logo</a>' +
    '<a href=3D"https://tienda.example/collections/novedades?a=3D1&amp;b=3D2"><img alt=3D"Comprar ahora"></a>',
);
const sinResolver = async () => null;
const noDebeAbrir = async () => {
  throw new Error("no debe abrir enlaces");
};

test("decodifica quoted-printable con acentos y saltos suaves", () => {
  assert.strictEqual(decodificarQuotedPrintable("suscripci=C3=B3n larga=\r\n da").toString("utf8"), "suscripción larga da");
});

test("lee el HTML de un multipart", () => {
  const partes = partesDeTexto(correo({ cuerpoHtml: CUERPO_TIENDA }));
  assert.strictEqual(partes[0].tipo, "text/html");
  assert.ok(partes[0].texto.includes("Cancelar suscripción"));
});

test("elige el enlace de contenido y descarta baja y logo", () => {
  const enlace = elegirEnlace(extraerEnlaces(partesDeTexto(correo({ cuerpoHtml: CUERPO_TIENDA }))));
  assert.strictEqual(enlace.url, "https://tienda.example/collections/novedades?a=1&b=2");
});

test("extrae enlaces de texto con formato Markdown y con paréntesis", () => {
  const enlaces = extraerEnlaces([{ tipo: "text/plain", texto: "[Ver colección](https://t.example/collections/a)\nCOMPRAR AHORA\n(https://t.example/products/b )" }]);
  assert.strictEqual(enlaces.length, 2);
  assert.strictEqual(elegirEnlace(enlaces).url, "https://t.example/collections/a");
});

test("si hay HTML elige el enlace con rastreador y no el directo del texto plano", () => {
  const partes = [
    { tipo: "text/html", texto: html('<a href="https://ctrk.klclick.example/abc123">Descubrir colección</a>') },
    { tipo: "text/plain", texto: "[Descubrir colección](https://tienda.example/collections/nueva)" },
  ];
  assert.strictEqual(elegirEnlace(extraerEnlaces(partes)).url, "https://ctrk.klclick.example/abc123");
});

test("no hay enlace si todos son de baja o legales", () => {
  const partes = [{ tipo: "text/html", texto: html('<a href="https://t.example/unsubscribe">Darse de baja</a><a href="https://t.example/privacidad">Política de privacidad</a>') }];
  assert.strictEqual(elegirEnlace(extraerEnlaces(partes)), null);
});

test("en modo prueba valida el enlace y no hace clic", async () => {
  const resultado = await procesarCorreo(correo({ cuerpoHtml: CUERPO_TIENDA }), { soloValidar: true, remitentes: REMITENTES, validar: sinResolver, abrir: noDebeAbrir });
  assert.strictEqual(resultado.ok, true);
  assert.strictEqual(resultado.plataforma, "klaviyo");
  assert.strictEqual(resultado.clic, "no-realizado-por-modo-prueba");
  assert.ok(!JSON.stringify(resultado).includes("collections"));
});

test("en modo real hace un solo clic y devuelve su resultado", async () => {
  let llamadas = 0;
  const abrir = async () => {
    llamadas += 1;
    return { ok: true, estado: 200 };
  };
  const resultado = await procesarCorreo(correo({ cuerpoHtml: CUERPO_TIENDA }), { remitentes: REMITENTES, validar: sinResolver, abrir });
  assert.strictEqual(llamadas, 1);
  assert.strictEqual(resultado.ok, true);
});

test("no toca un remitente que no está en la lista", async () => {
  const resultado = await procesarCorreo(correo({ de: "Persona <persona@empresa.example>", cuerpoHtml: CUERPO_TIENDA }), { remitentes: REMITENTES, validar: sinResolver, abrir: noDebeAbrir });
  assert.strictEqual(resultado.motivo, "remitente-no-listado");
});

test("no toca un correo de la lista si la plataforma no coincide", async () => {
  const hubspot = correo({ cuerpoHtml: CUERPO_TIENDA }).replace("X-Kmail-Account: ABC", "X-HS-Cid: 1").replace("kmail-lists.com", "otra.example");
  const resultado = await procesarCorreo(hubspot, { remitentes: REMITENTES, validar: sinResolver, abrir: noDebeAbrir });
  assert.strictEqual(resultado.motivo, "plataforma-distinta-de-la-esperada");
});

test("no toca una respuesta aunque el remitente y la plataforma cuadren", async () => {
  const resultado = await procesarCorreo(correo({ extra: ["In-Reply-To: <x@tienda.example>"], cuerpoHtml: CUERPO_TIENDA }), { remitentes: REMITENTES, validar: sinResolver, abrir: noDebeAbrir });
  assert.strictEqual(resultado.motivo, "forma-parte-de-una-conversacion");
});

test("no hace clic si la validación rechaza el enlace", async () => {
  const resultado = await procesarCorreo(correo({ cuerpoHtml: CUERPO_TIENDA }), { remitentes: REMITENTES, validar: async () => "destino-interno", abrir: noDebeAbrir });
  assert.strictEqual(resultado.motivo, "destino-interno");
});

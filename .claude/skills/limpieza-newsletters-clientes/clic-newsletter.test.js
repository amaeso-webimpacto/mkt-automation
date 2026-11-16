const test = require("node:test");
const assert = require("node:assert");
const { esEnlaceBloqueado, esIpPrivada, motivoDeRechazo } = require("./clic-newsletter.js");

const bloqueado = (texto) => esEnlaceBloqueado(new URL(texto));

test("bloquea enlaces de baja, preferencias y legales", () => {
  assert.ok(bloqueado("https://manage.kmail-lists.com/subscriptions/unsubscribe?a=1"));
  assert.ok(bloqueado("https://tienda.es/newsletter/darse-de-baja"));
  assert.ok(bloqueado("https://tienda.es/preferencias?id=3"));
  assert.ok(bloqueado("https://tienda.es/politica-de-privacidad"));
  assert.ok(bloqueado("https://tienda.es/x?utm=1&optout=1"));
});

test("no bloquea enlaces de producto ni rebajas", () => {
  assert.ok(!bloqueado("https://tienda.es/collections/rebajas"));
  assert.ok(!bloqueado("https://tienda.es/collections/rebajas-invierno?utm_source=klaviyo"));
  assert.ok(!bloqueado("https://tienda.es/products/zapato-negro"));
});

test("detecta direcciones internas", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1"]) {
    assert.ok(esIpPrivada(ip), ip);
  }
  assert.ok(!esIpPrivada("93.184.216.34"));
});

test("rechaza protocolos, credenciales e IP directa sin tocar la red", async () => {
  assert.strictEqual(await motivoDeRechazo("http://tienda.es/a"), "protocolo-no-permitido");
  assert.strictEqual(await motivoDeRechazo("https://user:pass@tienda.es/a"), "credenciales-en-url");
  assert.strictEqual(await motivoDeRechazo("https://127.0.0.1/a"), "ip-directa");
  assert.strictEqual(await motivoDeRechazo("no es una url"), "url-invalida");
  assert.strictEqual(await motivoDeRechazo("https://tienda.es/unsubscribe"), "enlace-de-baja-o-legal");
});

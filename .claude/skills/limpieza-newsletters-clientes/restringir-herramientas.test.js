const test = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { motivoDeBloqueo } = require("./restringir-herramientas.js");

const SCRIPT = path.join(__dirname, "restringir-herramientas.js");
const ejecutar = (entrada) => spawnSync("node", [SCRIPT], { input: entrada, encoding: "utf8" });

test("permite buscar, leer y mandar a la papelera en Gmail", () => {
  for (const herramienta of ["search_threads", "get_thread", "get_message", "trash_thread"]) {
    assert.strictEqual(motivoDeBloqueo(`mcp__Gmail__${herramienta}`), null, herramienta);
  }
});

test("bloquea enviar, responder, reenviar, borradores, spam y etiquetas", () => {
  for (const herramienta of ["send_message", "reply", "forward", "create_draft", "update_draft", "delete_draft", "mark_thread_spam", "label_thread", "create_label", "trash_message", "untrash_thread"]) {
    assert.ok(motivoDeBloqueo(`mcp__Gmail__${herramienta}`), herramienta);
  }
});

test("bloquea leer, crear, cambiar, borrar o lanzar tareas programadas y el resto de herramientas de sesiones", () => {
  for (const herramienta of ["list_triggers", "get_trigger", "create_trigger", "update_trigger", "delete_trigger", "fire_trigger", "send_later", "add_repo", "create_session", "send_message"]) {
    assert.ok(motivoDeBloqueo(`mcp__claude-code-remote__${herramienta}`), herramienta);
  }
});

test("bloquea cualquier otro conector MCP", () => {
  assert.ok(motivoDeBloqueo("mcp__Klaviyo-TucTuc-todo__send_campaign"));
  assert.ok(motivoDeBloqueo("mcp__Shopify__graphql_mutation"));
});

test("no interfiere con las herramientas que no son MCP", () => {
  assert.strictEqual(motivoDeBloqueo("Bash"), null);
  assert.strictEqual(motivoDeBloqueo("Read"), null);
});

test("el script sale con código 2 al bloquear y con 0 al permitir", () => {
  assert.strictEqual(ejecutar(JSON.stringify({ tool_name: "mcp__Gmail__send_message" })).status, 2);
  assert.strictEqual(ejecutar(JSON.stringify({ tool_name: "mcp__Gmail__get_message" })).status, 0);
  assert.strictEqual(ejecutar("no es json").status, 2);
});

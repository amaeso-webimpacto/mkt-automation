---
name: programar-panel-email
description: Crea, revisa o cambia la tarea programada mensual que actualiza el panel de email marketing de uno o varios clientes (Klaviyo o iCommkt) y envía por correo el resumen y la versión HTML del panel. Úsala cuando alguien del equipo quiera automatizar, programar o dejar en piloto automático la actualización de los paneles de email de sus clientes, cambiar el día, la hora o los destinatarios de esa tarea, o saber qué clientes tiene programados, aunque no nombre la skill.
---

# Programar la actualización del panel de email

| Versión | Fecha | Creadora | Contacto |
|---|---|---|---|
| 1.0.0 | 09/11/2026 | Ana I. Maeso | amaeso@webimpacto.es |

Cada persona del equipo deja programada, a su nombre, la actualización mensual de los paneles de sus clientes. La tarea programada abre cada mes una sesión nueva que aplica la skill **panel-email-cliente** (modo B, con el análisis del modo C y la versión estática del modo D) y envía un correo con el resultado.

**Una tarea por cliente.** Aunque se programen varios clientes del tirón, cada uno tiene su propia tarea, con solo los conectores de ese cliente. Así cada sesión trabaja con un único cliente, como pide la norma de la agencia, y un fallo en uno no para a los demás.

**Ficheros:** este `SKILL.md` y `plantilla-tarea.md` (el texto que recibe cada tarea). El proceso del panel está en `../panel-email-cliente/`; si falta, obtenerlo del repositorio `amaeso-webimpacto/mkt-automation`, rama `main`.

## Plataformas

| Plataforma | ¿Se puede programar? | Datos propios que necesita la tarea |
|---|---|---|
| Klaviyo | Sí | Conector `Klaviyo-<Cliente>-todo` e id de la métrica Placed Order de Shopify (`config/cliente.metricaPlacedOrder` del panel). |
| iCommkt | Sí, con datos manuales | Conector `icomm-<cliente>` y **conector de Shopify de la tienda del cliente, obligatorio**: si falta, la tarea se para y lo avisa en el correo sin escribir el mes. Flujos y suscritos siguen siendo manuales (ver `plataformas/icommkt.md`): el correo los lista como pendientes. |
| HubSpot, Connectif | **No todavía** | La skill del panel no tiene instrucciones para estas plataformas. Decirlo, no crear la tarea y seguir con el resto de clientes. |

## Paso 1 · Recoger los datos

Pedir solo lo que falte, en una sola pregunta para todos los clientes:

1. **Clientes** a programar (uno o varios).
2. **Destinatarios** del correo de cada cliente. Por defecto, quien pide la tarea (su correo de la cuenta). Si se pone a alguien de fuera del equipo (el cliente, por ejemplo), avisar de que el correo lleva el análisis interno del mes y de que el enlace a la sesión con el HTML solo lo abre la dueña de la tarea, y pedir confirmación.
3. **Día y hora.** Por defecto, el **día 7** de cada mes a las 19:xx (hora de Madrid). Nunca antes del día 6: el mes se cierra a partir del día 5 por la ventana de atribución. Evitar 15:00-18:00 de Madrid (horas de más carga).

## Paso 2 · Comprobar cada cliente

Para cada cliente, en este orden. Si un cliente no pasa una comprobación, se queda fuera y se explica por qué; los demás siguen.

1. **Panel:** `Artifact` `action: "list"`, `scope: "all"`, título «Panel Email <Cliente>», o el enlace que den. Sin panel → no se programa: primero hay que crearlo con la skill panel-email-cliente (modo A).
2. **Configuración del panel:** `ArtifactData get` de `config/cliente`. Sacar `plataforma`, `conector`, `tienda` y, en Klaviyo, `metricaPlacedOrder`. Si falta la métrica en Klaviyo, buscarla como dice `plataformas/klaviyo.md` y confirmarla.
3. **Conector en esta sesión:** `ToolSearch` con `+<conector>` (por ejemplo `+Klaviyo-Azarey-todo`). La tarea solo puede llevar conectores que la persona tenga conectados; si no aparece, decir que lo conecte en claude.ai (Ajustes → Conectores) y no programar ese cliente.
4. **Cuenta correcta:** una llamada de solo lectura que confirme que el conector es el del cliente (`get_account_details` en Klaviyo, `get_account_context` en iCommkt). Si no coincide, parar con ese cliente.
5. **Fila en el listado «Paneles Email»** (https://claude.ai/artifact/Tstgau5tAfbTJ3Fauz7cQc): `ArtifactData list` de `paneles` y buscar la fila cuyo `url` sea el del panel. Si existe, su id va en la tarea para que deje allí el resultado; si no, la tarea se salta ese paso.
6. **¿Ya está programado?** `list_triggers` (todas las páginas) y buscar el nombre «Panel Email <Cliente> · actualización mensual». Si existe, ofrecer cambiarlo con `update_trigger` (prompt, día u hora) en vez de crear otro.

## Paso 3 · Confirmar antes de crear

Mostrar una tabla con una fila por cliente: cliente, plataforma, conector, panel, destinatarios, día y hora, y si se crea o se cambia una tarea existente. Debajo, los clientes que se quedan fuera y por qué. Crear solo cuando la persona lo confirme.

## Paso 4 · Crear las tareas

Para cada cliente confirmado:

1. Rellenar `plantilla-tarea.md` con sus datos y comprobar que no queda ningún `{{`:

   | Marcador | Valor |
   |---|---|
   | `{{CLIENTE}}` | Nombre como en el título del panel. |
   | `{{SLUG}}` | Nombre sin espacios ni tildes para el fichero (`Azarey`, `TucTuc`). |
   | `{{PANEL_URL}}` | Enlace del artefacto del panel. |
   | `{{PLATAFORMA}}`, `{{CONECTOR}}`, `{{TIENDA}}` | De `config/cliente`. |
   | `{{DATO_PLATAFORMA}}` | Klaviyo: «Métrica de conversión: Placed Order de Shopify, id `<id>`.» iCommkt: quitar la línea entera. |
   | `{{DESTINATARIOS}}` | Direcciones separadas por comas. |
   | `{{ID_LISTADO}}` | Id de la fila en el listado. Si no hay fila, quitar la línea entera. |
2. `create_trigger` con:
   - `name`: «Panel Email <Cliente> · actualización mensual».
   - `cron_expression`: `CRON_TZ=Europe/Madrid <minuto> <hora> <día> * *`. Minuto no redondo (ni :00 ni :30). Con varios clientes, separar cada tarea **10 minutos** de la anterior.
   - `create_new_session_on_fire: true` (cada mes, sesión limpia).
   - `connectors`: solo `[<conector de la plataforma>, "Shopify", "Gmail"]`, con los nombres exactos de la persona. Nunca conectores de otros clientes.
   - `initiation: "human_request"`.
3. Guardar el `id` y la `next_run_at` que devuelve.

Si el resultado avisa de que la tarea no guarda conectores, decirlo tal cual con el remedio que indique; no darla por creada sin más.

## Paso 5 · Resumen

Por cliente: nombre de la tarea, id, próxima ejecución en hora de Madrid y destinatarios. Recordar que:
- La versión HTML queda en la sesión de cada ejecución (el correo trae el enlace, que solo abre la dueña de la tarea). Gmail no admite adjuntar el fichero desde la tarea.
- Se pueden ver, pausar o borrar en claude.ai → Claude Code → tareas programadas, o pidiéndolo aquí.
- Para probar una ya, `fire_trigger`, sabiendo que **actualiza de verdad el panel** del mes anterior.

## Cambiar o revisar tareas

- «¿Qué tengo programado?»: `list_triggers` y filtrar por «Panel Email». Dar cliente, día y hora, estado y resultado de la última ejecución.
- Cambiar día u hora: `update_trigger` solo con `cron_expression`. Cambiar destinatarios o datos: volver a rellenar la plantilla y `update_trigger` con `prompt`.
- Pausar: `update_trigger` con `enabled: false`. Borrar: `delete_trigger`, solo si la persona lo pide.

## Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0.0 | 09/11/2026 | Primera versión: una tarea por cliente (Klaviyo e iCommkt), varios clientes del tirón, correo con resumen en HTML y enlace a la versión estática. HubSpot y Connectif fuera hasta que la skill del panel los contemple. |

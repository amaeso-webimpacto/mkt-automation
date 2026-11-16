---
name: limpieza-newsletters-clientes
description: Limpieza diaria de la bandeja de entrada de Gmail. Abre cada newsletter de los clientes enviada desde Klaviyo, iCommkt, Connectif o HubSpot, hace clic en un enlace de contenido y la manda a la papelera para que no se acumulen las campañas. Nunca toca correos de personas y nunca envía correos. Úsala cuando se pida limpiar el correo, procesar las newsletters de clientes, revisar qué remitentes de clientes faltan en la lista o ejecutar la tarea diaria de limpieza, aunque no se nombre la skill.
hooks:
  PreToolUse:
    - matcher: "mcp__.*"
      hooks:
        - type: command
          command: 'node "${CLAUDE_PROJECT_DIR}/.claude/skills/limpieza-newsletters-clientes/restringir-herramientas.js"'
---

# Limpieza diaria de newsletters de clientes

| Versión | Fecha | Creadora | Contacto |
|---|---|---|---|
| 1.4.1 | 16/11/2026 | Ana I. Maeso | amaeso@webimpacto.es |

La bandeja recibe cada día las campañas de todos los clientes, y cada una llega varias veces porque la cuenta está suscrita con distintos alias. El agente abre cada correo, hace un clic y lo manda a la **papelera** de Gmail (recuperable 30 días). Nunca borra de forma definitiva.

**Esta tarea cruza clientes a propósito:** solo mueve correo y no lee ni mezcla datos de los clientes. No analiza el contenido de las campañas ni lo comparte.

**Gasto mínimo:** casi todo lo hace `procesar-correo.js`, no el modelo. El agente no lee el contenido de los correos: los descarga en bruto (Gmail los guarda en un fichero) y los pasa al script. Se recomienda ejecutarla con el modelo más pequeño y esfuerzo medio como máximo.

## Límites (no negociables)

1. **Solo newsletters enviadas desde Klaviyo, iCommkt, Connectif o HubSpot.** Se demuestra con las cabeceras del correo, no con el nombre del remitente ni con el asunto. Lo comprueba el script. Si no devuelve `ok: true`, el correo no se toca.
2. **Nunca correos que envíen personas.** Un hilo con una respuesta, un mensaje enviado por ti, un mensaje sin cabecera de baja de lista, con un remitente que no está en `remitentes.json`, con remitentes distintos entre sí o con más de 6 mensajes se queda en la bandeja entero.
3. **Nunca enviar correo, de ninguna forma.** Prohibido usar `send_message`, `reply`, `forward`, `create_draft`, `update_draft` y `send_draft`, y no crear borradores. El único cambio que se hace en Gmail es `trash_thread`. El script de clic solo hace peticiones GET.
4. **Nunca marcar como spam, etiquetar ni cancelar suscripciones.**
5. **Solo Gmail.** No usar ningún otro conector (Klaviyo, Shopify, Asana, Drive...). Del conector de Gmail solo se usan `search_threads`, `get_message` y `trash_thread`.

Un hook de esta skill (`restringir-herramientas.js`) bloquea las llamadas MCP que no sean esas tres, pero no se ha probado en una tarea programada: la regla se cumple igualmente por instrucción. Si algo no encaja con estos límites, no se actúa y se cuenta en el resumen.

## Ficheros

- `remitentes.json`: remitentes exactos autorizados y la plataforma que se espera de cada uno. Es la única fuente de verdad de qué se toca.
- `procesar-correo.js`: por cada correo en bruto comprueba remitente y plataforma, elige un enlace de contenido, lo valida y hace clic. Usa `verificar-plataforma.js`, `mime.js`, `enlaces-newsletter.js` y `clic-newsletter.js`.
- `restringir-herramientas.js`: hook que bloquea herramientas fuera de las permitidas.
- Los tests se lanzan con `node --test` desde esta carpeta.

Plataformas y firma verificada con correos reales (16/11/2026):

| Plataforma | Firma que se exige (cualquiera de ellas) |
|---|---|
| Klaviyo | cabecera `X-Kmail-Account`, firma DKIM de `klaviyomail.com` o baja en `kmail-lists.com` |
| iCommkt | firma DKIM de `icommarketing.com` o baja en `icmkt.com` |
| HubSpot | cabecera `X-HS-Cid` (confirmado por la responsable: BSoul usa HubSpot) |
| Connectif | **sin firma verificada**: sus correos no se tocan hasta añadir una muestra real al verificador |

Además, todo correo debe llevar cabecera `List-Unsubscribe` y no puede llevar `In-Reply-To` ni `References`.

## Modos

- **prueba** (por defecto): verifica y elige el enlace con `--solo-validar`. No hace clic ni mueve nada.
- **real**: solo si la petición dice «modo real». Hace el clic y manda a la papelera.

## Proceso

1. Leer `remitentes.json` (solo `confirmados`). Buscar con `search_threads`: `in:inbox from:(<remitente1> OR <remitente2> ...)`, `view: THREAD_VIEW_METADATA_ONLY` y `pageSize` de **12 hilos en real y 5 en prueba**.
2. **Un hilo con más de 6 mensajes se deja sin leer ni tocar** (`messageCount` de la búsqueda mayor que 6). El límite cubre el caso normal: la cuenta está suscrita con varios alias y cada campaña llega una vez por alias. De cada hilo de 6 mensajes o menos hay que ver **todos** sus mensajes. La búsqueda solo enseña los 5 primeros: si `messageCount` es 6, pedir el hilo con `get_thread` y `messageFormat: METADATA_ONLY` (sin cuerpos, unos 1 KB por mensaje). El hilo solo sigue si **todos** sus mensajes tienen el mismo remitente exacto, ese remitente está en la lista y ninguno lleva la etiqueta `SENT`. Si hay remitentes distintos, aunque estén en la lista, o cualquier mensaje tuyo, el hilo se deja sin tocar. Cada mensaje recibe su propio clic.
   **Tope de mensajes por ejecución: 40 en real y 15 en prueba.** Los hilos se van añadiendo en orden hasta llegar al tope. Un hilo nunca se procesa a medias: si no cabe entero, se deja para la siguiente ejecución, salvo que sea el primero, que se procesa siempre.
3. Descargar en una sola tanda, en paralelo, todos los mensajes de los hilos elegidos con `get_message` y `messageFormat: RAW`. La respuesta es muy grande y Gmail la guarda en un fichero: anotar solo su ruta. Si una respuesta llegara en línea, no tocar ese hilo.
4. Lanzar **una sola orden** con todas las rutas: `node procesar-correo.js <ruta1> <ruta2> ...` (en prueba, con `--solo-validar` delante). Devuelve una línea JSON por mensaje con `ok`, `hilo`, `cliente`, `plataforma` y, si falla, `motivo`. No muestra enlaces, solo el texto del botón y el host.
5. **Papelera solo si todos los mensajes del hilo salieron `ok: true`**, y los ids devueltos coinciden con todos los mensajes del hilo, sin que falte ninguno. Si falta o falla alguno, el hilo se queda y se anota el motivo. Usar `trash_thread`. En modo prueba no se llama.
6. Al terminar, buscar remitentes nuevos: `search_threads` sobre `in:inbox category:promotions newer_than:2d` con `THREAD_VIEW_METADATA_ONLY` y `pageSize: 20`, y listar solo los **remitentes** que no están en `confirmados`, con recuento. No tocarlos: los decide la persona.

## Qué se cuenta

Resumen final, corto, sin asuntos completos ni direcciones de destinatarios:

- Hilos procesados y mandados a la papelera, por cliente y plataforma.
- Hilos que se quedan en la bandeja y motivo (`plataforma-no-reconocida`, `forma-parte-de-una-conversacion`, `sin-enlace-de-contenido`, `error-de-red`...).
- Remitentes nuevos sin clasificar.
- Hilos que quedan para otra ejecución por el tope de mensajes.
- Hilos con más de 6 mensajes, con remitentes distintos o con mensajes tuyos, que se dejan sin tocar (solo contar cuántos son).

## Reglas

- Cliente solo si su remitente exacto está en `remitentes.json`. Nunca por el nombre del asunto ni por coincidencias parciales de dominio.
- Una factura, un pedido, una respuesta o un mensaje de un cliente que no es newsletter se queda donde está.
- Nunca pulsar baja, preferencias ni «ver en navegador». El script los descarta por el texto del enlace, por su dirección y en cada redirección.
- Los enlaces de seguimiento llevan identificadores del suscriptor: no imprimirlos, solo el host.
- Para añadir un cliente: confirmar su dirección exacta y su plataforma con un correo real, y pasarlo de `plataforma_conocida_falta_direccion` a `confirmados`.

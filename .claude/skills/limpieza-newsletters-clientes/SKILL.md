---
name: limpieza-newsletters-clientes
description: Limpieza diaria de la bandeja de entrada de Gmail. Abre cada newsletter de los clientes enviada desde Klaviyo, iCommkt, Connectif o HubSpot, hace clic en un enlace de contenido y la manda a la papelera para que no se acumulen las campañas. Nunca toca correos de personas y nunca envía correos. Úsala cuando se pida limpiar el correo, procesar las newsletters de clientes, revisar qué remitentes de clientes faltan en la lista o ejecutar la tarea diaria de limpieza, aunque no se nombre la skill.
---

# Limpieza diaria de newsletters de clientes

| Versión | Fecha | Creadora | Contacto |
|---|---|---|---|
| 1.1.0 | 16/11/2026 | Ana I. Maeso | amaeso@webimpacto.es |

La bandeja recibe cada día las campañas de todos los clientes, y cada una llega varias veces porque la cuenta está suscrita con distintos alias. El agente abre cada correo, hace un clic y lo manda a la **papelera** de Gmail (recuperable 30 días). Nunca borra de forma definitiva.

**Esta tarea cruza clientes a propósito:** solo mueve correo y no lee ni mezcla datos de los clientes. No analiza el contenido de las campañas ni lo comparte.

## Límites (no negociables)

1. **Solo newsletters enviadas desde Klaviyo, iCommkt, Connectif o HubSpot.** Se demuestra con las cabeceras del correo, no con el nombre del remitente ni con el asunto. Lo comprueba `verificar-plataforma.js`. Si no devuelve `ok: true`, el correo no se toca.
2. **Nunca correos que envíen personas.** Un hilo con una respuesta, un mensaje enviado por ti, un mensaje sin cabecera de baja de lista o con un remitente que no está en `remitentes.json` se queda en la bandeja entero.
3. **Nunca enviar correo, de ninguna forma.** Prohibido usar `send_message`, `reply`, `forward`, `create_draft`, `update_draft` y `send_draft`, y no crear borradores. El único cambio que se hace en Gmail es `trash_thread`. El script de clic solo hace peticiones GET.
4. **Nunca marcar como spam, etiquetar ni cancelar suscripciones.**

Si algo no encaja con estos límites, no se actúa y se cuenta en el resumen.

## Ficheros

- `remitentes.json`: remitentes exactos autorizados y la plataforma que se espera de cada uno. Es la única fuente de verdad de qué se toca.
- `verificar-plataforma.js`: comprueba por las cabeceras que el correo viene de una plataforma permitida. Se prueba con `node --test`.
- `clic-newsletter.js`: valida el enlace y lo abre.

Plataformas y firma verificada con correos reales (16/11/2026):

| Plataforma | Firma que se exige (cualquiera de ellas) |
|---|---|
| Klaviyo | cabecera `X-Kmail-Account`, firma DKIM de `klaviyomail.com` o baja en `kmail-lists.com` |
| iCommkt | firma DKIM de `icommarketing.com` o baja en `icmkt.com` |
| HubSpot | cabecera `X-HS-Cid` (confirmado por la responsable: BSoul usa HubSpot) |
| Connectif | **sin firma verificada**: sus correos no se tocan hasta añadir una muestra real al verificador |

Además, todo correo debe llevar cabecera `List-Unsubscribe` y no puede llevar `In-Reply-To` ni `References`.

## Modos

- **prueba** (por defecto): busca, verifica y enseña qué haría. No hace clic ni mueve nada.
- **real**: solo si la petición dice «modo real». Hace el clic y manda a la papelera.

## Proceso

1. Leer `remitentes.json`. Buscar con `search_threads`: `in:inbox from:(<remitente1> OR <remitente2> ...)` con `view: THREAD_VIEW_IDS_ONLY` y `pageSize: 50`. Tope de **40 hilos por ejecución**; lo que sobre se procesa en la siguiente.
2. Para cada hilo, `get_thread` y recorrer sus mensajes. El hilo solo sigue adelante si **todos** sus mensajes cumplen: remitente exacto de la lista, sin etiqueta `SENT` y sin respuestas de otras personas. Si no, se deja sin tocar.
3. **Verificar la plataforma de cada mensaje.** `get_message` con `RAW` guarda la respuesta en un fichero porque es muy grande: pasar esa ruta a `node verificar-plataforma.js <ruta>`. Si la respuesta llegara en línea, escribir solo el bloque de cabeceras en un fichero temporal y pasarlo igual. Debe salir `ok: true` y la plataforma debe coincidir con la de `remitentes.json`. Si no, el hilo entero se queda.
4. Por cada mensaje verificado, `get_message` con `PLAIN_TEXT` (no HTML: es mucho más corto) y elegir **un solo enlace de contenido**: una ficha de producto, una colección o el botón principal. Quedan descartados: baja, preferencias, legales, redes sociales, mapas, teléfonos y mailto. Solo entran enlaces `https`.
5. Abrirlo con `node clic-newsletter.js '<url>'` (entre comillas simples). El script rechaza por su cuenta enlaces de baja o legales, IP directas y destinos internos, y sigue hasta 5 redirecciones.
6. **Papelera solo si todos los mensajes del hilo tuvieron clic correcto** (`ok: true`). Si alguno falla o el script rechaza el enlace, dejar el hilo en la bandeja y anotarlo. Usar `trash_thread`.
7. Al terminar, buscar remitentes nuevos: `search_threads` sobre `in:inbox category:promotions newer_than:2d` con `THREAD_VIEW_METADATA_ONLY`, y listar solo los **remitentes** que no están en `remitentes.json`, con recuento. No tocarlos: los decide la persona.

## Qué se cuenta

Resumen final, sin copiar asuntos completos ni direcciones de destinatarios:

- Hilos procesados y mandados a la papelera, por cliente y plataforma.
- Hilos que se quedan en la bandeja y motivo (`plataforma-no-reconocida`, `forma-parte-de-una-conversacion`, `enlace-de-baja-o-legal`, `error-de-red`, sin enlace de contenido...).
- Remitentes nuevos sin clasificar.
- Hilos que quedan para mañana por el tope.

## Reglas

- Cliente solo si su remitente exacto está en `remitentes.json`. Nunca por el nombre del asunto ni por coincidencias parciales de dominio.
- Una factura, un pedido, una respuesta o un mensaje de un cliente que no es newsletter se queda donde está.
- No pulsar nunca baja, preferencias ni «ver en navegador» como único enlace.
- Los enlaces de seguimiento llevan identificadores del suscriptor: no imprimirlos enteros, solo el host.

---
name: limpieza-newsletters-clientes
description: Limpieza diaria de la bandeja de entrada de Gmail. Abre cada newsletter de los clientes enviada desde Klaviyo, iCommkt, Connectif o HubSpot, hace clic en un enlace de contenido y la manda a la papelera para que no se acumulen las campañas. También manda a la papelera los informes que las tareas programadas se envían a la propia persona y, sin abrirlos, los correos de la competencia. Nunca toca correos de personas y nunca envía correos. Úsala cuando se pida limpiar el correo, procesar las newsletters de clientes, limpiar los informes de las tareas programadas, revisar qué remitentes de clientes faltan en la lista o ejecutar la tarea diaria de limpieza, aunque no se nombre la skill.
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
| 1.6.2 | 23/11/2026 | Ana I. Maeso | amaeso@webimpacto.es |

La bandeja recibe cada día las campañas de todos los clientes, y cada una llega varias veces porque la cuenta está suscrita con distintos alias. El agente abre cada correo, hace un clic y lo manda a la **papelera** de Gmail (recuperable 30 días). Nunca borra de forma definitiva.

**Esta tarea cruza clientes a propósito:** solo mueve correo y no lee ni mezcla datos de los clientes. No analiza el contenido de las campañas ni lo comparte.

**Gasto mínimo:** casi todo lo hace `procesar-correo.js`, no el modelo. El agente no lee el contenido de los correos: los descarga en bruto (Gmail los guarda en un fichero) y los pasa al script. Se recomienda ejecutarla con el modelo más pequeño y esfuerzo medio como máximo.

## Límites (no negociables)

1. **Solo newsletters enviadas desde Klaviyo, iCommkt, Connectif o HubSpot.** Se demuestra con las cabeceras del correo, no con el nombre del remitente ni con el asunto. Lo comprueba el script. Si no devuelve `ok: true`, el correo no se toca.
2. **Nunca correos que envíen personas.** Un hilo con una respuesta, un mensaje enviado por ti, un mensaje sin cabecera de baja de lista, con un remitente que no está en `remitentes.json`, con remitentes distintos entre sí o con más de 6 mensajes se queda en la bandeja entero.
3. **Nunca enviar correo, de ninguna forma.** Prohibido usar `send_message`, `reply`, `forward`, `create_draft`, `update_draft` y `send_draft`, y no crear borradores. El único cambio que se hace en Gmail es `trash_thread`. El script de clic solo hace peticiones GET.
4. **Nunca marcar como spam, etiquetar ni cancelar suscripciones.**
5. **Nunca envíos de prueba.** Si el asunto contiene como palabra completa `TEST`, `PRUEBA`, `VISTA PREVIA` o `PREVIEW`, sin distinguir mayúsculas ni acentos, el correo no se toca (`asunto-de-test-interno`). Lo comprueba `verificar-plataforma.js` tras decodificar el asunto.
6. **Solo Gmail.** No usar ningún otro conector (Klaviyo, Shopify, Asana, Drive...) ni leer, crear, cambiar o lanzar tareas programadas: sus herramientas no existen en las ejecuciones programadas. Del conector de Gmail solo se usan `search_threads`, `get_thread`, `get_message` y `trash_thread`.
7. **La competencia no se abre.** Los correos de los remitentes de `competencia.json` solo se mandan a la papelera: no se descargan en bruto, no se hace clic, no se alta ni se registra nada, y del correo no se anota nada salvo el recuento.

Un hook de esta skill (`restringir-herramientas.js`) bloquea las llamadas MCP que no sean esas, pero no se ha probado en una tarea programada: la regla se cumple igualmente por instrucción. Si algo no encaja con estos límites, no se actúa y se cuenta en el resumen.

## Ficheros

- `remitentes.json`: remitentes exactos autorizados y la plataforma que se espera de cada uno. Es la única fuente de verdad de qué se toca.
- `procesar-correo.js`: por cada correo en bruto comprueba remitente y plataforma, elige un enlace de contenido, lo valida y hace clic. Usa `verificar-plataforma.js`, `mime.js`, `enlaces-newsletter.js` y `clic-newsletter.js`.
- `informes-automaticos.json`: lista cerrada de prefijos de asunto de los informes que las tareas programadas se envían a la propia persona, antigüedad mínima y tope por ejecución. Es la única fuente de verdad de qué informes se tocan. Los asuntos nuevos que aparezcan se anotan en el resumen, pero no se mueven hasta que se añadan a la lista.
- `competencia.json`: remitentes de la competencia cuyos correos se mandan a la papelera sin abrirlos.
- `asunto.js` y `codificacion.js`: decodifican el asunto y detectan los envíos de prueba.
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

Cada parte de la skill (newsletters, informes de tareas programadas y competencia) tiene su propio modo: la petición puede pedir una en real y la otra en prueba. Si no se indica, las dos van en prueba.

## Proceso

1. Leer `remitentes.json` (solo `confirmados`). Buscar con `search_threads`: `in:inbox from:(<remitente1> OR <remitente2> ...)`, `view: THREAD_VIEW_METADATA_ONLY` y `pageSize` de **12 hilos en real y 5 en prueba**.
   **Los envíos de prueba se excluyen en la propia búsqueda**: añadir `-subject:"vista previa" -subject:test -subject:prueba -subject:preview` a la consulta. Sin eso, los mismos envíos de prueba (por ejemplo los «[Vista previa]» de Klaviyo) ocupan siempre los primeros resultados y las newsletters reales no se alcanzan nunca.
   **Los hilos rechazados no cuentan para el tope.** Si los primeros hilos se rechazan (asunto de prueba, conversación, remitentes distintos), se pide la página siguiente con `pageToken`, hasta un máximo de 3 páginas, para reunir los 12 hilos válidos. **Si la búsqueda no devuelve `nextPageToken`, se repite por grupos de remitentes** (una consulta por cada 3 o 4 remitentes de la lista) para que ningún cliente quede sin mirar: se han visto ejecuciones en las que XTI, Abbacino, HeyDude y Siux Pádel no aparecían en los 12 primeros resultados.
   **Hilo con una campaña real y un envío de prueba**: Gmail agrupa a veces el envío de prueba de una campaña con la campaña real. El hilo se deja entero en la bandeja, porque el envío de prueba no se toca, y se cuenta en el resumen como `hilo-con-envio-de-prueba`.
2. **El resultado de la búsqueda no es fiable para decidir.** Puede venir con pocos datos (sin etiquetas ni fechas) y con un `messageCount` que no coincide con el hilo real (se han visto hilos «de 1 mensaje» que tenían 4, y un hilo con un mensaje enviado por la propia persona). Por eso **todo hilo candidato se pide con `get_thread` y `messageFormat: METADATA_ONLY`** (sin cuerpos, unos 1 KB por mensaje) y se comprueban todos sus mensajes. **Un hilo con más de 6 mensajes se deja sin leer ni tocar.** El límite cubre el caso normal: la cuenta está suscrita con varios alias y cada campaña llega una vez por alias. El hilo solo sigue si **todos** sus mensajes tienen el mismo remitente exacto, ese remitente está en la lista y ninguno lleva la etiqueta `SENT`. Si hay remitentes distintos, aunque estén en la lista, o cualquier mensaje tuyo, el hilo se deja sin tocar. Cada mensaje recibe su propio clic.
   **Tope de mensajes por ejecución: 40 en real y 15 en prueba.** Los hilos se van añadiendo en orden hasta llegar al tope. Un hilo nunca se procesa a medias: si no cabe entero, se deja para la siguiente ejecución, salvo que sea el primero, que se procesa siempre.
3. Descargar en una sola tanda, en paralelo, todos los mensajes de los hilos elegidos con `get_message` y `messageFormat: RAW`. La respuesta es muy grande y Gmail la guarda en un fichero: anotar solo su ruta. Si una respuesta llegara en línea, no tocar ese hilo.
4. **Primero validar sin hacer clic**: lanzar **una sola orden** con todas las rutas, `node procesar-correo.js --solo-validar <ruta1> <ruta2> ...`. Devuelve una línea JSON por mensaje con `ok`, `hilo`, `cliente`, `plataforma` y, si falla, `motivo`. No muestra enlaces, solo el texto del botón y el host. Agrupar el resultado por hilo. **Solo en los hilos con todos los mensajes `ok: true`**, y en modo real, repetir la orden sin `--solo-validar` con las rutas de esos hilos para hacer los clics. Nunca se hace clic en un mensaje de un hilo que luego no se va a mover.
5. **Papelera solo si todos los mensajes del hilo salieron `ok: true`**, y los ids devueltos coinciden con todos los mensajes del hilo, sin que falte ninguno. Si falta o falla alguno, el hilo se queda y se anota el motivo. Usar `trash_thread`. En modo prueba no se llama.
6. Al terminar, buscar remitentes nuevos: `search_threads` sobre `in:inbox category:promotions newer_than:2d` con `THREAD_VIEW_METADATA_ONLY` y `pageSize: 20`, y listar solo los **remitentes** que no están en `confirmados`, con recuento. No tocarlos: los decide la persona.

## Limpieza de informes de tareas programadas

Las tareas programadas de la cuenta se envían informes a la propia persona (resúmenes, ejecuciones, avisos) y se acumulan en la bandeja. Esta parte los manda a la **papelera** con una lista cerrada de asuntos (`informes-automaticos.json`). Nada que no encaje con la lista se toca, aunque lo haya enviado la propia persona.

Reglas (no negociables):

1. Un hilo solo entra si tiene **un único mensaje**, enviado desde `propietario` y con `propietario` como único destinatario (sin copias ni `ccRecipients` o `bccRecipients`), y su asunto **empieza exactamente** por un prefijo de la lista. Se comprueba con `get_thread` y `messageFormat: METADATA_ONLY` antes de moverlo: el recuento de la búsqueda no es fiable y un hilo de informe puede incluir un reenvío a un compañero.
2. **Antigüedad mínima de 2 días**: la búsqueda lleva `older_than:2d`. Nunca se toca un correo de hoy ni de las últimas 24 horas anteriores, de modo que queda un día de margen.
3. Los asuntos de `no_entran` nunca se tocan. Tampoco un hilo con más de un mensaje, con terceros, ya en la papelera o en spam.
4. Siempre papelera (`trash_thread`), nunca borrado definitivo. Tope: `tope_hilos_por_ejecucion` hilos por ejecución; lo que sobre queda para la siguiente.
5. No se leen cuerpos: solo asunto, fecha, remitente y destinatarios.

Proceso:

1. Leer `informes-automaticos.json`.
2. **Detectar asuntos nuevos, sin moverlos.** Las herramientas de tareas programadas no existen en las ejecuciones programadas, así que se detecta por Gmail: `from:me to:me newer_than:30d -in:trash -in:spam` excluyendo con `-subject` los prefijos de la lista y los de `no_entran`, con `view: THREAD_VIEW_MINIMAL`. Los asuntos que aparezcan se anotan en el resumen como «familias nuevas candidatas», con su parte fija de asunto (hasta el primer elemento variable: fecha, hora, corchete), para que la persona decida. **No se mueven** hasta que se añadan a `informes-automaticos.json`: un correo que la persona se manda a sí misma a mano también aparecería aquí.
3. Por cada prefijo de la lista, una búsqueda: `from:me to:me older_than:2d -in:trash -in:spam subject:"<prefijo>"`, con `view: THREAD_VIEW_MINIMAL` y `pageSize: 50`. La búsqueda por asunto no es por prefijo: comprobar el prefijo exacto con el asunto devuelto. Pedir cada hilo candidato con `get_thread` y `messageFormat: METADATA_ONLY` y añadir solo los que cumplan la regla 1, hasta el tope.
4. En modo prueba, solo contar por prefijo. En modo real, `trash_thread` de cada hilo elegido.
5. En modo real, comprobar con una búsqueda de control, `from:me to:me older_than:2d in:inbox subject:"<prefijo>"`, que los hilos movidos ya no están, y contar los que no se hayan movido.

## Competencia: a la papelera sin abrir

Los remitentes de `competencia.json` son de la competencia: sus correos no interesan y no deben dejar rastro de actividad. Esta parte los manda a la **papelera** sin abrirlos.

Reglas (no negociables):

1. **Nada de abrir, descargar ni hacer clic.** No se usa `get_message`, ni en bruto ni en ningún otro formato, no se pasa nada por `procesar-correo.js`, no se pulsa ningún enlace, no se da de alta ni de baja a nadie y no se anota nada del contenido del correo ni de su asunto.
2. Un hilo solo entra si **todos** sus mensajes los envía un remitente exacto de `competencia.json` y ninguno lleva la etiqueta `SENT`. Un hilo con un mensaje de otro remitente o enviado por la propia persona se queda tal cual.
3. Siempre papelera (`trash_thread`), nunca borrado definitivo. Tope: `tope_hilos_por_ejecucion` hilos por ejecución.

Proceso:

1. Leer `competencia.json`. Buscar con `search_threads`: `in:inbox from:(<remitente1> OR <remitente2> ...)`, con `view: THREAD_VIEW_IDS_ONLY` y `pageSize: 50`.
2. Pedir cada hilo con `get_thread` y `messageFormat: METADATA_ONLY` (solo cabeceras) y comprobar la regla 2.
3. En modo prueba, solo contar. En modo real, `trash_thread` de cada hilo elegido y una búsqueda de control que confirme que ya no quedan.
4. Para añadir a la competencia: confirmar la dirección exacta con un correo recibido y añadirla a `competencia.json`. Una dirección no puede estar a la vez en `competencia.json` y en `remitentes.json`.

## Qué se cuenta

Resumen final, corto, sin asuntos completos ni direcciones de destinatarios:

- Competencia: solo el número de hilos mandados a la papelera (en prueba, los que se moverían).
- Informes de tareas programadas: por prefijo, hilos mandados a la papelera (en prueba, los que se moverían), hilos conservados por no cumplir las reglas y familias nuevas candidatas con su prefijo.
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
- Para añadir un cliente: confirmar su dirección exacta y su plataforma con un correo real de campaña (un envío de prueba no sirve: no lleva cabecera de baja), y pasarlo de `plataforma_conocida_falta_direccion` a `confirmados`.
- Un remitente que envíe desde otra plataforma (por ejemplo Shopify Email) no entra en la lista, aunque sea de un cliente: se anota en `enviados_desde_plataformas_no_permitidas`.

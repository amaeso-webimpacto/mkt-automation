---
name: limpieza-newsletters-clientes
description: Limpieza diaria de la bandeja de entrada de Gmail. Abre cada newsletter de los clientes de la lista de remitentes, hace clic en un enlace de contenido y la manda a la papelera para que no se acumulen las campañas. Úsala cuando se pida limpiar el correo, procesar las newsletters de clientes, revisar qué remitentes de clientes faltan en la lista o ejecutar la tarea diaria de limpieza, aunque no se nombre la skill.
---

# Limpieza diaria de newsletters de clientes

| Versión | Fecha | Creadora | Contacto |
|---|---|---|---|
| 1.0.0 | 16/11/2026 | Ana I. Maeso | amaeso@webimpacto.es |

La bandeja recibe cada día las campañas de todos los clientes, y cada una llega varias veces porque la cuenta está suscrita con distintos alias. El agente abre cada correo, hace un clic y lo manda a la **papelera** de Gmail (recuperable 30 días). Nunca borra de forma definitiva.

**Esta tarea cruza clientes a propósito:** solo mueve correo y no lee ni mezcla datos de los clientes. No analiza el contenido de las campañas ni lo comparte.

## Ficheros

- `remitentes.json`: lista de remitentes exactos autorizados. Es la única fuente de verdad de qué se toca.
- `clic-newsletter.js`: valida el enlace y lo abre. Se puede probar con `node --test clic-newsletter.test.js`.

## Modos

- **prueba** (por defecto): busca, enseña qué haría y no abre ni borra nada.
- **real**: solo si la petición dice «modo real». Hace el clic y manda a la papelera.

## Proceso

1. Leer `remitentes.json`. Buscar con `search_threads`: `in:inbox from:(<remitente1> OR <remitente2> ...)` con `view: THREAD_VIEW_IDS_ONLY` y `pageSize: 50`. Tope de **40 hilos por ejecución**; lo que sobre se procesa en la siguiente.
2. Para cada hilo, `get_thread` y recorrer sus mensajes. Comprobar que el remitente de cada mensaje es exactamente uno de la lista; si no, dejar el hilo sin tocar.
3. Por cada mensaje, `get_message` con `PLAIN_TEXT` (no HTML: es mucho más corto) y elegir **un solo enlace de contenido**: una ficha de producto, una colección o la campaña. Orden de preferencia: producto, colección, botón principal. Quedan descartados: baja, preferencias, legales, redes sociales, mapas, teléfonos y mailto. Solo entran enlaces `https`.
4. Abrirlo con `node clic-newsletter.js '<url>'` (entre comillas simples). El script rechaza por su cuenta enlaces de baja o legales, IP directas y destinos internos, y sigue hasta 5 redirecciones.
5. **Papelera solo si todos los mensajes del hilo tuvieron clic correcto** (`ok: true`). Si alguno falla o el script rechaza el enlace, dejar el hilo en la bandeja y anotarlo. Usar `trash_thread`.
6. Al terminar, buscar remitentes nuevos: `search_threads` sobre `in:inbox category:promotions newer_than:2d` con `THREAD_VIEW_METADATA_ONLY`, y listar solo los **remitentes** que no están en `remitentes.json`, con recuento. No tocarlos: los decide la persona.

## Qué se cuenta

Resumen final, sin copiar asuntos completos ni direcciones de destinatarios:

- Hilos procesados y mandados a la papelera, por cliente.
- Hilos que se quedan en la bandeja y motivo (`enlace-de-baja-o-legal`, `error-de-red`, sin enlace de contenido...).
- Remitentes nuevos sin clasificar.
- Hilos que quedan para mañana por el tope.

## Reglas

- Cliente solo si su remitente exacto está en `remitentes.json`. Nunca por el nombre del asunto ni por coincidencias parciales de dominio.
- Un correo que parezca personal, una factura, un pedido o un mensaje de un cliente que no es newsletter se queda donde está.
- No pulsar nunca baja, preferencias ni «ver en navegador» como único enlace.
- No reenviar, responder ni marcar como spam.
- Los enlaces de seguimiento llevan identificadores del suscriptor: no imprimirlos enteros, solo el host.

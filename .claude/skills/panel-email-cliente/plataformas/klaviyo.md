# Klaviyo

Estado: **verificado** con Azarey (conector `Klaviyo-Azarey-todo`), noviembre 2026. Conector por cliente: `Klaviyo-<Cliente>-todo`.

## Atribución y cierre de mes

Ventana de atribución de 5 días: el mes se cierra **a partir del día 5** del mes siguiente.

## Conversión

Métrica «Placed Order» de integración **Shopify**. Su id está en `config/cliente.metricaPlacedOrder`; si falta, `get_metrics` con `filter: equals(integration.name,"Shopify")`. Puede haber otra «Placed Order» de otra integración: no vale. Canal siempre email (`filters: equals(send_channel,"email")`).

## Campañas

`get_campaign_report` del mes (timeframe de inicio a fin de mes; máximo un año por llamada) con:
- `statistics`: `recipients, open_rate, click_rate, click_to_open_rate, conversion_rate, conversions, unsubscribe_rate`
- `value_statistics`: `conversion_value, average_order_value, revenue_per_recipient`

Cada resultado trae `campaign_details.attributes` con `name`, `send_time` y `audiences.included` / `audiences.excluded` (nombres): guardarlos en `audiences` y usarlos para marcar B2B.

Mapeo: `recipients → recipients`, `open_rate → or`, `click_rate → ctr`, `click_to_open_rate → ctor`, `conversion_rate → cr`, `unsubscribe_rate → unsub`, `conversions → conv`, `conversion_value → rev`, `average_order_value → aov`, `revenue_per_recipient → rpr`.

## Asunto de cada campaña

`get_campaign_report` no trae el asunto. Sacarlo con `get_campaign_messages`: `filter: equals(status,"sent")`, `include: ["campaign","campaign-variations"]`, `fields_campaign_message: ["definition","created"]`, `page_size: 100`, paginando hasta el final (no admite `tool_version`). El asunto está en cada variación: `relationships["campaign-variations"].data[].attributes.definition.details.subject` (preview en `details.preview_text`). La fecha de envío, en `definition.send_options.send_time` o, si está vacía, la más temprana de `send_options.send_times`. Con test A/B y asuntos distintos, guardar el de la primera variación. Cruzar con las campañas del mes por nombre y fecha (±2 días) y guardarlo en `subject`. Las respuestas son grandes: procesarlas con un script, no leerlas enteras.

## Reparto de Shopify

Shopify no separa campañas y flujos: el panel reparte el canal Shopify en proporción a la atribución de Klaviyo de cada mes (ver criterio en `SKILL.md`). No hace falta cargar `shopify.revCampanas` ni `shopify.revFlujos`.

## Flujos

`get_flow_report` del mes, canal email, `group_by: ["flow_id", "flow_name"]`. Usar `flow_aggregation` (un total por flujo): `recipients → r`, `open_rate → o`, `click_rate → c`, `conversions → p`, `conversion_value → rev`. Clave del flujo: su `flow_id`. Flujo nuevo → añadirlo a `config.flujos`.

## BBDD

- **Activos:** `active_profiles` de `list_billing_usage` (es el «recuento de perfiles de correo» de Audiencia > Segmentos).
- **Total y suscritos:** `ask_analytics_question` pidiendo solo dos recuentos agregados (perfiles totales y perfiles con consentimiento de email «subscribed»). Es una foto del momento, no un cierre de mes.
- **Enviamos:** destinatarios de la última campaña B2C del mes.

## Texto del pie (`notaFuentes`)

«Fuentes: Klaviyo (conversión Placed Order de Shopify, canal email) y Shopify (último clic no directo). Venta neta facilitada por el cliente. Activos: recuento de perfiles de correo de Klaviyo el día de actualización. Enviamos: destinatarios de la última campaña B2C del mes. Shopify campañas y flujos: estimados en proporción a la atribución de Klaviyo. Campañas B2B y de mayoristas excluidas de todos los cálculos.»

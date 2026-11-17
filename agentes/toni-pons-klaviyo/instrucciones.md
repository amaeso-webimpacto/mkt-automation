# Agente de revisión de la cuenta de Klaviyo de Toni Pons

Revisa la cuenta, detecta errores, riesgos y oportunidades, y envía un correo a Webimpacto. Hay dos modos: **semanal** (estado de la cuenta, lunes) y **mensual** (análisis completo del último mes cerrado, día 7 de cada mes, sea o no laborable).

Antes de empezar, lee `contexto.md` de esta carpeta: recoge las reglas del cliente y las incidencias abiertas. Lo que contradiga esas reglas no se propone.

## 1. Límites que no se saltan

- **Un solo cliente, un solo conector de Klaviyo:** `Klaviyo-ToniPons-Todo`. No uses `Klaviyo-Salter-Todo` ni ningún otro conector de Klaviyo, ni siquiera para comprobar algo. Si el de Toni Pons falla, informa del fallo; no lo sustituyas.
- **Klaviyo en solo lectura.** Permitido: `get_*`, `list_billing_usage`, `query_metric_aggregates`, `query_segment_values`, `ask_analytics_question` (solo recuentos agregados). Prohibido cualquier herramienta que cree, actualice, borre, envíe, suscriba, suprima, programe o publique, y `create_*`, `update_*`, `delete_*`, `bulk_*`, `send_*`, `schedule_*`, `subscribe_*`, `unsubscribe_*`, `merge_*`.
- **Escrituras permitidas:** solo (a) el Sheet del histórico, en las pestañas `Mensual`, `Semanal`, `Flujos`, `Dominio`, `Alertas` y `Fuentes`, y (b) el envío del informe por Gmail. La pestaña `Umbrales` es solo lectura para el agente. El modo artefacto (`instrucciones-artefacto.md`) añade una escritura: el documento del mes en la base del artefacto «Dashboard Toni Pons».
- **Sin datos personales:** no pidas ni escribas perfiles, correos, teléfonos, pedidos ni exportaciones de leads. Los recuentos de perfiles se piden agregados. No reproduzcas nunca claves, tokens ni contraseñas.
- **No inventes.** Si un dato no se puede obtener, escríbelo como «no medido» y di por qué. Separa lo verificado de lo supuesto. No afirmes que algo funciona sin haberlo comprobado.
- **No hagas cambios ni propongas ejecutarlos sin validación del cliente.** Las propuestas van como «a validar con el cliente».

## 2. Recursos

- Sheet del histórico: `1GBC9aDn_gvn7SX958GQiGqQYaeb2sdMieW19tnxcHmU` («Toni Pons - Agente Klaviyo - Histórico», carpeta «App y Marketing Automation»).
- Zona horaria de la cuenta: Europe/Madrid. Moneda: EUR.
- Conversión: métrica «Placed Order» de la integración **Shopify** (id `Ut5CZR`, comprobable con `get_metrics`). Existe otra «Placed Order» de Magento 2 (`SH9QVx`) que **no** vale. Canal siempre email: `filters: equals(send_channel,"email")`.
- Script de resumen: `scripts/resumir_informe.py` (esta carpeta). Léelo desde la rama `klaviyo`: `git fetch origin klaviyo` y `git show origin/klaviyo:agentes/toni-pons-klaviyo/<ruta>` si la copia local no la tiene.

## 3. Pasos comunes

1. Lee `Umbrales` (`get_values` sobre `Umbrales!A1:G15`) y úsalos tal cual: no los cambies ni los repliques en el código.
2. Lee las alertas abiertas (`Alertas!A:J`, filas con `Estado` = `Abierta`), el último estado de `Flujos` y las últimas filas de `Mensual` y `Semanal`.
3. Pide los datos de Klaviyo (sección 4) y procesa cada respuesta grande con el script. Las respuestas de informes de campañas y flujos pesan entre 80 y 260 KB y la herramienta las guarda en un fichero: no las leas enteras ni las pegues. Ejecuta `python3 -I` con los scripts en una carpeta distinta de la que contiene los datos.
4. Evalúa las señales (sección 5), actualiza el histórico (sección 6) y envía el correo (sección 7).
5. Si falla una fuente, sigue con las demás y dilo en «Fuentes y límites». Si falla el envío por Gmail, anota la alerta en `Alertas` con área `Agente` y termina explicando el error.

## 4. Datos a pedir

Fechas con desplazamiento correcto de Madrid (calcúlalas con `zoneinfo`, no a mano; el horario de verano cambia el desplazamiento).

- **Campañas:** `get_campaign_report` con `statistics: ["recipients","delivered","opens_unique","clicks_unique","bounced","spam_complaints","unsubscribe_uniques"]`, `value_statistics: ["conversion_value"]`, `conversion_metric_id: "Ut5CZR"`, canal email y el periodo. Una llamada por periodo (máximo un año).
- **Flujos:** `get_flow_report` con las mismas estadísticas, `group_by: ["flow_id","flow_name"]` y el periodo. El resultado trae `flow_aggregation` (un total por flujo con su estado). Ventanas largas pueden dar timeout a los 60 s: usa ventanas de 7 a 28 días y reintenta una vez.
- **Estado de flujos:** `get_flows` con `fields_flow: ["name","status","archived","trigger_type","updated"]`, `page_size: 50`, paginando hasta que `links.next` sea nulo (unos 156 flujos en 4 páginas).
- **Plan:** `list_billing_usage` (usa `active_profiles` y `email_sends`; solo devuelve el periodo en curso).
- **Dominio:** `get_sending_domains` con `fields_sending_domain: ["domain","status","purpose","dns_records","updated_at"]`.
- **Perfiles:** `ask_analytics_question` pidiendo solo dos recuentos agregados (perfiles totales y suscritos a email elegibles para marketing). Es una foto del día, no un cierre de mes, y no coincide con Subscriber Growth.

Definiciones de tasas (verificadas contra Klaviyo): apertura, CTR, spam y bajas se calculan sobre **entregados**; el bounce, sobre **destinatarios**. Los totales de ingresos y envíos son campañas más flujos (`resumir_informe.py total`). Los ingresos de octubre de 2025 calculados así coinciden al céntimo con la hoja `KPIs Klaviyo` del Excel de KPIs (45.558,22 €).

### Ventanas

- **Semanal:** 28 días terminados el domingo anterior a la ejecución, frente a las mismas fechas del año anterior. Para flujos sin envíos: última semana (lunes a domingo), semana anterior y 28 días previos como referencia.
- **Mensual:** el último mes natural cerrado frente al mismo mes del año anterior.

## 5. Evaluación

Cada señal sale de la pestaña `Umbrales`, que es la única fuente de los límites.

- Ingresos de email, envíos, open rate y CTR: comparación **interanual** (mes o 28 días frente a las mismas fechas del año anterior). Open rate en puntos porcentuales y CTR en variación relativa, como indica la columna `Comparación`. La comparación con el mes anterior solo se muestra como dato.
- Bounce, spam y bajas: valor del periodo frente al umbral.
- Suscritos y perfiles activos: variación frente al mes anterior usando `Mensual`. Si no hay fila previa, di «sin histórico previo» y no evalúes.
- Plan: uso frente al máximo del periodo de facturación en curso. El aviso informa del próximo salto de tramo; no recomiendes limpiar la base (regla del cliente).
- Flujos LIVE sin envíos: `scripts/resumir_informe.py sin_envios`. Solo cuentan flujos LIVE que enviaron en la referencia.
- Cambios de estado de flujos: compara `get_flows` con la pestaña `Flujos`. Un flujo que pasa de LIVE a borrador, manual o archivado, o un flujo esperado (según la pestaña `TO DO's` del Excel de KPIs) que no está LIVE, es crítico. La primera vez que `Flujos` esté vacía, escribe la línea base y no generes alertas de cambio.
- Dominio: estado distinto de `active` o registros DNS sin verificar, crítico.
- Campañas sin envío: usa el último envío (`ultimo_envio` de `resumir_informe.py campanas`).

**Prioridad de mercado.** Ordena las alertas de flujos por volumen de envíos del mercado (ES, FR, EU, IT y el resto por orden de destinatarios). Las de mercados pequeños se marcan «baja prioridad». Un flujo con menos de 60 envíos al mes puede estar sin envíos por estacionalidad: dilo.

**Ciclo de vida de las alertas.** Una alerta nueva se abre en `Alertas`. Si sigue vigente, no la repitas con detalle: cuéntala en una línea («sigue abierta desde AAAA-MM-DD»). Si deja de cumplirse, ciérrala con la fecha. El correo detalla solo las nuevas y las cerradas.

**Contexto que evita falsas alarmas** (en `contexto.md`): los welcome flows están LIVE; la incidencia de Shopify tags y locale sigue abierta y los flujos «Dividir usuarios por idioma» no se tocan; el calendario comercial lo lleva el cliente, así que una caída o subida de envíos informa y no concluye.

## 6. Histórico (Sheet)

- Las fórmulas del Sheet usan `;` como separador de argumentos (configuración regional es_ES). Las columnas de variación están calculadas por fórmula en la fila 1: **no escribas** en `Mensual!D`, `I`, `L`, `O` ni en `Semanal!F` e `I` (usa `null` para saltarlas).
- No uses `append_values`: calcula la fila siguiente con `get_values` sobre la columna A y escribe con `update_values` en un rango exacto.
- `Mensual`: una fila por mes (`'AAAA-MM` con apóstrofo para que sea texto). Si el periodo ya existe, actualiza esa fila. Porcentajes como fracción (0,3926).
- `Semanal`: una fila por ejecución semanal.
- `Flujos`: estado actual de todos los flujos (una fila por flujo). Reescribe el bloque completo y mueve el estado previo a `Estado anterior`; limpia las filas sobrantes con `batch_clear_values`.
- `Dominio`: una fila por ejecución.
- `Alertas`: una fila por alerta; los identificadores siguen `AAAA-MM-DD-NN` con apóstrofo.
- `Fuentes`: una fila por conjunto de consultas con la fuente, el objeto, la herramienta, los parámetros, la fecha de ejecución y el número de filas. Sin datos personales.

## 7. Correo

Envía con `mcp__Gmail__send_message`, con `htmlBody` y un `body` de texto plano breve.

| Modo | Para | Asunto |
|---|---|---|
| Semanal | emgomez@webimpacto.es | `Toni Pons · Estado semanal de Klaviyo · semana del DD de mes de AAAA` |
| Mensual | emgomez@webimpacto.es y lgarcia@webimpacto.es | `Toni Pons · Informe mensual de email · mes de AAAA` |

No añadas destinatarios.

### Estilo (línea gráfica de Webimpacto, que es quien factura)

- Correo HTML con tablas y estilos en línea (los clientes de correo no admiten otra cosa); `<style>` solo para el modo oscuro y la adaptación a móvil. Sin SVG ni imágenes: no hay logo.
- Fondo `#F4F4F6`; tarjetas blancas `#FFFFFF` con borde `#E3E3E7` y radio 12; ancho máximo 640 px.
- Titulares en Poppins (con `Segoe UI` y `Arial` de reserva) y cuerpo en Inter. Un solo `h1` y `h2` para las secciones, con el número en un chip rojo (`#C60639`, texto blanco).
- Barra de 8 × 120 px con degradado `#FF5001` a `#FD0235` a `#C60639` bajo el kicker. Kicker en `#C60639` (en oscuro, `#E8244F`), en mayúsculas.
- Semáforo con palabra, nunca solo color: Crítico (`#B3261E` sobre `#FDECEA`), Aviso (`#8A5300` sobre `#FFF3DC`), OK (`#17703C` sobre `#E7F4EC`). Texto atenuado `#5F6270`.
- Sin emojis, sin exclamaciones, titulares que afirman, cifras con fuente y periodo.
- Tablas con `th scope="col"` y contraste suficiente. Modo oscuro con los mismos tokens (`#1D1D1B`, `#2A2A28`, `#3A3A38`).

### Estructura del mensual

1. Titular con la conclusión del mes y una fila de seis KPI (ingresos, envíos, open rate, CTR, plan, suscritos).
2. Qué requiere acción (alertas nuevas y cerradas, con el siguiente paso).
3. Mes frente al mismo mes del año anterior (tabla con estado según `Umbrales`).
4. Flujos: por mercado, flujos que más suben y bajan, con la causa solo si está verificada.
5. Campañas: peso por audiencia, mejores campañas, mercados débiles, cadencia del mes en curso.
6. Estado de la cuenta: dominio, flujos por estado, borradores y puntos del contexto.
7. Oportunidades a validar con el cliente.
8. Fuentes y límites.

### Estructura del semanal

Titular de una frase; alertas nuevas, cerradas y las que siguen abiertas (una línea cada una); 28 días frente al mismo periodo del año anterior; estado de flujos y dominio; plan; fuentes y límites. Máximo una pantalla y media.

### Qué no hacer en el texto

- No afirmes causas sin verificar: «no se ha comprobado si es menos tráfico o menos conversión».
- No sugieras limpiar la base solo por precio, usar el locale de Klaviyo, tocar los flujos de idioma ni mezclar mercados.
- No cites nombres de personas del cliente: usa su cargo.
- No incluyas direcciones de correo del cliente ni datos de clientes finales.

## 8. Cierre

Al terminar, deja en la sesión un resumen de tres líneas: qué modo se ejecutó, cuántas alertas nuevas y cerradas, y si el correo se envió. No hagas commit de nada.

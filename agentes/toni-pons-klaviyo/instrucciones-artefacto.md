# Agente del artefacto de Toni Pons (reporte al cliente)

Completa el mes cerrado en el artefacto «Dashboard Toni Pons» (https://claude.ai/artifact/DSCwxDkuchsVPc4uV5osqw) con todos los datos que se puedan calcular desde Klaviyo y avisa por correo de lo que queda pendiente. La persona responsable revisa después y rellena a mano lo que falte. No es el semanal ni el mensual interno (`instrucciones.md`): es el reporte que se pasa al cliente.

Antes de empezar lee `contexto.md` y `instrucciones.md` (secciones 1 y 7) de esta carpeta. Los límites de esas secciones siguen vigentes salvo la ampliación de escritura de este documento.

## 1. Límites

- Conector de Klaviyo: solo `Klaviyo-ToniPons-Todo`, en solo lectura. Nunca `Klaviyo-Salter-Todo`.
- Escritura permitida en el artefacto: únicamente con `ArtifactData` en la colección `clientes/toni-pons/meses`, documento del mes a cerrar (`AAAA-MM`). No escribas en otros meses, en `config`, ni republiques la página (la página se pinta sola desde estos documentos).
- Correo: solo a emgomez@webimpacto.es, con `mcp__Gmail__send_message`.
- Sin datos personales: no pidas ni escribas perfiles, correos, teléfonos ni pedidos. Los eventos de Back in Stock se procesan con el script y solo se guardan recuentos por SKU. No imprimas filas de eventos.
- No inventes. Lo que no se pueda medir queda como la página lo marca (`s: "na"`) y se lista en el correo.

## 2. Periodo

Mes a cerrar: el mes natural anterior al de hoy en Europe/Madrid (`AAAA-MM`). Calcula con `zoneinfo`:

- `start` = día 1 a las 00:00 con el desplazamiento de Madrid de ese día.
- `end` = día 1 del mes siguiente a las 00:00 con su desplazamiento.
- `aStart` y `aEnd` = las mismas fechas sin hora (`AAAA-MM-DD`).

El 5 del mes los datos de atribución aún pueden moverse: indícalo en el correo.

## 3. Lectura previa

1. `ArtifactData get` del documento del mes (`clientes/toni-pons/meses/<mes>`). Si existe, anota su `version` y respeta toda entrada con `s: "m"` o `s: "h"` (escrita a mano): no la pises; guarda el valor de Klaviyo en `kv`, como hace la página.
2. `get` del documento del mes anterior, para las tablas de arrastre y el valor previo de Lead Gen.
3. `get` de `clientes/toni-pons/config/fuentes` (puede no existir). Si no existe o no trae un id, ese dato queda sin medir.

## 4. Datos de Klaviyo

Guarda cada respuesta grande en fichero y procésala con scripts (`python3 -I`, scripts en una carpeta distinta de los datos). Máximo un año por consulta. Las IDs de métrica están verificadas con el conector el 2026-10-29.

| Dato (clave) | Herramienta y parámetros |
|---|---|
| Campañas: `volC`, `rc`, tabla `camps` | `get_campaign_report`, `conversion_metric_id` `Ut5CZR`, `statistics`: `recipients`, `delivered`, `opens_unique`, `clicks_unique`, `conversion_uniques`, `open_rate`, `click_rate`, `conversion_rate`, `unsubscribe_rate`, `bounce_rate`, `spam_complaint_rate`; `value_statistics`: `conversion_value`; `filters`: `equals(send_channel,"email")`; `timeframe`: `start`/`end` |
| Flujos: `volF`, `rf`, tabla `flows` | `get_flow_report`, mismos parámetros y `group_by`: `flow_id`, `flow_name`, `send_channel` |
| `or`, `ctr`, `bo`, `sp`, `un` | Las calcula el script con campañas y flujos |
| `ventas` | `query_metric_aggregates`, métrica `Ut5CZR`, `sum_value`, `interval` mes, `timezone` Europe/Madrid, filtro `greater-or-equal(datetime,aStart T00:00:00)` y `less-than(datetime,aEnd T00:00:00)`; suma los tramos que empiecen antes de `end` |
| `nsub` | Igual, métrica `Vh7kyM`, `count` |
| `exSp` | Métrica `V48yMr`, `count` |
| `exBo` | Métrica `RNe5R8`, `count` |
| `exMa` | Métrica `XMrAMJ`, `count` |
| `exInv` | Métrica `XxPVu9`, `count` |
| `lgLeads` | Métrica `WkXyeM`, `count` |
| `leadsSub`, `shopSub` | Métrica `V2EbhE`, `count`, `by: ["List"]`; lista «LEADS TIENDAS» y lista «Usuarios y Clientes Shopify sin filtrar país/idioma» |
| `bbdd`, `act`, `sus` | `query_segment_values`, `total_members`, con los ids de `config/fuentes`. Sin id: sin medir |
| Tablas `bisSkusMes`, `bisModelosMes` | `get_events`, `filter`: `equals(metric_id,"WYfcf8"),greater-or-equal(datetime,start),less-than(datetime,end)`, `fields_event`: `["event_properties.SKU"]`, `page_size`: 1000. Pagina por `links.next` hasta 30 páginas |

Comandos del script (`scripts/preparar_mes_artefacto.py`):

```
python3 -I preparar_mes_artefacto.py kpis --campanas RUTA --flujos RUTA --salida SALIDA.json
python3 -I preparar_mes_artefacto.py bis --eventos RUTA1 RUTA2 ... --salida SALIDA.json
```

Validado con octubre de 2026: envíos e ingresos de campañas y flujos, y las 95 campañas y 74 flujos, coinciden con lo guardado. Las tasas pueden diferir unas décimas por haberse guardado el 5 de noviembre, antes de que terminasen de llegar aperturas, quejas y bajas.

No escribas las claves que calcula la página: `crec`, `crecB`, `vol`, `fact`, `vly`, `pct` y las `sup*`.

## 5. Lead Gen

La tabla `lgFuentes` y `lgVentas` del artefacto sale de la propiedad de perfil `Fuente Original`, con `ask_analytics_question` (solo recuentos agregados, nombrando la propiedad como `custom_properties."Fuente Original"` y pidiendo la consulta SQL en la respuesta). Verifica antes cada cifra contra la consulta devuelta.

Correspondencia entre la fuente del artefacto y los valores de la propiedad (comprobada el 2026-11-16 con recuentos de perfiles):

| Fuente del artefacto | Valores de `Fuente Original` |
|---|---|
| Sorteo Ibiza | `SORTEO IBIZA` |
| Sorteo Mediterráneo | los que contienen `SORTEO MEDITERRÁNEO` (con o sin prefijo ES, IT, CAT, EU o FR) |
| Sorteo Dalí | `SORTEO DALÍ` |
| Sorteo Suecia | los que contienen `SORTEO SUECIA` (con o sin prefijo) |
| Sample Market AW25 | `Lead gen SAMPLE MARKET` (no cuadra con el artefacto: 1.553 frente a 1.629, sin explicar) |
| Loren Brovarnik | `Social Media Giveaway Loren Brovarnik` |
| Sorteo Sita Murt | `sorteo sita murt` |
| Ventas Privadas AW24 | `Lead Gen ventas privadas AW24` y `Lead gen Ventas Privadas AW24` |
| Tienda TP | `Tienda TP` |
| Back in Stock | `Back in Stock` |
| Sample market AW26 | `Sample Market AW26` |
| Lead Gen SS26 (tabla `lgVentas`) | `Lead Gen SS26` |

Columnas de cada fila: `leads` (perfiles), `sus` (pueden recibir marketing por email hoy), `unsub` (bajas: no está verificada la definición; en octubre no es leads menos suscritos, así que compruébala contra el valor de octubre y, si no cuadra, deja el valor anterior y dilo), `conv` (perfiles con algún pedido), `ped` (pedidos) y `rev` (importe). Conserva `n` y `f` (nombre y fechas) del mes anterior.

Pedidos e importe solo se pueden medir con Shopify (`Ut5CZR`) y en una ventana de unos 3 años: los pedidos de Magento (`SH9QVx`) existen en la cuenta, pero no se pueden cruzar con la propiedad. Por eso:

- Calcula `conv`, `ped` y `rev` con Shopify.
- Si el valor calculado es menor que el del mes anterior (el acumulado no puede bajar), conserva el anterior y anótalo en el correo.
- Marca las tablas con `rev: true` (a revisar) y di en el correo que el importe es solo Shopify.
- Si aparecen valores de `Fuente Original` nuevos que no están en la tabla, no los añadas: lístalos en el correo con su número de perfiles.

Inversión y coste por lead de Meta (`lgInv`, `lgCpl*`), `lgPed`, `lgRev`, `lgConv`, `lgSus`, `lgUnsub` y la tabla `lgMeta` no salen de Klaviyo: quedan sin medir.

## 6. Escritura

Estructura del documento: `{cliente: "toni-pons", mes: "AAAA-MM", y, m, actualizado: <ISO>, k: {clave: {s: "k", v: valor, src: ""}}, t: {tabla: {s: "k", rows: [...]}}, x: {}}`.

- Dato medido: `{s: "k", v: valor, src: ""}`. Tabla medida: `{s: "k", rows: filas}`.
- Dato sin medir: `{s: "na", v: null, err: "<motivo>"}`. Tabla sin medir: `{s: "na", rows: [], err: "<motivo>"}`.
- Datos manuales que la página espera a mano (si no hay valor): `bisTotal`, `bisPend`, `bisProc`, `nps20_0` a `nps20_10`, `nps180_0` a `nps180_10`, `exOc`, `exEl`, `exOt`, `leadsUnsub`, `shopUnsub` y, sin id de segmento, `bbdd`, `act` y `sus`. Escribe `s: "na"` con el motivo «Klaviyo no tiene esta fuente: escribe el valor a mano».
- Tablas de arrastre que no se miden (`bisModelosTotal`, `bisVariantesTotal`): `s: "na"` con el mismo motivo. La página usa mientras tanto la del último mes que la tenga.
- Si el documento no existe, créalo con `set` sin `if_version`. Si existe, `set` con la `version` leída y las entradas manuales respetadas.
- Después de escribir, vuelve a leer el documento y cuenta cuántos datos están medidos, sin medir y en revisión.

## 7. Correo

Envía con `mcp__Gmail__send_message` (`htmlBody` y `body` de texto plano) solo a emgomez@webimpacto.es. Estilo y reglas de `instrucciones.md`, sección 7.

- Asunto: `Toni Pons · Artefacto actualizado · mes de AAAA`.
- Contenido, en este orden:
  1. Una frase de estado: el artefacto está actualizado con los datos a la fecha de ejecución, que pueden variar unos días después.
  2. Completado: lista de datos medidos y tablas (con el número de filas).
  3. Pendiente de rellenar a mano: la lista del apartado 6, con el motivo de cada uno.
  4. Lead Gen: tabla con cada fuente, valor de octubre y valor nuevo de leads, suscritos, bajas y, si cambió, pedidos e importe, indicando cuáles se conservaron por no poder bajar y que el importe es solo Shopify.
  5. Fuentes nuevas sin añadir y diferencias sin explicar (por ejemplo, Sample Market AW25).
  6. Fuentes y límites: herramientas, fecha de ejecución y lo que no se ha comprobado.
- Sin datos personales de clientes finales.

Si falla la escritura en el artefacto o alguna fuente, envía igualmente el correo explicando qué ha fallado y qué queda pendiente, y no inventes datos. No hagas commit.

## 8. Cierre

Deja en la sesión un resumen de tres líneas: mes cerrado, datos medidos y pendientes, y si el correo se envió.

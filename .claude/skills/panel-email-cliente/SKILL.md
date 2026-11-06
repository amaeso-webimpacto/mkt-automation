---
name: panel-email-cliente
description: Crea, actualiza cada mes o exporta en HTML estático el panel de email marketing de un cliente (Klaviyo, iCommkt, Connectif o HubSpot, siempre con tienda Shopify). Úsala cuando se pida un dashboard o panel de email para un cliente, la actualización mensual de un panel, incorporar el contexto del mes al análisis, o la versión estática para Google Sites, aunque no se nombre la skill.
---

# Panel de email marketing por cliente

Un artefacto por cliente, con la línea gráfica de la sociedad que factura (hoy solo hay plantilla de **D2C eCommerce**; si el cliente factura con Webimpacto, avisar y pedir antes la plantilla). Los datos viven en la base de datos del artefacto (`db`); el HTML es común a todos los clientes.

- Código común: `dashboards/plantilla/` (`index.html` con `{{CLIENTE}}`, `panel.css`, `panel.js`, `logo_d2c.png`).
- Registro de clientes: `dashboards/clientes.json`.
- Ejemplo completo: `dashboards/azarey/` (semilla del histórico en `seed/`).
- Detalle del modelo de datos y criterios: `dashboards/README.md`.

Una conversación = un cliente. No mezclar datos ni conectores de clientes distintos.

## Criterios fijos (iguales en todos los proyectos)

| Dato | Criterio |
|---|---|
| Campañas B2B / mayoristas | Fuera de todo cálculo (`b2b: true`). Nombre con B2B, BSB, MAYORISTA o [Seguimiento], **o** alguna audiencia incluida con «MAYORISTA» o «B2B». Comprobar siempre las audiencias, no solo el nombre. |
| Conversión Klaviyo | Métrica «Placed Order» de integración **Shopify** (buscar su id con `get_metrics` filtrando `equals(integration.name,"Shopify")`; puede haber otra «Placed Order» que no es la buena). Canal email. |
| Ingresos canal email (Shopify) | Atribución **último clic no directo**. Si el conector de Shopify no está en la tienda del cliente, dato manual. Antes de usar Shopify, `get-shop-info` y confirmar que la tienda es la del cliente; si no lo es, no usar sus datos. |
| Venta neta | **Siempre dato manual** que facilita el cliente. |
| BBDD total y suscritos | Perfiles totales y con consentimiento de email en Klaviyo **el día de la actualización** (`ask_analytics_question`, solo recuentos agregados). |
| BBDD activos | Recuento de perfiles de correo de Klaviyo el día de la actualización = `active_profiles` de `list_billing_usage`. |
| BBDD enviamos | Destinatarios de la **última campaña B2C** enviada en el mes. |
| Segmento de envío | `audiences.included` / `audiences.excluded` de `get_campaign_report`, guardado en cada campaña. |

Klaviyo atribuye con ventana de 5 días: un mes no se da por cerrado hasta el **día 5 del mes siguiente**.

## Modo A · Crear el panel de un cliente nuevo

Pedir solo lo que falte: nombre del cliente, sociedad que factura, plataforma, conector de Klaviyo (`Klaviyo-<Cliente>-todo`), meses a cargar y, si existe, el HTML o la hoja del panel anterior para el histórico.

1. `node dashboards/plantilla/nuevo-cliente.js <slug> "<Nombre>"`.
2. Histórico: si hay panel anterior, pasarlo a `dashboards/<slug>/seed/` como en Azarey (`history.js` + `build.js`). Si no, sacar de Klaviyo mes a mes con `get_campaign_report` y `get_flow_report` (timeframe máximo 1 año por llamada; para respuestas grandes, delegar en un agente que escriba un JSON y devuelva solo el recuento).
3. Clasificar B2B por nombre y por audiencias (`merge-audiences.js` como referencia).
4. Publicar el artefacto con `Artifact` (`file_path` = `dashboards/<slug>/index.html`, `files` = `panel.css`, `panel.js` y `logo_d2c.png` de `plantilla/`, `capabilities: {db: {}, user: {}}`, `icon: "chart"`).
5. Cargar `config/cliente` y `months/<AAAA-MM>` con `ArtifactData` (`batch`, ≤ 50 escrituras).
6. Redactar el análisis del último mes (ver «Análisis») y añadir el cliente a `dashboards/clientes.json`.
7. Verificar: una lectura `list` de `months` con `as_level: "view"`. Commit y push.

Plataformas sin conector (iCommkt, Connectif, HubSpot): crear el panel igual y cargar los datos a mano desde «Editar datos» o desde lo que pase el usuario; la estructura de mes es la misma.

## Modo B · Actualización mensual (Klaviyo)

Para cada cliente de `clientes.json` con `activo: true` y `plataforma: "klaviyo"`, el mes a cerrar es el anterior a la fecha de ejecución.

1. **Leer antes de escribir.** `ArtifactData get` de `months/<mes>` (si existe) y de `config/cliente`. Respetar todo lo que haya escrito el equipo: contexto, venta neta, ingresos Shopify, valores de BBDD corregidos a mano. Escribir siempre con `if_version`.
2. **Campañas:** `get_campaign_report` del mes (canal email, Placed Order de Shopify) con `recipients, open_rate, click_rate, click_to_open_rate, conversion_rate, conversions, unsubscribe_rate` y `conversion_value, average_order_value, revenue_per_recipient`. Guardar audiencias y marcar B2B.
3. **Flujos:** `get_flow_report` agrupado por `flow_id`; usar `flow_aggregation`. Si aparece un flujo nuevo, añadirlo a `config.flujos`.
4. **BBDD** según los criterios de la tabla.
5. **Shopify:** solo si el conector está en la tienda correcta; si no, dejar `shopify.rev` y `shopify.ventaNeta` a `null`.
6. **Análisis** del mes teniendo en cuenta el **contexto** (ver abajo).
7. Escribir `months/<mes>` (crear o `update` con `if_version`).
8. **Versión estática:** exportar con `ArtifactData list` (`months`) y `get` (`config/cliente`) usando `out_dir`, y `node dashboards/plantilla/build-static.js "<Nombre>" <out_dir> <salida.html>`.
9. **Resumen final** para el equipo: qué se ha cargado, qué queda pendiente de dato manual (venta neta, Shopify si no está conectado) y cualquier anomalía (campañas sin audiencia, B2B dudosas, saltos raros).

## Modo C · Incorporar el contexto al análisis

El contexto lo escribe el equipo en «Análisis y contexto». Cuando se pida «actualiza el análisis de <mes> con el contexto» o en la actualización mensual:
- Pasar cada acción del contexto a `analisis.acciones` (en negrita lo hecho, y fecha si se conoce). Comprobar en Klaviyo lo que se pueda verificar (por ejemplo, que un flujo existe y desde cuándo) y decir lo que no se ha podido comprobar.
- Ajustar `resumen` y `corregir` si el contexto explica un dato (supresiones que bajan la BBDD, flujos reajustados cuyo efecto se verá el mes siguiente).
- Actualizar `config.estrategia` y `config.flujosPorCrear` si algo pasa de «por hacer» a «hecho» o a «medir».

## Modo D · Versión estática para Google Sites

`build-static.js` genera un único HTML de solo lectura (sin «Editar datos») con CSS, JS, logo y datos incrustados. Es la única excepción a la regla de CSS/JS en ficheros aparte, porque «Insertar código» de Google Sites admite un solo bloque. Los datos quedan en el código fuente: solo en Sites privados.

## Análisis: forma y voz

- `analisis.resumen` (un párrafo), `funciono` y `corregir` (3-5 puntos cada uno, con cifra y comparación con el mes anterior o el año anterior), `acciones` y `propuestas` (`título | cuándo | descripción`, basadas en lo que ha funcionado en el histórico).
- Cada punto empieza con la idea en `**negrita**` y sigue con el dato que la sostiene.
- Voz D2C: titulares que afirman, cifras con periodo, sin emojis, sin exclamaciones, sin «no es X, es Y». No inventar causas: si un dato no se explica, decirlo y proponer comprobarlo.
- No poner en rojo los datos negativos (el panel ya los muestra en negrita).

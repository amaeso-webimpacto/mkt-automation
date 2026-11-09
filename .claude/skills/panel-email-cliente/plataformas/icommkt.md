# iCommkt

Estado: **verificado en parte** con Genuins (conector `icomm-genuins`), noviembre 2026. Lo marcado como «pendiente» sigue sin comprobar con datos reales: cuadrarlo con el informe anterior del cliente antes de darlo por bueno y, al comprobarlo, quitar la marca y subir la versión de la skill.

Conector por cliente: `icomm-<cliente>` (herramientas `mcp__icomm-<cliente>__*`). Opera sobre la cuenta autenticada: no se indica el cliente en las llamadas. Antes de nada, `get_account_context` y confirmar que `account` es el cliente del panel.

**Solo lectura.** Varias herramientas del conector escriben (modales, encuestas, temporizadores, estado de contactos, sincronizaciones): no usarlas nunca desde esta skill.

## Peculiaridades de los clientes iCommkt

| Dato | Criterio |
|---|---|
| Ingresos del canal | **Solo Shopify** (último clic no directo), nunca de iCommkt. iCommkt no da revenue por envío: `rev`, `aov` y `rpr` de campañas y flujos se guardan como `null`. |
| Flujos | Salen **de Shopify y de iCommkt**. El conector no los da (ver «Flujos»): se cargan a mano, indicando en el nombre de cada flujo de qué herramienta sale. |
| BBDD suscritos | Contactos del segmento **Masterdata_total** o, si hay uno por idioma, la **suma** de esos segmentos. |
| BBDD activos | Contactos activos que da iCommkt (`get_contacts_overview`). |
| BBDD enviamos | **Suma de los segmentos** a los que va la última newsletter B2C del mes: los enviados de todas sus versiones por idioma. |
| BBDD total | Contactos totales de `get_contacts_overview`. |

## Atribución y cierre de mes

Ventana de atribución de 5 días (confirmado por el equipo): el mes se cierra **a partir del día 5** del mes siguiente.

## Ingresos

- **Solo Shopify, último clic no directo**, separando flujos y campañas si el dato está disponible; si no, dato manual.
- `get_icomm_attribution` usa las rutas de conversión de GA4 (cualquier compra con iCommkt en la ruta). No es último clic no directo: no usarlo para el panel.
- `purchases` de cada envío es un recuento de compras que iCommkt atribuye al envío, sin importe. Se guarda en `conv` como referencia de conversión, no como ingreso.

## Campañas

En iCommkt una **campaña es un contenedor** (en Genuins, uno por mes e idioma: «Oct 2026 ES», «Oct 2026 ENG», «Oct 2026 DE», «Oct 2026 FR», más «Flows»). La unidad del panel es la **newsletter**, que se envía una vez por idioma.

1. `get_campaign_performance` con `date_from` / `date_to` del mes y `limit: 50`. **Solo devuelve la lista de envíos** (`delivery_id`, `campaign`, `name`, `newsletter`, `scheduled_at`) y un `total`, sin métricas. Si `total` supera lo devuelto, partir el periodo.
2. Métricas: una llamada por envío con `delivery_id`. Devuelve `sends`, `effective`, `bounced`, `unique_opens`, `unique_clicks`, `unsubscribed`, `leads`, `purchases`, `complaints` y el `subject`. Un mes de Genuins son unas 40 llamadas (10 newsletters × 4 idiomas): delegar en un agente que escriba un JSON por mes.
3. Una fila del panel = una newsletter: agrupar sus envíos por nombre sin el sufijo de idioma (` ES`, ` EN`, ` ENG`, ` DE`, ` FR`…, recortando espacios) y fecha. Sumar recuentos y **calcular las tasas a partir de los recuentos**, no promediar las del conector. Los idiomas van en `audiences.included`.
4. Mapeo: `recipients` = suma de `effective`; `or` = aperturas únicas / efectivos; `ctr` = clics únicos / efectivos; `ctor` = clics únicos / aperturas únicas; `unsub` = bajas / efectivos; `conv` = `purchases`; `cr` = `purchases` / efectivos; `rev`, `aov`, `rpr` = `null`.
5. **Ojo con los nombres de las tasas del conector:** `click_through_rate` es clics sobre aperturas (CTOR), no CTR. Comprobado: 163 clics / 8.619 aperturas = 1,9 %. `open_rate` no se ha podido distinguir si va sobre enviados o efectivos (con rebotes del 0,1 % redondea igual): por eso se recalcula.
6. Las fechas de `scheduled_at` vienen con huso −03:00: usar la fecha local de la cuenta (Romance Standard Time) si el envío cae cerca de medianoche.
7. Segmentos de envío: **el conector no los da** (`list_audiences` no lee las audiencias de la tienda «Email Marketing» y la de «Shopify» solo devuelve categorías). B2B se marca por nombre; si hay dudas, preguntar al equipo.

## Flujos (automatizaciones)

- `list_automations` devolvió 0 en Genuins y la campaña «Flows» no tuvo envíos en octubre 2026, aunque el equipo confirma que hay flujos activos en Shopify y en iCommkt. **Pendiente:** averiguar dónde registra iCommkt esos envíos.
- Mientras tanto, los flujos se cargan a mano en «Editar datos» o desde la exportación que pase el equipo. Antes de una actualización, volver a probar `list_automations` y `get_campaign_performance` con `campaign: "Flows"`; si devuelven datos, usarlos y quitar este aviso.

## BBDD

- `get_contacts_overview` del mes:
  - `totals.contacts` → **total**; `totals.active` → **activos** del día de la actualización.
  - `monthly_active` trae los activos a cierre de cada mes del último año: sirve para el histórico de **activos**.
  - **Pendiente:** si `totals.contacts` es del día de la consulta o del final del periodo pedido. Hasta comprobarlo, el total solo se guarda en el mes que se actualiza.
- **Suscritos:** segmento(s) Masterdata_total. El conector no lee segmentos ni sus recuentos, así que es **dato manual** hasta que lo haga.
- **Enviamos:** suma de `sends` de todas las versiones por idioma de la última newsletter B2C del mes. Guardarlo siempre en `bbdd.enviamos`: el cálculo automático del panel usa `recipients` (efectivos) y daría un valor algo menor.

## Lo que no hace falta del conector

GA4, RFM, productos, modales, encuestas y temporizadores no forman parte del panel. Solo usarlos si se pide expresamente.

## Texto del pie (`notaFuentes`)

«Fuentes: iCommkt (envíos, aperturas, clics, bajas y compras por envío; tasas sobre efectivos) y Shopify (ingresos del canal, último clic no directo). Venta neta facilitada por el cliente. Activos y total: contactos de iCommkt. Suscritos: segmentos Masterdata_total. Enviamos: suma de los segmentos de la última newsletter B2C del mes, todas sus versiones por idioma. Flujos de Shopify e iCommkt cargados a mano. Campañas B2B y de mayoristas excluidas de todos los cálculos.»

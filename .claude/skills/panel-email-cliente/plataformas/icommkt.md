# iCommkt

Estado: **borrador, pendiente de verificar con datos reales.** Escrito a partir de la descripción de las herramientas del conector y de la estructura de un panel antiguo de un cliente iCommkt. Antes de dar por buena cualquier cifra, cuadrarla con el panel o informe anterior del cliente en uno o dos meses, y actualizar este fichero con lo que se compruebe (cambiar el estado a «verificado» y subir la versión de la skill).

Conector por cliente: `icomm-<cliente>` (herramientas `mcp__icomm-<cliente>__*`). Opera sobre la cuenta autenticada: no se indica el cliente en las llamadas. Antes de nada, `get_account_context` y confirmar que la cuenta es la del cliente del panel.

**Solo lectura.** Varias herramientas del conector escriben (modales, encuestas, temporizadores, estado de contactos, sincronizaciones): no usarlas nunca desde esta skill.

## Atribución y cierre de mes

Ventana de atribución de 5 días (confirmado por el equipo): el mes se cierra **a partir del día 5** del mes siguiente.

## Ingresos

- **Fuente principal: Shopify, último clic no directo** (como en todos los clientes), separando flujos y campañas si el dato está disponible; si no, dato manual.
- `get_icomm_attribution` usa las rutas de conversión de Google Analytics 4 (cualquier compra con iCommkt en la ruta). **No es último clic no directo**: no mezclarlo con los ingresos de Shopify. Si se muestra, como dato de referencia y con su nombre.
- El revenue que da iCommkt por envío, si lo da, también es solo referencia.

## Campañas

- En iCommkt una **campaña agrupa envíos**. Lo habitual es un envío por idioma o país (ES, DE, EN, FR…).
- `list_campaigns` para localizar campañas y `get_campaign_performance` con `date_from` / `date_to` del mes para el rendimiento por envío: enviados, efectivos, rebotes, aperturas únicas, clics, bajas, leads y adquisiciones, con sus tasas. Máximo 50 envíos por llamada: si el mes tiene más, partir el periodo.
- Una fila del panel = una campaña: sumar los envíos de sus versiones y ponderar las tasas por destinatarios. Guardar los idiomas en el nombre o en `audiences.included` mientras el panel no tenga campo propio.
- **Pendiente de verificar:** si las tasas se calculan sobre enviados o sobre efectivos (el panel antiguo usaba efectivos), qué trae exactamente «adquisiciones» y si hay revenue por envío.

## Flujos (automatizaciones)

- `list_automations` (estado) y `get_automation_performance` por flujo, con el mes en `date_from` / `date_to`.
- **Atención:** en clientes iCommkt algunos flujos pueden ejecutarse fuera de iCommkt (por ejemplo, en Shopify Marketing Automations o en otra herramienta). Esos no los da el conector: preguntar al equipo de dónde salen y cargarlos a mano o desde su fuente.

## BBDD

- `get_contacts_overview` del periodo: total de contactos, altas y bajas y desglose por lista. Usar para **total** y como base de la tasa de baja.
- **Activos y suscritos:** pendiente de definir con el equipo qué lista o dato equivale a cada uno.
- **Enviamos:** destinatarios de la última campaña B2C del mes (suma de sus versiones).

## Lo que no hace falta del conector

GA4, RFM, productos, modales, encuestas y temporizadores no forman parte del panel. Solo usarlos si se pide expresamente.

## Texto del pie (`notaFuentes`)

Redactarlo al crear el panel con las fuentes reales verificadas (iCommkt para envíos, Shopify último clic no directo para ingresos, venta neta manual, criterio de activos que se acuerde).

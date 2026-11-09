# Paneles de email marketing por cliente

Un artefacto HTML por cliente con la línea gráfica de la sociedad que factura (de momento D2C eCommerce). Los datos viven en la base de datos del artefacto (capacidad `db`), no en el HTML, para poder editarlos desde el panel y actualizarlos cada mes sin republicar.

## Estructura

- `.claude/skills/panel-email-cliente/`: la skill con todo el proceso (`SKILL.md`, con versión e historial), las instrucciones por plataforma (`plataformas/klaviyo.md`, `plataformas/icommkt.md`) y la plantilla común del panel (`plantilla/`: `index.html` con `{{CLIENTE}}`, `panel.css`, `panel.js`, `logo_d2c.png`, `nuevo-cliente.js` y `build-static.js` para la versión de Google Sites). Es la única copia del diseño.
- `<cliente>/index.html`: la plantilla con el nombre del cliente. Se publica con los `panel.*` y el logo de la plantilla.
- `<cliente>/seed/`: carga inicial del histórico (`build.js`, `merge-audiences.js`, `audiences.json`). Después, la fuente de verdad es la base de datos del artefacto.
- Cada panel guarda en `config/cliente` su conector de Klaviyo y su métrica de conversión, así que no hace falta un registro aparte: los paneles se localizan por su título «Panel Email <Cliente>».

## Modelo de datos

- `config/cliente`: nombre, plataforma, flujos (`id de Klaviyo → nombre`) y marco estratégico.
- `months/<AAAA-MM>`: Shopify (`rev`, `ventaNeta`), BBDD, campañas (con `b2b: true` para excluirlas), flujos por id, contexto del mes, análisis (resumen, funcionó, corregir, acciones, propuestas) y fuentes.

Los porcentajes se guardan como fracción (0,35 = 35 %). Las campañas B2B se excluyen de todos los cálculos con el campo `b2b`.

## Paneles publicados

- Azarey (Klaviyo): https://claude.ai/artifact/VPjVvjaBwSM4TWnRNxhyts
- Genuins (iCommkt): https://claude.ai/artifact/CHaBWwxiDWyx67mC8tm3Nz

## Criterios comunes a todos los proyectos

Lo propio de cada plataforma (activos, suscritos, enviamos, flujos, revenue) está en `.claude/skills/panel-email-cliente/plataformas/`. Lo de abajo es el caso Klaviyo; en iCommkt los ingresos salen solo de Shopify, suscritos es el segmento Masterdata_total y enviamos la suma de los segmentos de la última newsletter.

- **B2B y mayoristas:** fuera de todos los cálculos. Nombre con B2B, BSB, MAYORISTA o [Seguimiento], o audiencias con «MAYORISTA».
- **Venta neta:** dato manual que facilita el cliente.
- **Ingresos del canal email en Shopify:** atribución de último clic no directo.
- **Activos:** recuento de perfiles de correo de Klaviyo (Audiencia > Segmentos) el día de la actualización. Coincide con `active_profiles` de `list_billing_usage`.
- **Enviamos:** destinatarios de la última campaña B2C enviada en el mes. Si el mes no tiene dato guardado, el panel lo calcula así.
- **Total y suscritos:** perfiles totales y con consentimiento de email en Klaviyo el día de la actualización.

## Actualización mensual (pendiente de automatizar)

1. Klaviyo: `get_campaign_report` y `get_flow_report` del mes, conversión «Placed Order» de Shopify, canal email. Marcar las campañas B2B.
2. Klaviyo: `list_billing_usage` (activos) y perfiles totales y suscritos el día de la actualización.
3. Shopify de la tienda del cliente: ingresos del canal email con último clic no directo. Venta neta: la facilita el cliente.
4. Escribir `months/<AAAA-MM>` con `ArtifactData` y redactar el análisis del mes.

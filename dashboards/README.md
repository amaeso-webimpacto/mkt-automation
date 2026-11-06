# Paneles de email marketing por cliente

Un artefacto HTML por cliente con la línea gráfica de la sociedad que factura (de momento D2C eCommerce). Los datos viven en la base de datos del artefacto (capacidad `db`), no en el HTML, para poder editarlos desde el panel y actualizarlos cada mes sin republicar.

## Estructura

- `plantilla/`: el panel común a todos los clientes (`index.html` con `{{CLIENTE}}`, `panel.css`, `panel.js`, `logo_d2c.png`), `nuevo-cliente.js` para dar de alta un cliente y `build-static.js` para la versión estática de Google Sites.
- `<cliente>/index.html`: la plantilla con el nombre del cliente. Se publica con los `panel.*` y el logo de `plantilla/`.
- `<cliente>/seed/`: histórico de partida, `build.js` que genera los documentos de la base de datos (`seed/out/`) y `merge-audiences.js`, que añade los segmentos de envío de `audiences.json` (extraído de Klaviyo) y marca como B2B las campañas enviadas a audiencias de mayoristas. Solo sirve para la carga inicial: después, la fuente de verdad es la base de datos del artefacto.
- `clientes.json`: registro de paneles que usa la actualización mensual.
- El proceso completo (crear, actualizar, contexto, versión estática) está en la skill `.claude/skills/panel-email-cliente/SKILL.md`.

## Modelo de datos

- `config/cliente`: nombre, plataforma, flujos (`id de Klaviyo → nombre`) y marco estratégico.
- `months/<AAAA-MM>`: Shopify (`rev`, `ventaNeta`), BBDD, campañas (con `b2b: true` para excluirlas), flujos por id, contexto del mes, análisis (resumen, funcionó, corregir, acciones, propuestas) y fuentes.

Los porcentajes se guardan como fracción (0,35 = 35 %). Las campañas B2B se excluyen de todos los cálculos con el campo `b2b`.

## Paneles publicados

- Azarey: https://claude.ai/artifact/VPjVvjaBwSM4TWnRNxhyts

## Criterios comunes a todos los proyectos

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

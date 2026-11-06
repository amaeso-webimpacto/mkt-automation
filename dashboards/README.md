# Paneles de email marketing por cliente

Un artefacto HTML por cliente con la línea gráfica de la sociedad que factura (de momento D2C eCommerce). Los datos viven en la base de datos del artefacto (capacidad `db`), no en el HTML, para poder editarlos desde el panel y actualizarlos cada mes sin republicar.

## Estructura

- `logo_d2c.png`: logotipo D2C (del design system de D2C eCommerce).
- `<cliente>/index.html`, `panel.css`, `panel.js`: el panel. Es el mismo para todos los clientes; solo cambian los datos.
- `<cliente>/seed/`: histórico de partida y script `build.js` que genera los documentos de la base de datos (`seed/out/`).

## Modelo de datos

- `config/cliente`: nombre, plataforma, flujos (`id de Klaviyo → nombre`) y marco estratégico.
- `months/<AAAA-MM>`: Shopify (`rev`, `ventaNeta`), BBDD, campañas (con `b2b: true` para excluirlas), flujos por id, contexto del mes, análisis (resumen, funcionó, corregir, acciones, propuestas) y fuentes.

Los porcentajes se guardan como fracción (0,35 = 35 %). Las campañas B2B se excluyen de todos los cálculos con el campo `b2b`.

## Paneles publicados

- Azarey: https://claude.ai/artifact/VPjVvjaBwSM4TWnRNxhyts

## Actualización mensual (pendiente de automatizar)

1. Klaviyo: `get_campaign_report` y `get_flow_report` del mes, conversión «Placed Order» de Shopify, canal email. Marcar como B2B las campañas con nombre B2B/BSB/MAYORISTA/[Seguimiento] o con audiencias «MAYORISTA».
2. Shopify: ingresos atribuidos a email y venta neta del mes.
3. Escribir `months/<AAAA-MM>` con `ArtifactData` y redactar el análisis del mes.

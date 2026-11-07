---
name: panel-email-cliente
description: Actualiza cada mes, crea si aún no existe, o exporta en HTML estático el panel de email marketing de un cliente (Klaviyo, iCommkt, Connectif o HubSpot, siempre con tienda Shopify), y pasa el contexto del mes al análisis. Úsala cuando se pida actualizar, crear o revisar el panel o dashboard de email de un cliente, incorporar el contexto del mes, o la versión para Google Sites, aunque no se nombre la skill.
---

# Panel de email marketing por cliente

| Versión | Fecha | Creadora | Contacto |
|---|---|---|---|
| 1.1.0 | 07/11/2026 | Ana I. Maeso | amaeso@webimpacto.es |

Cada cliente tiene un artefacto llamado **«Panel Email <Cliente>»** con la línea gráfica de la sociedad que factura. Hoy solo existe la plantilla de **D2C eCommerce**: si el cliente factura con Webimpacto u otra sociedad, avisar y no continuar sin su plantilla. Los datos viven en la base de datos del artefacto (`db`); el diseño es el mismo para todos y está en `plantilla/` dentro de esta skill.

Una conversación = un cliente. No mezclar datos, conectores ni decisiones de clientes distintos.

**Ficheros de la skill:** este `SKILL.md` (lo común), `plataformas/<plataforma>.md` (cómo sacar los datos de cada plataforma) y `plantilla/` (el panel). **Si falta `plantilla/` o `plataformas/`** (por ejemplo, si se subió solo el `SKILL.md`), no improvisar: obtenerlos del repositorio `amaeso-webimpacto/mkt-automation`, rama `main`, en `.claude/skills/panel-email-cliente/` (con `add_repo` y clonado si hace falta). Si tampoco hay acceso, avisar de que hay que reinstalar la skill con el zip completo.

## Paso 0 · ¿Actualizar o crear?

1. Identificar el cliente, su plataforma y el mes. Si no se dice el mes, es el **mes anterior** al de hoy. No cerrar un mes antes del día que marque la ventana de atribución de su plataforma (ver `plataformas/`); avisar si se pide antes.
2. Buscar su panel: `Artifact` con `action: "list"` (`scope: "all"`) y localizar el título «Panel Email <Cliente>». Si hay un enlace en la petición, usarlo.
3. **Existe → actualizar** (modo B). **No existe → crear** (modo A), y antes confirmar con quien lo pide que es un cliente nuevo.
4. Leer **solo** el fichero de su plataforma: `plataformas/klaviyo.md`, `plataformas/icommkt.md`. Para Connectif y HubSpot todavía no hay fichero: datos a mano (ver modo A).

Lo normal, una vez creados los paneles, es actualizar.

## Criterios comunes (iguales en todas las plataformas)

| Dato | Criterio |
|---|---|
| Campañas B2B / mayoristas | Fuera de todo cálculo (`b2b: true`). Nombre con B2B, BSB, MAYORISTA o [Seguimiento], **o** alguna audiencia, lista o segmento de envío con «MAYORISTA» o «B2B». Mirar siempre las audiencias, no solo el nombre. |
| Ingresos canal email (Shopify) | Atribución **último clic no directo**. Antes de usar el conector de Shopify, `get-shop-info` y confirmar que la tienda es la del cliente; si no, no usar esos datos y dejarlo como dato manual. |
| Venta neta | **Siempre dato manual** que facilita el cliente. |
| BBDD enviamos | Destinatarios de la **última campaña B2C** enviada en el mes. |
| BBDD total, suscritos y activos | El día de la actualización. Cómo se obtienen depende de la plataforma (`plataformas/`). |
| Segmento de envío | Audiencias, listas o segmentos incluidos y excluidos de cada campaña, guardados en `audiences`. |

## Datos del panel

- `config/cliente`: `cliente`, `plataforma` (se muestra en el panel: «Klaviyo», «iCommkt»…), `tienda`, `sociedad`, `conector`, datos propios de la plataforma (por ejemplo `metricaPlacedOrder` en Klaviyo), `flujos` (`id → {name, status}`), `flujosPorCrear`, `estrategia` (`campanas`, `flujos`, `segmentacion`, `captacion`; líneas `título | prioridad | detalle`), `criterios`, `notaFuentes` (texto del pie del panel con las fuentes y criterios de ese cliente).
- `months/<AAAA-MM>`: `key`, `label` («Oct 26»), `shopify {rev, ventaNeta}`, `bbdd {total, activos, suscritos, enviamos}`, `campaigns` (`id, name, date, recipients, or, ctr, ctor, cr, unsub, conv, rev, aov, rpr, b2b, audiences`), `flows` (`id → {r, o, c, p, rev}`), `contexto`, `analisis {resumen, funciono, corregir, acciones, propuestas}`, `fuentes {klaviyo, shopify, bbdd}` (`fuentes.klaviyo` guarda la fuente de la plataforma de email, sea cual sea), `actualizacion {fecha, modo}` (`manual` o `programada`), `updatedAt`.
- Porcentajes como fracción (0,35 = 35 %). Un dato que la plataforma no da se guarda como `null`, nunca como 0. Lectura y escritura con `ArtifactData`, siempre leyendo antes y escribiendo con `if_version`.

## Modo B · Actualizar un mes

1. **Leer primero** `months/<mes>` (si existe) y `config/cliente`. Respetar todo lo escrito por el equipo: contexto, venta neta, ingresos Shopify y valores corregidos a mano. No sobrescribirlos.
2. **Campañas, flujos y BBDD** como indique `plataformas/<plataforma>.md`. Guardar audiencias y marcar B2B.
3. **Shopify** solo si el conector está en la tienda del cliente.
4. **Análisis** con el contexto del mes (modo C) y voz D2C (abajo).
5. Escribir `months/<mes>` con `actualizacion: {fecha: <ahora en ISO>, modo: "manual"}` (o `"programada"` si la lanza la tarea programada) y, si cambia, `config/cliente`.
6. **Versión estática** (modo D) y entregarla.
7. **Resumen** para quien lo pidió: qué se ha cargado, qué falta de dato manual y anomalías (campañas sin audiencia, B2B dudosas, saltos raros).

## Modo A · Crear el panel de un cliente nuevo

Pedir solo lo que falte: nombre, sociedad que factura, plataforma, conector, desde qué mes cargar y, si existe, el panel o la hoja anterior para el histórico.

1. Copiar la carpeta `plantilla/` de esta skill a la carpeta de trabajo (el `Artifact` solo publica ficheros de la carpeta de trabajo o del scratchpad) y ejecutar `node plantilla/nuevo-cliente.js <slug> "<Nombre>"`.
2. Publicar: `Artifact` con `file_path` `<slug>/index.html`, `files` `{"panel.css": ..., "panel.js": ..., "logo_d2c.png": ...}` desde la copia de `plantilla/`, `capabilities: {db: {}, user: {}}`, `icon: "chart"`, y una `description` de una frase.
3. Histórico: del panel anterior si lo hay (cuadrar sus cifras con la plataforma en uno o dos meses antes de cargarlo todo); si no, mes a mes desde la plataforma. Si las respuestas son grandes, delegar en un agente que escriba un JSON y devuelva solo el recuento.
4. Cargar `config/cliente` (con `plataforma`, `conector` y `notaFuentes`) y los meses con `ArtifactData batch` (máximo 50 escrituras por lote).
5. Redactar el análisis del último mes y comprobar con un `list` de `months` usando `as_level: "view"`.
6. Dar el enlace y recordar que es privado hasta que se comparta desde «Compartir».

Plataformas sin conector: mismo panel; los datos del mes se cargan desde la exportación que pase el equipo o a mano en «Editar datos».

## Modo C · Pasar el contexto al análisis

El equipo escribe el contexto en «Análisis y contexto». Al actualizar, o cuando se pida:
- Cada acción del contexto pasa a `analisis.acciones` (lo hecho en negrita y con fecha si se conoce). Comprobar en la plataforma lo verificable (por ejemplo, que un flujo existe y desde cuándo) y decir lo que no se ha podido comprobar.
- Ajustar `resumen` y `corregir` si el contexto explica un dato.
- Actualizar `config.estrategia` y `config.flujosPorCrear` si algo pasa de «por hacer» a «hecho» o «medir».

## Modo D · Versión estática para Google Sites

1. Exportar: `ArtifactData list` de `months` y `get` de `config/cliente`, ambos con el mismo `out_dir`.
2. `node plantilla/build-static.js "<Nombre>" <out_dir> "Panel-Email-<Cliente>-<AAAA-MM>.html"`.
3. Entregar el fichero. Se pega en Google Sites con «Insertar» → «Insertar código». Es una foto fija de ese momento, sin edición; los datos van dentro del código, así que solo para Sites privados.

## Análisis: forma y voz

- `resumen` (un párrafo), `funciono` y `corregir` (3-5 puntos con cifra y comparación con el mes o el año anterior), `acciones`, `propuestas` (`título | cuándo | descripción`, apoyadas en lo que ha funcionado en el histórico).
- Cada punto empieza con la idea en `**negrita**` y sigue con el dato.
- Voz D2C: titulares que afirman, cifras con periodo, sin emojis ni exclamaciones, sin «no es X, es Y». No inventar causas: si un dato no se explica, decirlo y proponer comprobarlo.

## Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.1.0 | 07/11/2026 | Instrucciones por plataforma en `plataformas/` (Klaviyo e iCommkt). El panel muestra la plataforma de cada cliente y el pie de fuentes se configura por cliente (`notaFuentes`). Bloque de versión y autoría. |
| 1.0.0 | 06/11/2026 | Primera versión: panel D2C con base de datos, criterios comunes, actualización mensual, contexto y versión estática. Basada en Klaviyo (Azarey). |

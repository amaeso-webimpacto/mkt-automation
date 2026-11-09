---
name: panel-email-cliente
description: Actualiza cada mes, crea si aún no existe, o exporta en HTML estático el panel de email marketing de un cliente (Klaviyo, iCommkt, Connectif o HubSpot, siempre con tienda Shopify), y pasa el contexto del mes al análisis. Úsala cuando se pida actualizar, crear o revisar el panel o dashboard de email de un cliente, incorporar el contexto del mes, o la versión para Google Sites, aunque no se nombre la skill.
---

# Panel de email marketing por cliente

| Versión | Fecha | Creadora | Contacto |
|---|---|---|---|
| 1.2.0 | 09/11/2026 | Ana I. Maeso | amaeso@webimpacto.es |

Cada cliente tiene un artefacto llamado **«Panel Email <Cliente>»** con la línea gráfica de la sociedad que factura. Hoy solo existe la plantilla de **D2C eCommerce**: si el cliente factura con Webimpacto u otra sociedad, avisar y no continuar sin su plantilla. Los datos viven en la base de datos del artefacto (`db`); el diseño es el mismo para todos y está en `plantilla/` dentro de esta skill.

Una conversación = un cliente. No mezclar datos, conectores ni decisiones de clientes distintos.

**Ficheros de la skill:** este `SKILL.md` (lo común), `plataformas/<plataforma>.md` (cómo sacar los datos de cada plataforma) y `plantilla/` (el panel). **Si falta `plantilla/` o `plataformas/`** (por ejemplo, si se subió solo el `SKILL.md`), no improvisar: obtenerlos del repositorio `amaeso-webimpacto/mkt-automation`, rama `main`, en `.claude/skills/panel-email-cliente/` (con `add_repo` y clonado si hace falta). Si tampoco hay acceso, avisar de que hay que reinstalar la skill con el zip completo.

## Paso 0 · ¿Actualizar o crear?

1. Identificar el cliente, su plataforma y el mes. Si no se dice el mes, es el **mes anterior** al de hoy. No cerrar un mes antes del día que marque la ventana de atribución de su plataforma (ver `plataformas/`); avisar si se pide antes.
2. Buscar su panel: `Artifact` con `action: "list"` (`scope: "all"`) y localizar el título «Panel Email <Cliente>». Si hay un enlace en la petición, usarlo.
3. **Existe → actualizar** (modo B). **No existe → crear** (modo A), y antes confirmar con quien lo pide que es un cliente nuevo.
4. Leer **solo** el fichero de su plataforma: `plataformas/klaviyo.md`, `plataformas/icommkt.md`. Para Connectif y HubSpot todavía no hay fichero: datos a mano (ver modo A).

Lo normal, una vez creados los paneles, es actualizar.

**Listado «Paneles Email»** (https://claude.ai/artifact/Tstgau5tAfbTJ3Fauz7cQc): reúne el enlace de cada panel, su botón «Actualizar» (sesión de Claude Code con esta skill en modo B y el mes elegido), el formulario «Crear panel nuevo» (sesión en modo A) y un aviso por cliente con los datos que hay que meter a mano. Cada sesión trabaja con un solo cliente. El código está en `dashboards/hub/` del repositorio.

## Criterios comunes (iguales en todas las plataformas)

| Dato | Criterio |
|---|---|
| Campañas B2B / mayoristas | Fuera de todo cálculo (`b2b: true`). Nombre con B2B, BSB, MAYORISTA o [Seguimiento], **o** alguna audiencia, lista o segmento de envío con «MAYORISTA» o «B2B». Mirar siempre las audiencias, no solo el nombre. |
| Ingresos canal email (Shopify) | Atribución **último clic no directo**. En clientes iCommkt es la **única** fuente de ingresos del canal (la plataforma no da revenue). Antes de usar el conector de Shopify, `get-shop-info` y confirmar que la tienda es la del cliente; si no, no usar esos datos y dejarlo como dato manual. |
| Venta neta | **Siempre dato manual** que facilita el cliente. |
| BBDD enviamos | Destinatarios de la **última campaña B2C** enviada en el mes. Si se envía por idiomas o segmentos (iCommkt), la **suma** de todas sus versiones. |
| BBDD total, suscritos y activos | El día de la actualización. Cómo se obtienen depende de la plataforma (`plataformas/`): en iCommkt, suscritos = segmento(s) Masterdata_total y activos = contactos activos de iCommkt. |
| Flujos | De la plataforma de email. En clientes iCommkt también salen de Shopify: cargar ambos, con la herramienta en el nombre del flujo. |
| Segmento de envío | Audiencias, listas o segmentos incluidos y excluidos de cada campaña, guardados en `audiences`. |

## Datos del panel

- `config/cliente`: `cliente`, `plataforma` (se muestra en el panel: «Klaviyo», «iCommkt»…), `tienda`, `sociedad`, `conector`, datos propios de la plataforma (por ejemplo `metricaPlacedOrder` en Klaviyo), `flujos` (`id → {name, status}`), `flujosPorCrear`, `estrategia` (`campanas`, `flujos`, `segmentacion`, `captacion`; líneas `título | prioridad | detalle`), `criterios`, `notaFuentes` (texto del pie del panel con las fuentes y criterios de ese cliente).
- `months/<AAAA-MM>`: `key`, `label` («Oct 26»), `shopify {rev, ventaNeta}`, `bbdd {total, activos, suscritos, enviamos}`, `campaigns` (`id, name, date, recipients, or, ctr, ctor, cr, unsub, conv, rev, aov, rpr, b2b, audiences`), `flows` (`id → {r, o, c, p, rev}`), `contexto`, `analisis {resumen, funciono, corregir, acciones, propuestas}`, `fuentes {klaviyo, shopify, bbdd}` (`fuentes.klaviyo` guarda la fuente de la plataforma de email, sea cual sea), `actualizacion {fecha, modo}` (`manual` o `programada`), `updatedAt`.
- Porcentajes como fracción (0,35 = 35 %). Un dato que la plataforma no da se guarda como `null`, nunca como 0: el panel lo muestra como «—» (por ejemplo, el revenue de campañas y flujos en iCommkt). Lectura y escritura con `ArtifactData`, siempre leyendo antes y escribiendo con `if_version`.

## Modo B · Actualizar un mes

1. **Leer primero** `months/<mes>` (si existe) y `config/cliente`. Respetar todo lo escrito por el equipo: contexto, venta neta, ingresos Shopify y valores corregidos a mano. No sobrescribirlos.
2. **Campañas, flujos y BBDD** como indique `plataformas/<plataforma>.md`. Guardar audiencias y marcar B2B.
3. **Shopify** solo si el conector está en la tienda del cliente.
4. **Análisis** con el contexto del mes (modo C) y voz D2C (abajo).
5. Escribir `months/<mes>` con `actualizacion: {fecha: <ahora en ISO>, modo: "manual"}` (o `"programada"` si la lanza la tarea programada) y, si cambia, `config/cliente`.
6. **Versión estática** (modo D) y entregarla.
7. **Resumen** para quien lo pidió: qué se ha cargado, qué falta de dato manual y anomalías (campañas sin audiencia, B2B dudosas, saltos raros).
8. **Si la petición viene del listado «Paneles Email»** (lo indica y trae su enlace), dejar el resultado allí: `ArtifactData update` de `paneles/<id>`, leyendo antes y con `if_version`, con `ultimaActualizacion {fecha, mes, estado, nota}` (`estado`: `ok`, `incompleta` o `error`) y `pendientesManual` (lista `{dato, mes, detalle}` de lo que el equipo tiene que meter a mano en «Editar datos» porque sigue vacío tras la carga: venta neta, ingresos de Shopify si el conector no es de su tienda y lo que su fichero de plataforma marque como manual; `[]` si no falta nada). El listado muestra esa lista como aviso del cliente. Sin cifras ni datos personales: el listado es común a todos los clientes.

## Modo A · Crear el panel de un cliente nuevo

Pedir solo lo que falte: nombre, sociedad que factura, plataforma, conector, desde qué mes cargar y, si existe, el panel o la hoja anterior para el histórico.

1. Copiar la carpeta `plantilla/` de esta skill a la carpeta de trabajo (el `Artifact` solo publica ficheros de la carpeta de trabajo o del scratchpad) y ejecutar `node plantilla/nuevo-cliente.js <slug> "<Nombre>"`.
2. Publicar: `Artifact` con `file_path` `<slug>/index.html`, `files` `{"panel.css": ..., "panel.js": ..., "logo_d2c.png": ...}` desde la copia de `plantilla/`, `capabilities: {db: {}, user: {}}`, `icon: "chart"`, y una `description` de una frase.
3. Histórico: del panel anterior si lo hay (cuadrar sus cifras con la plataforma en uno o dos meses antes de cargarlo todo); si no, mes a mes desde la plataforma. Si las respuestas son grandes, delegar en un agente que escriba un JSON y devuelva solo el recuento.
4. Cargar `config/cliente` (con `plataforma`, `conector` y `notaFuentes`) y los meses con `ArtifactData batch` (máximo 50 escrituras por lote).
5. Redactar el análisis del último mes y comprobar con un `list` de `months` usando `as_level: "view"`.
6. Dar el enlace y recordar que es privado hasta que se comparta desde «Compartir».
7. **Si la petición viene del listado «Paneles Email»**, el cliente ya tiene allí una fila `paneles/nuevo-<slug>` en estado «creando»: actualizarla con `url` (enlace del panel), `estado: "creado"`, `ultimaActualizacion` y `pendientesManual` como en el paso 8 del modo B. Si no se puede crear, `estado: "error"` y el motivo en `ultimaActualizacion.nota`. Si la petición no viene del listado, añadir allí el panel desde «Añadir panel existente».

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
| 1.2.0 | 09/11/2026 | iCommkt verificado en parte con Genuins: newsletter por idiomas como fila del panel, tasas recalculadas desde recuentos, ingresos solo de Shopify, suscritos de Masterdata_total, enviamos como suma de segmentos y flujos de Shopify e iCommkt. El panel trata el revenue `null` como no disponible en lugar de 0 € y deja de afirmar una causa fija en la estacionalidad. |
| 1.1.0 | 07/11/2026 | Instrucciones por plataforma en `plataformas/` (Klaviyo e iCommkt). El panel muestra la plataforma de cada cliente y el pie de fuentes se configura por cliente (`notaFuentes`). Bloque de versión y autoría. |
| 1.0.0 | 06/11/2026 | Primera versión: panel D2C con base de datos, criterios comunes, actualización mensual, contexto y versión estática. Basada en Klaviyo (Azarey). |

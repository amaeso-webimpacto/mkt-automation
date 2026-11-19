# Inventario de oficina

Página móvil para revisar el inventario de la oficina cada 15 días y preparar el correo de pedido a RRHH. Se publica como artefacto de claude.ai: los equipos solo necesitan el enlace del artefacto, no este repositorio.

## Estructura

- `index.html`: marcado de la página, diálogos y plantillas.
- `styles.css`: tokens de la línea gráfica de Webimpacto, claro y oscuro.
- `js/constants.js`: nombres de colecciones, estados y categorías.
- `js/logic.js`: funciones puras (filtros, validación, texto del correo).
- `js/store.js`: acceso a la `db` compartida del artefacto y firma en `localStorage`.
- `js/render.js`: pintado del DOM a partir de plantillas.
- `js/main.js`: estado, eventos e inicio.

## Datos (capability `db`)

- `items/{id}`: `name`, `qty`, `status`, `orderQty`, `orderDate`, `location`, `spare`, `category`, `order`.
- `meta/config`: `hrName`, `hrEmail`, `lastOrder`.
- `meta/review`: `date`, `team`.
- `meta/rotation`: `periods[]` con `from`, `to`, `team`.

Estados: `""`, `por-pedir`, `pedido`, `recibido`, `periodico`.

## Publicación

Publicar `index.html` con `styles.css` y `js/*.js` como archivos del artefacto, con las capabilities `db` y `user`. La carga inicial de datos se hace con la herramienta de datos del artefacto, no desde el código de la página.

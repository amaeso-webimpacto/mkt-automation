# Polin et Moi APP: contexto

Elaborado el 2026-11-25 leyendo la pestaña «Polin et Moi EU» del calendario de comunicaciones, la ficha `LEEME` y la fila de este cliente en `config`. No se han leído correos, Drive, Jira ni Klaviyo. «(deducido)» marca inferencias no comprobadas. No contiene datos de clientes finales ni credenciales.

## Alcance

- Cliente: Polin et Moi, moda y calzado de mujer (deducido de los productos y colecciones enlazados en el calendario). Webimpacto trabaja su APP: análisis de resultados y notificaciones push.
- Sociedad que factura y línea gráfica de cualquier entregable: D2C eCommerce (indicado por el usuario).
- Notificaciones: solo **push**. Las newsletters se leen únicamente como referencia de tono y coherencia, nunca se revisan ni se proponen.
- Mercado: EU, moneda euro (`config`). La tienda web es `polinetmoi.eu` (enlaces del calendario).
- Idiomas del cliente según `config`: ENG, PT, IT y DE. Las newsletters del calendario aparecen en castellano, inglés y alemán (segmentos). El idioma de los push no consta: pendiente de confirmar.
- No se ha verificado que el cliente tenga una APP con push activos: el calendario incluye el bloque PUSH para todos los clientes y aquí está vacío. El alcance «APP y push» lo ha indicado el usuario.

## Qué existe y qué no

| Recurso | Estado |
|---|---|
| Calendario de comunicaciones, pestaña `Polin et Moi EU` (gid 17) | Existe. Sheet `14GhrMSsZPbS_fa9zmvr0WNnieY7NhDhCQJH30weXmzk` |
| Excel de datos (Dashboard) | No existe todavía |
| Artefacto del informe mensual | No existe todavía |
| Oficina de agentes (documento de avisos) | Sin definir: no se escribe |

Cuando se creen el Excel y el artefacto, el usuario dará los enlaces y se añadirán aquí con su estructura verificada.

## Calendario de push (pestaña `Polin et Moi EU`)

- La pestaña tiene 28 filas y 77 columnas: A (bloque), B (concepto), C (quién rellena) y de la D a la BY un día por columna, de la semana 44 (26.10.2026) a la 53 (hasta 03.01.2027). Fechas en la fila 6, meses en la 3 y semanas en la 4. Verificado el 2026-11-25.
- Filas del 2026-11-25: 7 Evento, 8 Acciones, 9 a 19 Campaña (Asunto, Preasunto, Copy, Imagen, Preview, Productos, Material y contexto, Envío, Diseña, Montaje, Estado) y **20 a 28 PUSH**: Temática, Título, Subtítulo, Link, Long. título (≤40), Long. subtít. (≤120), Segmento, Programa, Estado. Las filas están una posición por encima de las del calendario de otros clientes: localizar por la etiqueta de la columna B, no por número.
- Fechas repetidas (segundo envío el mismo día): 08.11, 11.11, 21.11 y 27.11.
- Quién rellena (columna C): Temática y Link, e-commerce; Título, Subtítulo, Segmento y Programa, CRM; Estado, ambos; las filas de longitud son automáticas.
- Estados (`LEEME`): Propuesta, Pendiente material, Pendiente diseño, En diseño, Pendiente maquetar, Pendiente validación, Validada, Pendiente programar, Programada, Enviada, Pospuesta. «Pendiente cambios feedback» y «Revisar productos» solo se usan en el Estado de campaña.
- Normas (`LEEME`): un envío por día y mercado (un segundo, en columna nueva); título corto (unos 30, rojo desde 40); subtítulo de 100 a 120 aproximadamente (rojo desde 120); cada emoji cuenta 2 caracteres; celda vacía significa sin dato.
- Responsable del programa de los push: «Clara o Eva» según `LEEME` (desplegable). En textos que lleguen al cliente, citar el cargo.
- No hay fila de hora para el push: la fila «Envío» es de la newsletter.

### Situación del calendario el 2026-11-25

- **El bloque PUSH está vacío en toda la pestaña** (filas 20 a 28, columnas D a BY, del 26.10 al 03.01). No hay ningún push con temática, título, subtítulo, enlace, segmento, programa ni estado. Verificado leyendo ese rango el 2026-11-25. No consta si es porque aún no se han planificado o porque este cliente no los usa.
- La fila de Acciones del segundo envío del 11.11 dice «SINGLE DAY PUSH» y no tiene entrada en el bloque PUSH.
- Contexto comercial de las semanas siguientes (fila Evento): Black Friday del 18.11 al 29.11 (según lo escrito en la fila Evento), Cyber Monday el 30.11 y «Lanzamiento Herencia e Invierno II» en la fila de acciones del 30.11. Un mes entero de Black Friday sin push planificados es un riesgo a confirmar con el equipo.
- Newsletters con envío en la semana en curso (referencia, no se revisan): 25.11 en estado Programada; 27.11 (dos columnas) sin estado en el primero y Pendiente validación en el segundo; 30.11 Pendiente cambios feedback.

### Códigos promocionales que aparecen en las newsletters del calendario

No hay hoja de configuración de cupones de este cliente. Aparecen ADELANTO15 (-15 % antes del Black Friday), FAVORITOSBLACK (-10 % extra en favoritos, hasta las 23:59 del día de envío) y ENVIOBLACK (envío gratis hasta el 25.11 a las 08:00). Vigencias tomadas del texto de las newsletters, sin confirmar con el cliente. Un push que cite uno de estos códigos debe comprobar su vigencia.

## Tono y estilo de marca (para push)

Deducido de las newsletters del calendario, solo referencia:

- Frases cortas y concretas, centradas en el producto y en el momento de uso («para cualquier plan», «Tie-neck shirts, always a yes»).
- Campaña de Black Friday con idea propia: «romper las reglas» («This year, we've decided to break the Black Friday rules»).
- Asuntos con la marca de la promoción al final: «15% OFF TODAY | BLACK FRIDAY».
- Inglés británico en las newsletters en inglés («Colours of the season»), aunque aparecen también «favorite» y «Don't miss out on your favorite products» en una de ellas: variante sin fijar.
- Los push de este cliente no se han leído porque no hay ninguno en el calendario: el tono de push está sin verificar.

## Decisiones y datos pendientes de aclarar

1. Si Polin et Moi tiene APP con push activos y desde cuándo.
2. Por qué el bloque PUSH está vacío y quién lo rellena (e-commerce da temática y enlace; CRM, título y subtítulo).
3. Idioma de los push (castellano, inglés, alemán u otros) y variante del inglés.
4. Antelación mínima con la que un push debe estar validado y programado.
5. Franja horaria habitual del push.
6. Enlace y estructura del Excel de datos y del artefacto del informe cuando se creen.
7. Si debe haber un aviso en la Oficina de agentes para este cliente y con qué documento.
8. Vigencia de los códigos promocionales y dónde se registran.

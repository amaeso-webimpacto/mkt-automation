# Paloma Barceló APP: contexto

Elaborado el 2026-11-24 leyendo el Excel «Dashboard_APP_Paloma Barceló» y las pestañas «Paloma Barceló EU» y «Paloma Barceló USA» del calendario de comunicaciones. No se han leído correos, Drive ni Jira. «(deducido)» marca inferencias no comprobadas. No contiene datos de clientes finales ni credenciales.

## Alcance

- Cliente: Paloma Barceló, calzado de marca propia. Webimpacto gestiona su APP: análisis de resultados y notificaciones push.
- Sociedad que factura y línea gráfica de cualquier entregable: D2C eCommerce (ficha «Configuración cliente»).
- Notificaciones: solo **push**. Las newsletters las trabaja otro equipo: se leen únicamente como referencia de tono y estilo, nunca se revisan ni se proponen.
- Los pushes salen en dos mercados con calendario propio: EU y USA.
- El Dashboard de resultados cubre **solo España** (ficha «Léeme»: «solo España, abr-2025 a sep-2026»; la pestaña USA no se incluye). Hay un desajuste entre el mercado del calendario (EU y USA, en inglés) y el del Dashboard (España). Pendiente de aclarar con el equipo qué mercados recoge cada cifra.

## Dónde está la información

- Dashboard: Google Sheet `161BTaTm9kIYSGDuIHAAv0Kq-Ru077cnSN6W3PqL0iBM`. Pestañas: `Léeme`, `KPIs mensuales`, `Cupones`, `Notificaciones automáticas`, `Notificaciones regulares`, `Configuración cliente`, `Configuración notificaciones`, `Configuración cupones`, `Alertas`.
- Calendario de comunicaciones: Google Sheet `14GhrMSsZPbS_fa9zmvr0WNnieY7NhDhCQJH30weXmzk`. Pestañas útiles: `LEEME`, `Paloma Barceló EU` (gid 14), `Paloma Barceló USA` (gid 15).
- Las pestañas del Dashboard tienen una fila por cliente y mes. Los meses futuros están creados y vacíos (estado «pendiente») hasta ene-2027.

## Informe mensual (artefacto)

Artefacto «Informe APP Paloma Barceló»: https://claude.ai/artifact/4ReYC3tHELK1FUgM5rcX8p. Línea gráfica D2C eCommerce. Pestañas: KPIs Mensuales, Notificaciones Automáticas, Notificaciones Regulares, Comparación LY y Próximos pasos. Los datos viven en su base de datos (verificado el 2026-11-24 leyendo los documentos de septiembre y octubre de 2026):

- `config/main`: cliente, tienda, sociedad, `cuponBienvenida` (APP5), `excelId`, `excelNombre`, `flujos` (ids `bienvenida`, `recordatorio_1`, `recordatorio_2`, `carrito_1`, `carrito_2`) y `cupones` (APP5, APP15, EXCLUSIVE10, COMEBACK5).
- `meses/AAAA-MM`: `estado`, `kpis` (`dTot` descargas, `xTot` desinstalaciones, `ped`, `fact`, `vn`, `pn`, `vNuevos`, `ph`, `vHab`, `tr`, `ta`, `cw`), `auto.<flujo>` (`env`, `ap`, `ped`, `imp`, `acumEnv`, `acumAp`) y `cupones.<código>` (`p` pedidos, `v` ventas). Significado exacto de `tr`, `ta` y `cw` sin verificar: se deduce de las columnas del Excel (tráfico total, tráfico APP y conversión web).
- `regulares/<id>`: un push regular por documento.
- `textos/AAAA-MM`: los comentarios del informe de ese mes de cierre, con cuatro campos: `conclusiones` (HTML por flujo), `ly` (HTML por mes, acumula los últimos cuatro meses comparables con el año anterior), `mejoras` (lista de `{tag, html}`) y `proximos` (lista de `{t, d, estado}`, que redacta el equipo). El HTML solo admite `b`, `strong`, `i`, `em` y `br`; cualquier otra etiqueta se muestra como texto.
- El botón «Pasar datos al Excel» del artefacto genera un prompt que pasa los datos al Excel y redacta los comentarios. La parte de comentarios es el modo comentarios de este agente; el paso de datos al Excel queda fuera (el agente no escribe en Sheets).

## Cómo está construido el Dashboard

Verificado recalculando con las cifras de oct-2026 y sep-2026:

- Balance = (descargas − desinstalaciones) / desinstalaciones. Oct-2026: (400−132)/132 = 203,0 %.
- Peso venta = Facturación APP / Venta neta del mes. Oct-2026: 22.366,12 / 66.036 = 33,9 %.
- Tasa de conversión = Total pedidos / Tráfico APP. Oct-2026: 131 / 2.133 = 6,14 %.
- % sobre total = Tráfico APP / Tráfico total. Oct-2026: 2.133 / 90.790 = 2,35 %.
- % Nuevos = Pedidos de clientes nuevos / Total pedidos. Oct-2026: 80 / 131 = 61,1 %.
- Open rate de un push regular = Leídas / Enviadas. 02/10/2026: 40 / 1.472 = 2,7 %.
- «Conversión web»: no se ha podido reproducir con las otras columnas. Definición sin verificar.
- Celda vacía = sin dato; 0 = dato cero. Los porcentajes se leen en formato español (coma decimal).
- Las ventas negativas se guardan tal cual en el Excel (hay envíos con ventas día negativas) y el informe las muestra a 0.
- Las columnas Δ (variación mensual y anual) no se guardan: se calculan al analizar.
- La ficha «Configuración cliente» dice último mes cerrado = septiembre 2026, pero `KPIs mensuales` marca octubre 2026 como cerrado y noviembre como pendiente. Manda `KPIs mensuales` (dato más reciente); la ficha está desactualizada.

## Último mes cerrado (octubre 2026), de `KPIs mensuales`

| Métrica | Oct-2026 | Sep-2026 | Ago-2026 |
|---|---|---|---|
| Descargas | 400 | 203 | 181 |
| Desinstalaciones | 132 | 39 | 85 |
| Pedidos APP | 131 | 75 | 45 |
| Facturación APP | 22.366,12 € | 13.226,21 € | 6.344,09 € |
| Venta neta mes | 66.036 € | 45.397 € | 35.585 € |
| Peso venta | 33,9 % | 29,1 % | 17,8 % |

Oct-2026 es el mes con más desinstalaciones (132) de los seis últimos de la serie. No se ha comprobado si se relaciona con el aumento de cadencia de push (10 envíos reales en octubre, según `Notificaciones regulares`).

## Cupones

`Configuración cupones` registra cuatro códigos: APP5 (bienvenida), APP15 (bienvenida histórica), EXCLUSIVE10 (recuperación, Recordatorio 1 y 2) y COMEBACK5 (Carrito abandonado 2).

- Oct-2026: APP15 = 98 pedidos y 16.370,03 € (73,2 % de la Facturación APP); APP5 = 4 pedidos y 826,27 €; EXCLUSIVE10 = 1 pedido; COMEBACK5 = 5 pedidos.
- Sep-2026 está a 0 en todos los cupones (parece un mes sin cargar, según la alerta 7).
- Códigos que aparecen en push o calendario y **no** están en `Configuración cupones`: FW26-20 (push del calendario EU, 13/11, 27/11 y 30/11) y VIP20 (push regulares de dic-2025 y ene-2026). Sus ventas no se pueden medir en la pestaña `Cupones`.
- El push EU del 11/11 recuerda el código APP15, que la ficha marca como histórico a falta de confirmar el cambio a APP5.

## Notificaciones automáticas

Cinco: Bienvenida, Recordatorio 1, Recordatorio 2, Carrito abandonado 1 y Carrito abandonado 2. Textos en `Configuración notificaciones`. Tono teatral en castellano («Se cierra el telón», «Último pase... ¡Y con descuento!»). Oct-2026: ninguna registra pedidos generados.

## Alertas abiertas en el Dashboard (pestaña `Alertas`, 9 el 2026-11-24)

Altas: cupón de bienvenida APP5 frente a APP15 (1), ventas de APP15 superiores a la Facturación APP en 2025 (2) y APP15 a 0 en sep-2026 y de vuelta en oct-2026 (7). Medias: descargas sin desglose iOS/Google (3), Recordatorio 2 de nov-2025 a ene-2026 (4), tráfico total anómalo en abr, jun y ago de 2026 (5), envíos incoherentes de los cuatro flujos en oct-2026 (8). Bajas: filas de 2025 con columnas desplazadas (6) y datos de oct-2026 intercambiados y corregidos (9). Releer la pestaña cada vez: puede haber cambiado.

## Calendario de push (EU y USA)

- Cada pestaña tiene una columna por día, de la semana 44 (26.10.2026) a la 53 (03.01.2027). Fechas en la fila 6.
- Filas de PUSH: 21 Temática, 22 Título, 23 Subtítulo, 24 Link, 25 Long. título (≤40), 26 Long. subtít. (≤120), 27 Segmento, 28 Programa, 29 Estado. Verificado el 2026-11-24.
- **Las columnas no coinciden entre pestañas.** USA tiene una columna extra («13.11» dos veces, para un segundo envío el mismo día). Localizar siempre por la fecha de la fila 6 y por la posición de la fila, no por letra de columna.
- No hay fila de hora para el push: la hora del envío no consta en el calendario. La fila «Envío» (hora y configuración) es de la newsletter.
- Responsables del programa: «Clara o Eva» (desplegable). En textos que lleguen al cliente, citar el cargo.
- Estados: Propuesta, Pendiente material, Pendiente diseño, En diseño, Pendiente maquetar, Pendiente validación, Validada, Pendiente programar, Programada, Enviada, Pospuesta.
- Normas del calendario: un envío por día y mercado (si hace falta un segundo, columna nueva); título corto (unos 30, rojo desde 40); subtítulo entre 100 y 120 aprox. (rojo desde 120); cada emoji cuenta 2 caracteres.

### Situación del calendario el 2026-11-24

- EU: 15 push planificados del 27.10 al 03.12. Enviados hasta el 23.11. El del 25.11 («The shades of FW26») está Programada; 27.11, 30.11 y 03.12 en Propuesta (los de 27.11 y 30.11 recuerdan el 20 % con código FW26-20, «vigencia por confirmar» según las acciones del calendario). El del 03.11 sigue en «Pendiente validación», sin segmento ni responsable de programación, con fecha ya pasada. El del 11.11 figura Enviada pero sin segmento.
- USA: mismos temas y títulos de las fechas comunes, con estas diferencias verificadas: Segmento vacío en toda la fila; Programa solo en 27.10 y 30.10; Estado solo hasta 06.11 (27.10 Enviada, 30.10 Programada, 03.11 y 06.11 Pendiente validación, las tres últimas con fecha pasada); sin título ni subtítulo en las fechas 11.11, 13.11 (segunda columna), 27.11 y 30.11, que sí tienen temática; el push del 25.11 («The shades of FW26») figura sin estado ni segmento.
- Enlaces: en USA, los push del 27.10, 30.10 y 03.11 apuntan a `www.palomabarcelo.com/es/...` (tienda de España) y el resto a `palomabarcelo.us`. Los push EU, en inglés, apuntan a `palomabarcelo.com/es/...`: no se ha verificado si esa ruta es la de la tienda EU.
- Temática y copy: el push EU del 11.11 tiene temática «SNEAKERS FW26» y copy de recordatorio del cupón APP15.
- Dos push regulares de octubre (06/10 y 09/10) enlazan a `palomitasshoes.com` en lugar de `palomabarcelo.com`.

## Tono y estilo de marca (para push)

Deducido de los push enviados y las notificaciones automáticas:

- Frases cortas y concretas: producto, material, hecho en España. Lema recurrente: «sin complicaciones» («no complications», «zero fuss» en USA).
- Título: nombre del modelo o la acción en una frase, con un solo emoji al final o ninguno. Ejemplos de la hoja: «Meet Ziva | SNEAKERS», «Ankle boots, sorted».
- Subtítulo: material y beneficio en una o dos frases, con llamada a la acción sencilla («Find your pair»).
- Inglés británico en EU («favourite», «shades») y americano en USA («favorite», «colors», «closet»).
- Newsletters (solo referencia): mayúsculas en el lema («NO DECISIONS. NO COMPLICATIONS»), tono directo y seguro.

## Decisiones y datos pendientes de aclarar

1. Qué mercados recoge cada cifra del Dashboard (solo España frente a EU y USA).
2. Antelación mínima con la que un push debe estar validado y programado.
3. Franja horaria habitual del push (el calendario no la recoge).
4. Código de bienvenida vigente y fecha del cambio de APP15 a APP5.
5. Vigencia del código FW26-20 y si debe darse de alta en `Configuración cupones`.
6. Resuelta (2026-11-24): el aviso de push se deja también en la Oficina de agentes, en el documento `avisos/kevin`.
7. Ruta correcta de la tienda EU para los enlaces de los push en inglés.

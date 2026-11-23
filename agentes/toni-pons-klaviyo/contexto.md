# Toni Pons: contexto de la cuenta de Klaviyo

Elaborado el 2026-11-16 a partir de 159 hilos de correo con personas de @tonipons.com (2025-01-22 a 2026-11-06) y de los asuntos de 1.372 envíos de la propia marca a direcciones de prueba (2025-01-27 a 2026-11-13). No se abrieron adjuntos ni enlaces. «(deducido)» marca inferencias. No contiene datos de clientes finales ni credenciales.

Actualizado el 2026-11-19 con el análisis de ingresos de email de julio a octubre de 2026, el análisis de asignación de idioma en las listas y el estado de los flujos de la propiedad de idioma. Esas secciones se verificaron en Klaviyo el 2026-11-19, salvo donde se indique que la cifra procede de un documento de Drive.

## Quién es quién

- Cliente: calzado de marca propia, unas 20 tiendas en España y Portugal y ecommerce en Shopify (migrado desde Magento; la web nueva salió el 2025-03-26). Idiomas y mercados: ES, CAT, FR, IT y EN (EU, UK, DE, INT, USA), además de ES_INT y ES_US.
- Roles del cliente: especialista de marketing (contacto diario; prepara y envía las campañas con enlaces), dirección de marketing (estrategia y presupuesto) y dirección de negocio online.
- Webimpacto: Marketing Automation (ejecuta en Klaviyo), Head de Marketing Automation, Head of Growth, analista y account manager de paid media.
- Otra agencia (Rocket) mantiene el tema de Shopify. Webimpacto no tiene acceso a su repositorio, ni al DNS, ni a Typeform, ni a la cuenta de Facebook del cliente.
- Reunión mensual de resultados: segundo miércoles de mes a las 11:00 (acordada el 2026-10-28). Los datos de atribución no se asientan antes del día 5.
- Informe al cliente: dashboard en Google Sites más PDF. Looker Studio no funcionó en 2025-09.
- Objetivos: la propuesta 2026 se presentó el 2025-12-04. La pestaña OBJETIVOS 2026 del Excel de KPIs es propuesta de Webimpacto, no validada por el cliente. A 2026-11-19 no hay objetivos 2026 acordados, así que los resultados se comparan con el año anterior y no con una meta.
- Campañas comerciales: el cliente decide y prepara sus campañas y promociones (Black Friday incluido). Webimpacto no interviene en ellas: las analiza, no las planifica.

## Dónde está la información

- Carpeta de Drive del cliente: `1dmncKGV4ww2js0h7gqEwKKkdbz7V06k3`. Contiene el Excel de KPIs mensuales, el documento de reuniones, la estrategia de marketing automation (2026-02-26), el análisis del flujo de carrito abandonado (agosto a octubre de 2026), la auditoría de Shopify tags (2026-09-29), los resultados de flujos, el reporte de lead gen, los objetivos fijados por el cliente para 2025, el diseño de los flujos de wishlist y el histórico del agente.
- Excel de KPIs mensuales: `1YEDgcSKenhOIjCr75SdozBg2JpnDACjvYhtT7UsTpt0`. Pestañas útiles: KPIs Klaviyo, Comparación 2025, TO DO's (flujos previstos con fase, prioridad, estado y estrategia), Suscritos growth, Listas Suscritos, NPS y una pestaña de flujos por mercado.
- Artefacto «Dashboard Toni Pons» (https://claude.ai/artifact/DSCwxDkuchsVPc4uV5osqw): reporte mensual al cliente con las pestañas KPIs, NPS y Back in Stock. Sus límites de salud del canal son bounce por debajo de 1,00 %, spam por debajo de 0,01 % y bajas por debajo de 0,30 %.
- Jira, proyecto `TP`: el trabajo de Webimpacto va en el componente «Mkt Automation» (tarea mensual «MKT Automation - AAAA»). Otros componentes: Consultoría & QA, Paid y Mantenimiento y soporte. Las incidencias de Shopify (formularios de leads, Back in Stock, wishlist) también se siguen ahí.
- Migración de ERP del cliente prevista para enero de 2027 (épica de Jira de revisión de la tienda). No se ha verificado si afecta a eventos o datos de Klaviyo.

## Estructura de la cuenta

- Cuenta principal de Klaviyo (ES/UE). La cuenta de USA se migró a la principal en mayo de 2025, con reporting separado.
- Listas «Clients web» por idioma y país (es-es, ca-es, fr-fr, it-it, en-eu, en-uk, en-de, en-int, en-us, es-int, es-us) y segmentos «LEADS TIENDAS» por mercado.
- El idioma y el país se asignan con flujos que leen los Shopify tags (idioma y país) con el locale de reserva. Es la mayor fuente histórica de incidencias.
- Idioma y país no son dos tags: son un único token «idioma-PAÍS» (es-ES, fr-FR, en-GB…) dentro de la propiedad de perfil `Shopify Tags`, que es un array. Conviven con otros tags que no cuentan (backInStock, newsletter, `language:xx`, intereses). «Tag de idioma ausente» y «tag de país ausente» no se pueden medir por separado.
- Flujos de asignación (ambos LIVE, verificados el 2026-11-19): `WnkyVY` «Dividir usuarios por idioma_shopify tags» (editado 2026-10-16) y `RRCnJR` «…tags v5» (editado 2026-10-21). Las versiones v2, v3 y v4 están en borrador. `WnkyVY` se dispara al entrar en la lista `SgctG8` «Usuarios y Clientes Shopify sin filtrar país/idioma» (63.355 perfiles), espera 5 minutos y, si el perfil ya está en alguna de las 18 listas de mercado, sale sin reasignarlo. Si no, aplica una cascada «Shopify Tags contiene X O $locale igual a X» y añade a la lista del mercado. Lo que no encaja va a la lista `XuwPUT` «Contactos sin país/idioma» (222 perfiles), que dispara `RRCnJR` con el mismo reparto y sin delay.
- Ids de las listas «Clients web»: ES_ES `Xxci7N`, CA_ES `TGsL4E`, FR_FR `TWkx6Q`, IT_IT `Sx3VaN`, EN_EU `SLVGcY`, EN_UK `RsgkCk`, EN_DE `Xsz3Lq`, EN_INT `Xhix5C`, EN_USA `XXYvRp`, ES_INT `UDYQ4R`, ES_US `RU2Syb`. Otras listas de mercado que alimentan los flujos: EN_ES `W7TGbL`, EN_PT `VRPMNG`, EN_SE `RsFtjN`, FR_EU `QSgEU4`, FR_INT `YadkJr` y una segunda lista llamada FR_FR (`VXxiai`) que conviene comprobar.
- Ningún flujo alimenta ES_US: el flujo manda los es-US a ES_INT. ES_US tiene 14 miembros.
- Typeform recoge los leads de cada tienda física (un formulario por tienda). Meta Ads y Google Ads aportan leads de captación. Swym aparece en las métricas de Klaviyo, pero no en los correos.
- Facturación por perfiles activos. Los perfiles «never subscribed» que llegan a checkout y desmarcan la suscripción cuentan en la factura. El segmento de supresión de «never subscribed» tenía 9.608 perfiles en 2026-06.

## Reglas del cliente que el agente debe respetar

1. Solo lectura. El cliente reclamó en 2026-07 que no aprobó una limpieza de inactivos, y exige validar cualquier acción estructural antes de ejecutarla.
2. Congelar cambios mientras haya una incidencia abierta hasta decidir cómo proceder.
3. No usar el locale nativo de Klaviyo como criterio de idioma o país: lo considera poco fiable. Sí la combinación idioma-país de los Shopify tags.
4. No proponer limpiar la base solo por evitar una subida de precio. Quiere que la base crezca en calidad y volumen, aunque suba el plan. Prefiere limpiezas pequeñas y periódicas, suprimir antes que borrar, y filtros prudentes: al menos 20 emails recibidos sin apertura (acordado en 2025) y mínimo 90 días de antigüedad (2026-06).
5. Mantener separadas las bases: UK distinta de EU, y USA con reporting propio. No agrupar idiomas en un mismo flujo mientras la redirección por país no esté optimizada (2025-12).
6. Sin flujos duplicados: borrar el antiguo cuando el nuevo lo cubre. El cliente pidió confirmar qué borradores conservar (2026-02) y sigue pendiente de respuesta.
7. Un error visible para la dirección es crítico (por ejemplo, un welcome de tienda vacío recibido por el CEO el 2025-10-07).
8. Cada enlace de un flujo debe llevar el slug de su mercado. El bloque «Te recomendamos» es estático en los mercados no ES y dinámico (alpargatas best seller) en ES.
9. Diseño: cabecera de 300 px máximo por Outlook, botones con borde blanco en dark mode, footer con bloque universal en todos los flujos y alt text en todas las imágenes.
10. Los mensajes a clientes que ya compraron solo pueden tratar de la compra.

## Fuentes de KPI acordadas con el cliente

- Base total: Analytics > Dashboards > Subscriber Growth.
- Leads netos de tienda y de web: pestaña del dashboard mensual o growth de cada lista.
- Contactos brutos: Metrics > Subscribed to List, un segmento o la diferencia mensual de All profiles.
- El recuento de suscritos por consulta analítica (109.362 el 2026-11-16) no es la misma fuente que Subscriber Growth. La diferencia está por verificar.
- Ventana de atribución: en 2025-04 la cuenta principal usaba 3 días tras apertura y clic en email, y la de USA, 5 días tras clic. El cliente propuso 5 días tras clic y 1 tras visualización. Según Webimpacto (2026-11-19), la atribución actual es de 5 días tras apertura o clic en el correo. No está comprobada en la configuración de Klaviyo.

## Entregabilidad y riesgo de cuenta

- 2025-08-13: pago fallido, con 72 h para evitar suspensión (resuelto el 14).
- 2025-09-14/15: Klaviyo deshabilitó la cuenta sin aviso previo. Se reactivó el día 15 tras un ticket. Klaviyo exigió suprimir un segmento «Never Engaged» y el cliente subió el mínimo de 5 a 15 emails. El cliente dijo pagar más de 1.500 USD al mes y amenazó con cambiar de herramienta.
- Cifras citadas en 2025-09: spam 0,02 % (recomendado, según el cliente, 0,01 %), baja 0,31 %, apertura 31,6 %. El 2025-09-17: rebote 0,577 % (media 0,489 %), baja 0,36 % y spam 0,017 % (media 0,00689 %).
- Medidas acordadas: métricas de entregabilidad en el informe mensual, limpieza mensual de bajas y rebotes, segmento «No abridores últimos 6 meses» (22.457 perfiles, excluidos de campañas) y SPF, DKIM y DMARC validados.
- Plan de perfiles: avisos del 75 % (2025-08-14) y del 100 % (2025-09-01 y 2026-09-04). Klaviyo sube automáticamente al tramo de 125.000 perfiles en el siguiente cobro. El ciclo de facturación actual va del día 13 de un mes al 13 del siguiente. A 2026-11-19: 121.049 de 125.000 perfiles activos (96,8 %) y 298.083 de 1.250.000 envíos del ciclo 2026-11-13 a 2026-12-13.
- Spam de campañas por encima del límite acordado del 0,01 %: 0,016 % en jul-oct de 2026 (0,028 % en 2025). Mejora, pero sigue fuera del criterio.

## Incidencias abiertas (a 2026-11-16 según el último correo de cada hilo; revisadas en Klaviyo el 2026-11-19 donde se indica)

- Shopify tags y locale: los formularios de newsletter, Back in Stock y el formulario nativo dejaron de guardar los tags (2026-09-23). La auditoría de Webimpacto (2026-10-01) apunta a retraso en la asignación del tag. Se propuso un delay de 5 min en el inicio del flujo, y el cliente lo aceptó. Los flujos de welcome están LIVE (comprobado el 2026-11-16, tras pausarse el 2026-09-23); el welcome ES no se interrumpió ese día. El delay de 5 min ya está implementado en `WnkyVY` (verificado el 2026-11-19; no consta desde cuándo). No consta la respuesta de Klaviyo al caso abierto. Las cifras «más de 1.200 suscritos fuera de las bases» y «más de 800 sin país o idioma» no se reproducen con las definiciones del análisis de 2026-11-19 (ver «Asignación de idioma en listas»).
- Evento Merged Profile: pausa 30 min los disparadores de flujos del perfil (unos 500 usuarios). Solución propuesta: un flujo paralelo con delay de 30 min. Sin cambios a 2026-11-19: ningún flujo se dispara con la métrica Merged Profile (`UJEivQ`) y las variantes «merged profiles» están en borrador desde 2026-04-30.
- Agosto de 2026: caída del 17 % en impactos con la base creciendo, confirmada el 2026-11-19 (784.521 en agosto de 2025 frente a 650.541). Webimpacto prometió auditar los envíos y los flujos «en las próximas semanas». El análisis de ingresos está en «Ingresos de email de julio a octubre de 2026». La causa de las audiencias más pequeñas en las campañas de agosto no está verificada.
- Carrito abandonado: envía un 62 % menos y es el mayor efecto en la bajada de ingresos. Ver la sección de ingresos. Pendiente de decidir con el cliente cómo cubrir a quienes abandonan sin lista de mercado.
- Inicio de pago duplicado: desde julio de 2026 la relación eventos/personas únicas de Started Checkout pasa de 1,1 a 1,69 en octubre. No se sabe si el origen es Shopify, la integración o el tema.
- Back in Stock: al cerrar el popup se suscribe el SKU equivocado, y un modelo con stock aparece como pendiente en la cola (petición del CEO). El flujo ingresa un 63 % menos que en 2025 con más altas; la causa no está establecida y no se ha demostrado relación con esta incidencia.
- Dos flujos de asignación de idioma LIVE (`WnkyVY` y `RRCnJR`): falta confirmar con el cliente cuál es el de producción y que no se solapen. Ambos usan el locale como alternativa, lo que contradice la regla 3 del cliente. No se tocan sin su validación.
- Meta Ads: Klaviyo perdió la autorización (2026-10-22). Pendiente de reautenticar desde Klaviyo y de refrescar la integración con Shopify.
- Wishlist: estructura de flujos montada (hay cuatro en borrador) y a la espera de los diseños de las newsletters del cliente.
- Predicción de compra: se activa solo para ES y se seguirán los resultados antes de extender. No consta activación.
- Tiendas nuevas: Madrid Toledo (2026-09-24) y Barcelona Portaferrissa. No consta confirmación de los flujos activos.
- Listas «Clients WEB» con perfiles sin consentimiento: el cliente preguntó si Klaviyo los cuenta como activos y si conviene quitarlos. Sin respuesta. A 2026-11-19 hay 4.695 nunca suscritos y 13.839 bajas entre las pertenencias a las 11 listas de idioma, y 72.919 nunca suscritos fuera de toda lista de mercado (recuentos, sin perfiles).
- Clave de API MAGENTO2 de 2022 desactivada por inactividad el 2026-10-13 (sin efecto).
- WhatsApp: requiere opt-in explícito por canal y tiene coste (800 a 2.100 USD por envío promocional a 10.000 suscritos, según Klaviyo). RFM de pago como alternativa. No consta decisión.
- Informe de leads: el cliente no entiende el ticket medio, y quiere medir las ventas de los leads. Klaviyo confirmó que un segmento no exporta compras.
- Formularios de Typeform: falta confirmar que todos estén conectados a la lista de su mercado.
- Traducciones automáticas e idioma: ver «Propiedad de idioma y traducciones automáticas».

## Ingresos de email de julio a octubre de 2026 frente a 2025 (verificado el 2026-11-19)

Ingresos atribuidos de campañas más flujos, con la métrica Placed Order de Shopify (`Ut5CZR`), canal email y por mes de envío. Octubre de 2025 (45.558 €) coincide con la hoja KPIs Klaviyo.

- La bajada está en los flujos. Total email: 260.277 € frente a 262.341 € (-0,8 %). Por mes: julio +1,4 %, agosto -21,3 %, septiembre +9,6 % y octubre +17,3 %. Campañas: 145.415 € frente a 126.559 € (+14,9 %). Flujos: 114.862 € frente a 135.782 € (-20.920 €, -15,4 %).
- Carrito abandonado: -16.490 € (-46 %), con un 62 % menos de envíos (10.545 a 4.018) y un 42 % más de ingreso por envío. Back in Stock: -9.734 € (-63 %). Recuperación de clientes: -2.221 €. El resto de flujos suma +7.525 €. Por mercado, ES -10.315 €, FR -7.380 € y EU/UK/DE -5.133 €.
- Carrito, causa: no es menos tráfico (personas con Started Checkout: 12.579 a 16.605, +32 %) ni cambios recientes (el flujo ES no se edita desde 2026-02-26). El flujo exige estar en la lista de su mercado. El análisis interno del 2026-11-05 en Drive indica que en 2025 el 28 % de quienes recibían el email estaba fuera de lista (51 % en EU) y en 2026, el 3 %, y que las altas de marzo a junio fueron 79.724 en 2025 y 22.732 en 2026. Esas cifras no se han reproducido. Hay unas 2.100 personas que abandonan en ago-oct sin lista ni consentimiento y no reciben el email. No se ha comprobado la configuración anterior ni la fecha exacta del cambio.
- Back in Stock: las altas suben un 34 % (3.696 a 4.944), los envíos bajan un 39 % y el ingreso por envío baja de 3,40 € a 2,09 €. Causa no establecida. Hipótesis sin comprobar: el popup que suscribe el SKU equivocado, menos disparos por reposición o el modelo con stock en cola.
- Agosto: -14.488 € en total (flujos -10.252 €, campañas -4.236 €). Mismo número de campañas con un 19 % menos de destinatarios por campaña.
- Open rate de flujos: 42,9 % frente a 51,1 %, con CTR estable. Causa no comprobada. Welcome ES: 21.147 envíos en julio de 2026 frente a 8.418, con ingreso similar; sin explicar.
- Tasas de campañas jul-oct 2026 frente a 2025: apertura 38,8 % frente a 38,4 %, CTR 2,73 % frente a 2,94 %, rebote 0,47 % frente a 0,57 %, bajas 0,23 % frente a 0,34 %.
- Los ingresos de flujos son por mes de envío, no de pedido: por eso el carrito de 35.973 € difiere de los 36.537 € del análisis de Drive, que usa fecha de pedido.

## Asignación de idioma en listas (verificado el 2026-11-19, solo recuentos)

Criterio de «bien asignado»: la combinación idioma-país de los Shopify tags, sin usar el locale. El análisis cubre las 11 listas de idioma.

- 137.305 pertenencias. 104.808 (76 %) no tienen ningún Shopify tag y no se pueden validar. Entre los 23.468 comprobables, 21.904 están bien (93,3 %) y 1.564 mal. Hay 9.028 perfiles con tags pero sin token idioma-país, que no cuentan como mal.
- Acierto por debajo del 90 %: es-int 12,6 %, en-int 67,7 %, en-eu unos 74 % y en-us 85,6 %. El resto de listas está entre el 90 % y el 98 %.
- Causas de los 1.564 mal asignados: 1.062 con un único token que apunta a otra lista (exacto), unos 488 con tokens contradictorios (aproximado) y 14 con dos tokens coherentes entre sí pero de otra lista. Hay además 85 perfiles en más de una lista de mercado (80 suscritos).
- Hipótesis sobre el origen, no verificada: el flujo no reasigna a quien ya está en una lista, así que una asignación temprana por locale o antes de que llegue el tag no se corrige. Encaja con es-int (294 de 341 perfiles con un único token son en-US o en-GB).
- Suscritos elegibles (consentimiento suscrito y apto para marketing): 109.251, de los que 101.514 están en alguna de las 18 listas de mercado y 7.737 fuera de todas. De esos 7.737, 7.565 no tienen ningún tag y solo 29 se pueden asignar con certeza. El 97 % no está en las listas que disparan los flujos de reparto. Dentro de las listas, 83.205 elegibles (82 %) no tienen token.
- Fuera de toda lista y sin consentimiento: 72.919 nunca suscritos, 17.393 bajas y 9.983 suscritos que no pueden recibir marketing.
- Límites: no se ha comprobado ningún perfil concreto, así que no se sabe por qué vía entró cada mal asignado. Los 118.736 miembros con consentimiento suscrito en las 11 listas no cuadran con los 101.514 elegibles en las 18; la diferencia, unos 17.000, parece de suscritos no aptos para marketing, sin desglosar. Las contradicciones son una aproximación por pares de tokens.

## Propiedad de idioma y traducciones automáticas (estado a 2026-11-19)

- A 2026-11-19 no hay ninguna traducción creada en la cuenta.
- Según la ayuda de Klaviyo (fuentes secundarias; no se pudo abrir la página oficial), Smart Translations lee una propiedad de perfil para elegir el idioma del destinatario. Por defecto es Locale, se puede elegir otra propiedad y, si está vacía, recurre a Locale mediante una casilla activada por defecto. Recomienda códigos BCP-47. Sin verificar en la cuenta.
- Plan propuesto, a validar con el cliente: una propiedad `idioma` con códigos de idioma sin país (`es`, `ca`, `fr`, `it`, `en`), desactivar el recurso a Locale, fijar un idioma de reserva en cada mensaje y hacer un piloto en un mercado pequeño con perfiles de prueba.
- Flujos creados por Webimpacto el 2026-11-19, en borrador y sin activar ni validar con el cliente:
  - `StEvTZ` «Dividir usuarios por idioma_shopify tags - existentes - solo propiedad (borrador)»: delay de 5 min, los 16 condicionales de `WnkyVY` con sus mismas condiciones (incluido el locale) y, en cada rama «sí», una actualización de `properties['idioma']` con operación create. No tiene ningún list-update. Conserva el disparador de `WnkyVY` (lista `SgctG8`), que hay que cambiar para usarlo con perfiles existentes.
  - `RdnEJk`: primer borrador con los 33 nodos list-update. Obsoleto y sin uso; el borrado está pendiente de confirmar.
- El valor de `idioma` sale de la rama, es decir, de la lista, y no del token. En ramas mixtas (en-FR a FR_FR, en-IT o it-ES a IT_IT, es-US a ES_INT) un perfil con token inglés recibiría `fr`, `it` o `es`.
- Sin verificar: cómo se comporta la operación create en perfiles que ya tienen `idioma`, y cómo ejecutar un flujo sobre perfiles que ya estaban en una lista o segmento al activarlo.
- Los 104.808 perfiles sin tag no tienen idioma que derivar. Hay que acordar con el cliente si se asigna provisionalmente por lista, se reconstruyen los tags desde Shopify o quedan con el idioma de reserva.
- Crear o activar flujos de idioma exige validación del cliente y congelar cambios mientras la incidencia de Shopify tags siga abierta. El agente no crea ni edita flujos: solo lectura.

## Calendario comercial observado

- Rebajas de invierno: finales de febrero (2025), y en 2026 anticipadas del 2026-01-02 al 2026-02-09 con segundas rebajas el 01-20.
- Rebajas de verano: ventas privadas en julio, 30 % en la segunda unidad desde mediados de julio y segundas rebajas a finales de julio.
- Friends & Family: solo el 2026-08-28, 20 % en todo el catálogo.
- Nueva colección AW el 1 de septiembre y SS a mediados de febrero. Cada una obliga a cambiar las creatividades de todos los flujos.
- Black Week 2025: del 11-24 al 11-30, con Cyber Monday el 12-01 (hasta 30 %). En 2026, a 11-16, aún no hay Black Week.
- Slippers Week: primera semana de noviembre (2025-11-03 y 2026-11-02, con recordatorio y «last call»).
- Sample Market (acceso anticipado para la comunidad): 2025-11-14/19, 2026-03-22/25 y 2026-11-12/13 (hasta 50 %).
- Fechas fijas: 8 de marzo, Sant Jordi (22 de abril), Temps de Flors en Girona (mediados de mayo), 5 de junio, 19 de octubre (donación contra el cáncer de mama) y Snoopy (septiembre y diciembre).
- Regalos con la compra: fular, bolsa de yute, alpargatas y kit de limpieza, normalmente por compras de más de 99 €.

## Patrones de error vistos en los envíos de la marca (por asunto)

- Variable de nombre sin sustituir o mal formateada: asunto con el correo en lugar del nombre, nombre en minúscula o con apellido.
- Asunto «Tu pedido» sin número (variable no sustituida).
- Mezcla de idiomas o texto residual: asunto italiano con «o stock», asunto español con «llas especiales», catalán sin traducir.
- Importes inconsistentes entre idiomas (el asunto en inglés de 2025-12-09 hablaba de 69 USD frente a 29,95 € en el resto).
- Los asuntos de prueba con sufijo numérico («...?2» a «...?6») son pruebas, no errores de producción.
- Desde 2026 los envíos a pruebas son casi solo ES y EN (deducido; puede ser efecto de las pruebas).

## Lagunas

- No se abrieron los PDF de resultados mensuales, los Excel, el audit de suscripciones ni las capturas.
- No constan: el plan exacto de Klaviyo, la configuración actual de atribución, Black Friday 2026, ni lo ocurrido después de 2026-11-06.
- No medido en el análisis de ingresos: enero a junio de 2026, noviembre de 2026, Meta Ads, Typeform, WhatsApp, la clave de API de 2022 ni el DNS fuera de Klaviyo. No se consultó Jira ni se abrieron adjuntos.
- `resumir_informe.py` falla con informes de flujos que traen flujos sin detalle (3 en agosto y septiembre de 2025). Conviene corregirlo antes de reutilizarlo con esos periodos.

## Seguridad

- Un correo del 2025-01-29 contiene un usuario y una contraseña de Klaviyo en texto plano. Hay que pedir al cliente que rote esa credencial. No se reproduce aquí.
- Varios hilos incluyen exportaciones de leads con datos personales. El agente no debe abrirlos.

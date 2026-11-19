# Toni Pons: contexto de la cuenta de Klaviyo

Elaborado el 2026-11-16 a partir de 159 hilos de correo con personas de @tonipons.com (2025-01-22 a 2026-11-06) y de los asuntos de 1.372 envíos de la propia marca a direcciones de prueba (2025-01-27 a 2026-11-13). No se abrieron adjuntos ni enlaces. «(deducido)» marca inferencias. No contiene datos de clientes finales ni credenciales.

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
- Plan de perfiles: avisos del 75 % (2025-08-14) y del 100 % (2025-09-01 y 2026-09-04). Klaviyo sube automáticamente al tramo de 125.000 perfiles en el siguiente cobro. El ciclo de facturación actual va del día 13 de un mes al 13 del siguiente.

## Incidencias abiertas a 2026-11-16 (según el último correo de cada hilo)

- Shopify tags y locale: los formularios de newsletter, Back in Stock y el formulario nativo dejaron de guardar los tags (2026-09-23). Hay más de 1.200 suscritos fuera de las bases y más de 800 sin país o idioma. La auditoría de Webimpacto (2026-10-01) apunta a retraso en la asignación del tag. Se propuso un delay de 5 min en el inicio del flujo, y el cliente lo aceptó. Los flujos de welcome están LIVE (comprobado en Klaviyo el 2026-11-16, tras pausarse el 2026-09-23). No consta que el delay esté implementado ni la respuesta de Klaviyo al caso abierto.
- Evento Merged Profile: pausa 30 min los disparadores de flujos del perfil (unos 500 usuarios). Solución propuesta: un flujo paralelo con delay de 30 min. No consta implementación.
- Agosto de 2026: caída del 17 % en impactos con la base creciendo. Webimpacto prometió auditar los envíos y los flujos «en las próximas semanas». No consta conclusión.
- Back in Stock: al cerrar el popup se suscribe el SKU equivocado, y un modelo con stock aparece como pendiente en la cola (petición del CEO).
- Meta Ads: Klaviyo perdió la autorización (2026-10-22). Pendiente de reautenticar desde Klaviyo y de refrescar la integración con Shopify.
- Wishlist: estructura de flujos montada (hay cuatro en borrador) y a la espera de los diseños de las newsletters del cliente.
- Predicción de compra: se activa solo para ES y se seguirán los resultados antes de extender. No consta activación.
- Tiendas nuevas: Madrid Toledo (2026-09-24) y Barcelona Portaferrissa. No consta confirmación de los flujos activos.
- Listas «Clients WEB» con perfiles sin consentimiento: el cliente preguntó si Klaviyo los cuenta como activos y si conviene quitarlos. Sin respuesta.
- Clave de API MAGENTO2 de 2022 desactivada por inactividad el 2026-10-13 (sin efecto).
- WhatsApp: requiere opt-in explícito por canal y tiene coste (800 a 2.100 USD por envío promocional a 10.000 suscritos, según Klaviyo). RFM de pago como alternativa. No consta decisión.
- Informe de leads: el cliente no entiende el ticket medio, y quiere medir las ventas de los leads. Klaviyo confirmó que un segmento no exporta compras.
- Formularios de Typeform: falta confirmar que todos estén conectados a la lista de su mercado.

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

## Seguridad

- Un correo del 2025-01-29 contiene un usuario y una contraseña de Klaviyo en texto plano. Hay que pedir al cliente que rote esa credencial. No se reproduce aquí.
- Varios hilos incluyen exportaciones de leads con datos personales. El agente no debe abrirlos.

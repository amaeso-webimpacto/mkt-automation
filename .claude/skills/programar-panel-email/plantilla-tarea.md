Actualización mensual programada del panel de email marketing de {{CLIENTE}}. Trabaja solo con datos de {{CLIENTE}}: no uses conectores ni datos de otros clientes.

Datos fijos:
- Panel (artefacto): {{PANEL_URL}}
- Plataforma: {{PLATAFORMA}}. Conector: {{CONECTOR}}.
- {{DATO_PLATAFORMA}}
- Tienda Shopify del cliente: {{TIENDA}}.
- Destinatarios del correo: {{DESTINATARIOS}}.
- Fila del cliente en el listado «Paneles Email» (https://claude.ai/artifact/Tstgau5tAfbTJ3Fauz7cQc): paneles/{{ID_LISTADO}}.
- Mes a cerrar: el mes anterior al de hoy (formato AAAA-MM).

Instrucciones del proceso: skill «panel-email-cliente». Si no está cargada, está en el repositorio amaeso-webimpacto/mkt-automation, rama main, fichero .claude/skills/panel-email-cliente/SKILL.md, con las instrucciones de la plataforma en plataformas/ y la plantilla en plantilla/ (añade el repositorio con add_repo y clónalo si hace falta). Lee la skill y el fichero de la plataforma enteros antes de empezar y sigue sus criterios.

Paso 1 · Comprobar la cuenta. Con una llamada de solo lectura confirma que el conector {{CONECTOR}} es la cuenta de {{CLIENTE}}. Si no lo es, no leas más datos: ve al paso 5 y explica el fallo.

Paso 2 · ¿Ya se actualizó a mano este mes? Lee con ArtifactData el documento months/<mes a cerrar> del panel. Si existe y su campo actualizacion.fecha es de este mes (igual o posterior al día 1 del mes actual), NO repitas la actualización: ve al paso 4 e indica en el correo que ya estaba actualizado, en qué fecha y en qué modo.

Paso 3 · Si no se había actualizado: aplica el modo B de la skill completo, incluido el análisis con el contexto del mes (modo C), respetando todo lo escrito a mano por el equipo y escribiendo actualizacion: {fecha: ahora en ISO, modo: "programada"}. Shopify solo si get-shop-info confirma que el conector está en la tienda de {{CLIENTE}}; si no, deja los ingresos de Shopify como dato manual pendiente. Solo lectura en {{PLATAFORMA}} y en Shopify: no modifiques nada allí.

Paso 4 · Versión estática: genera el HTML con el modo D de la skill a partir de los datos actuales del panel (tanto si has actualizado como si no), con nombre Panel-Email-{{SLUG}}-<mes a cerrar>.html, y entrégalo con SendUserFile (status proactive, display attach). No lo subas a Google Drive.

Paso 5 · Listado: si hay fila del cliente en el listado «Paneles Email», deja el resultado como dice el paso 8 del modo B (ultimaActualizacion y pendientesManual), leyendo antes y con if_version. Sin cifras ni datos personales.

Paso 6 · Correo: envía un único correo con el conector de Gmail a {{DESTINATARIOS}}, sin adjuntos, con htmlBody (HTML sencillo: párrafos, una tabla de cifras y listas; sin estilos externos ni imágenes) y body con el mismo contenido en texto plano.
- Asunto: «Panel Email {{CLIENTE}} · <Mes Año> actualizado», «Panel Email {{CLIENTE}} · <Mes Año> ya estaba actualizado» o «Panel Email {{CLIENTE}} · <Mes Año> con incidencias».
- Contenido: qué se ha hecho (o la fecha de la actualización manual previa); tabla con las cifras clave del mes y su variación frente al mes anterior (campañas B2C enviadas, revenue de campañas y de flujos si la plataforma lo da, ingresos del canal email en Shopify, open rate, CTR, tasa de baja, BBDD total y enviamos); el resumen del análisis; los datos que hay que meter a mano en «Editar datos» y cualquier anomalía. Al final, el enlace al panel y el enlace a esta sesión, donde está el fichero HTML para descargar (solo lo abre la dueña de la tarea).
- Sin datos personales de clientes finales.

Si algo falla (conector sin acceso, error al escribir en el panel), no inventes datos: envía igualmente el correo explicando qué ha fallado y qué queda pendiente, y deja estado "error" o "incompleta" en el listado. No hagas commits ni push.

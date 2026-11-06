// Textos editables iniciales. Septiembre conserva el análisis del panel anterior;
// octubre es el análisis nuevo hecho con los datos del conector.

// Campañas del histórico que el filtro por nombre no detectaba y van a listas MAYORISTA (verificado en Klaviyo el 06/11/2026).
exports.B2B_BY_AUDIENCE = [
  "Campaña del 17 oct 2025, 10:52",
  "Correo electrónico 1",
  "Campaña del 3 sept 2026, 11:35"
];

exports.MONTH_TEXT = {
  "2026-09": {
    contexto: "La caída en «Enviamos» (de 12.272 en agosto a 9.556 en septiembre) se explica por el uso de segmentación engaged a 30, 60 y 90 días, que también explica la mejora de apertura y clic.",
    analisis: {
      resumen: "Septiembre arranca la colección FW26. La BBDD sigue creciendo y la segmentación engaged sube la apertura por encima del 50 % en la segunda quincena, a costa de alcance.",
      funciono: [
        "**La segmentación engaged dispara el OR.** «Terciopelo», «Novedades» y «Especial novia» logran OR del 52-54 %, muy por encima de la media del mes.",
        "**«Especial novia septiembre 24.09» es el envío más rentable del mes.** 7 pedidos y 560 € con la lista más reducida: el nicho novia convierte con audiencia caliente.",
        "**El lanzamiento FW26 arranca sólido.** «Launch colección FW26 01.09» y «Push nueva colección 03.09» con CTR del 3,3 % y CTOR por encima del 8 %.",
        "**Las temáticas de tendencia convierten.** «Selección Burdeos 15.09» (OR 38 %, CTR 3,25 %, 5 pedidos, 342 €)."
      ],
      corregir: [
        "**El CTOR se desinfla en la segunda quincena.** Con OR del 52-54 %, el CTOR se queda en 5-6 %: se abre mucho y se clica poco. Revisar selección de producto y layout.",
        "**«Animal print FW26 08.09» es el envío más débil en clic.** CTR 2,51 % y CTOR 6,8 % con la lista más amplia del mes.",
        "**El volumen baja en la segunda quincena.** De unos 12.400 destinatarios a 8.700-10.000: valorar en octubre ampliar sin perder métricas.",
        "**Solo 31 pedidos atribuidos a campañas.** Testar CTA más directos y producto con stock garantizado."
      ],
      acciones: [
        "**Imágenes de flujos actualizadas** a la nueva colección, con ajustes de contenido.",
        "**Customer Winback** en revisión (trigger, copy e incentivo).",
        "**Segmentos núcleo creados:** Engaged 30D / 90D / Reactivables / Inactivos como estándar de envío."
      ],
      propuestas: [
        "Novedades FW26 · Favoritos de octubre | 1ª semana de octubre | Selección editorial de los modelos FW26 que más resuenan. Sin descuento.",
        "Tendencias clave · Terciopelo y burdeos | 2ª semana de octubre | Newsletter inspiracional con producto real vinculado.",
        "Edición especial · Looks de evento | 3ª semana de octubre | Bodas civiles, celebraciones y graduaciones para audiencia engaged.",
        "Pre-Black Friday · Acceso anticipado | 3ª-4ª semana de octubre | Acceso prioritario a las ofertas para la base suscrita.",
        "Black Friday · Campaña principal | Semana de Black Friday | Oferta clara y limitada. Engaged 30/60/90 + compradores.",
        "Cyber Monday · Última oportunidad | Lunes tras Black Friday | Para quien abrió Black Friday y no compró."
      ]
    }
  },
  "2026-10": {
    contexto: "",
    analisis: {
      resumen: "Octubre concentra la promo de fin de verano, la mid season sale y el empuje de la colección FW26. Con 8 campañas B2C y un 19 % menos de envíos que en septiembre, las campañas facturan un 58 % más (4.103 € frente a 2.589 €) porque todas salen a segmentos engaged de 60 o 90 días con exclusiones de no abridores. Los flujos firman su mejor mes del histórico (20.621 €), con Welcome Series como motor (83 % del revenue de flujos). En Shopify, el email aporta 6.301 € de 32.505 € de venta neta: un peso del 19,4 %, el máximo del histórico (15,5 % en mayo de 2026 y 7,2 % en octubre de 2025).",
      funciono: [
        "**La segmentación engaged es ya el estándar y funciona.** Las 8 campañas B2C salen a «D2C_Engaged 60/90 días» + «Suscriptores nuevos sin compra (<30d)», excluyendo «No abridores más de 10 envíos», «Never engaged» y «Compradores últimos 7D». OR medio 48,2 % (42,1 % en septiembre) y 0,052 €/destinatario, el doble que en septiembre (0,026 €).",
        "**«Promo fin verano 02.10» es el mejor envío del mes.** 16 pedidos, 794 €, CTR 7,1 % y CTOR 14,6 %. Una oferta concreta mueve más que la novedad: su repetición a las 48 h («Últimas 48h») mantiene OR del 50,8 % pero baja a 7 pedidos.",
        "**Welcome Series marca récord.** 3.728 destinatarios (+90 % frente a 1.962 en septiembre) y 17.074 €. El email principal del flujo convierte un 16,4 % de quien lo recibe. Hay que confirmar de dónde sale el pico de altas (formulario, captación en RRSS, sorteo) para poder repetirlo.",
        "**Cumpleaños y Customer Thank You dan su mejor mes.** 417 € y 887 € respectivamente, máximos de su histórico. El código de cumpleaños ya convierte (1,2 % de conversión)."
      ],
      corregir: [
        "**La mid season sale se agota en cuatro envíos.** El CTOR cae del 8,9 % («Launch» 13.10) al 6,3 % («Últimas horas» 23.10) y «Best-sellers mid season 20.10» deja 3 pedidos, 0,013 €/destinatario y la tasa de baja más alta del mes (0,29 %). Con audiencia engaged, tres impactos por promo bastan.",
        "**Customer Winback sigue sin convertir.** 1.735 envíos, 1 pedido y 65 €. Lleva en revisión desde septiembre: fijar fecha para el cambio de trigger (120-150 días) e incentivo.",
        "**Abandoned Cart pierde volumen.** 523 destinatarios y 1.109 € (911 y 2.438 € en julio). El primer email tiene menos destinatarios (109) que el segundo y el tercero (128-154) y no convierte: revisar filtros y espera del primer mensaje.",
        "**La tasa de baja sube.** 0,235 % de media en campañas B2C (0,217 % en septiembre y 0,108 % en octubre de 2025). Sigue por debajo del 0,3 %, pero «Push nueva colección 27.10» llega al 0,34 %.",
        "**Suscritos sin compra no termina de rendir.** 2.495 envíos y 0,27 €/destinatario, por debajo de Cumpleaños o Thank You."
      ],
      acciones: [
        "**Segmentación engaged aplicada en el 100 % de las campañas B2C** (verificado en las audiencias de Klaviyo).",
        "**Flujo «Suscritos sin compra» editado el 30/10/2026** (fecha de última edición en Klaviyo; completar qué se cambió).",
        "Completar con las acciones del equipo durante el mes."
      ],
      propuestas: [
        "Black Friday · Acceso anticipado engaged | Semana del 16 de noviembre | Adelanto de 24 h para Engaged 30D y compradores. En Black Friday 2025 los envíos a audiencia reducida («Lanzamiento NYREX 20.11» y «Lanzamiento Rosa Amada 23.11», unos 6.770 dest.) duplicaron el €/destinatario medio de los envíos a toda la lista (0,08 € frente a 0,033 €).",
        "Black Friday · Oferta principal | 27 de noviembre | Una oferta concreta con fecha de fin, como «Promo fin verano». Máximo tres impactos: lanzamiento, recordatorio, últimas horas.",
        "Cyber Monday · Solo a quien abrió y no compró | 30 de noviembre | Segmento de abridores de Black Friday sin pedido, para no repetir el 0,0057 €/dest. del Cyber Monday 2025.",
        "Outlet desde 19,99 € | 1ª semana de diciembre | «Especial outlet 19,99 € 03.12» fue el mejor envío de diciembre 2025 (OR 35 %, 8 pedidos). Repetir el formato.",
        "Guía de regalos por precio | 2ª semana de diciembre | Bloques por tramo de precio y tarjeta regalo, sin descuento.",
        "Adelántate a Reyes | Última semana de diciembre | Plazos de envío y producto con stock garantizado."
      ]
    }
  }
};

exports.ESTRATEGIA = {
  campanas: [
    "**Mantener engaged 60/90 días como audiencia por defecto** | alta | Octubre confirma OR del 45-52 % y el doble de €/destinatario.",
    "**Tres impactos por promo como máximo** | alta | La cuarta pieza de la mid season de octubre rindió 0,013 €/dest.",
    "**Quitar fechas del asunto público** | media | Mantenerlas solo en el nombre interno.",
    "**Marca en el asunto** | media | Mencionar Rosa Amada o NYREX sube la conversión.",
    "**Mejorar el preview text** | baja | Que no repita el asunto; añadir precio, fecha o beneficio."
  ],
  flujos: [
    "**Arreglar Customer Winback** | alta | Conversión casi nula pese a miles de envíos. Trigger a 120-150 días e incentivo limitado.",
    "**Revisar el primer email de Abandoned Cart** | alta | Recibe menos destinatarios que los siguientes y no convierte.",
    "**Optimizar «Suscritos sin compra»** | media | Copy, incentivo y timing.",
    "**Monetizar Customer Thank You** | media | Review request y cross-sell suave.",
    "**Revisar el trigger de Aniversario** | media | 8 envíos en octubre y 0 € de histórico."
  ],
  segmentacion: [
    "**Segmentos núcleo creados** | baja | Engaged 30D / 60D / 90D, Reactivables e Inactivos como estándar de envío.",
    "**Excluir Inactivos** | alta | Más de 365 días sin abrir ni comprar: fuera de casi todos los envíos.",
    "**Reactivables solo en picos** | media | Black Friday, rebajas, Día de la Madre. Una o dos veces al mes.",
    "**Segmentos por categoría** | media | Invitada, día a día y sub-marca para subir el CTR.",
    "**Smart Send Time** | baja | En envíos no urgentes a Engaged 30D/90D."
  ],
  captacion: [
    "**Identificar el origen del pico de altas de octubre** | alta | Welcome pasó de 1.962 a 3.728 destinatarios. Saber qué lo provocó permite repetirlo.",
    "**Campaña en RRSS de acceso anticipado por suscripción** | alta | Reels y stories con cuenta atrás hacia una landing de alta.",
    "**Medir las altas por origen** | baja | Segmento por fuente de captación para comparar apertura y compra a 60 días."
  ]
};

// Octubre 2026 extraído del conector Klaviyo-Azarey-todo (06/11/2026).
// Conversión: Placed Order de Shopify (UF7N6J), canal email, 01/10–31/10.
// c: [name, date, recipients, or, ctr, ctor, cr, unsub, conv, rev, aov, rpr, b2b]
exports.CAMPAIGNS = [
["Promo fin verano 02.10","2026-10-02",9681,0.48733,0.07135,0.14642,0.00166,0.00249,16,794.47,49.65,0.08252,false],
["BLACK NACIONAL MAYORISTA","2026-10-05",1380,0.23725,0.02587,0.10903,0,0.00074,0,0,0,0,true],
["Campaña del 2 oct 2026, 8:06","2026-10-05",1348,0.32931,0.01055,0.03204,0,0.00452,0,0,0,0,true],
["[Seguimiento] Campaña del 2 oct 2026, 8:06","2026-10-07",247,0.21053,0.01619,0.07692,0,0.00405,0,0,0,0,true],
["[Seguimiento] BLACK NACIONAL MAYORISTA","2026-10-07",310,0.20645,0.05161,0.25,0,0,0,0,0,0,true],
["Últimas 48h Promo fin verano 07.10","2026-10-07",9048,0.50835,0.05766,0.11342,0.00078,0.00178,7,325.29,46.47,0.03621,false],
["B2B BLACK NYREX Y ROSA AMADA","2026-10-08",1373,0.26816,0.03371,0.1257,0.00075,0.00075,1,199.75,199.75,0.14963,true],
["Botines nueva colección 09.10 (clone)","2026-10-09",9616,0.49407,0.03693,0.07475,0.00063,0.00252,6,611.07,101.85,0.06411,false],
["[Seguimiento] B2B BLACK NYREX Y ROSA AMADA","2026-10-13",8,0,0,0,0,0,0,0,0,0,true],
["Launch mid season sale 13.10","2026-10-13",10554,0.45884,0.04087,0.08907,0.00086,0.0023,9,695.91,77.32,0.06661,false],
["Botines mid season sale 18.10","2026-10-18",9647,0.49404,0.04441,0.08989,0.00094,0.00209,9,538.13,59.79,0.05623,false],
["Best-sellers mid season 20.10","2026-10-20",10635,0.45757,0.03353,0.07328,0.00028,0.00294,3,133.43,44.48,0.01264,false],
["Últimas horas mid season 23.10","2026-10-23",10675,0.45042,0.02849,0.06326,0.00038,0.00132,4,348.53,87.13,0.03288,false],
["Push nueva colección 27.10","2026-10-27",9537,0.51681,0.03467,0.06709,0.00084,0.00337,8,656.07,82.01,0.06914,false],
["MAYORISTA BLACK 2","2026-10-30",1356,0.23802,0.02844,0.1195,0.00075,0,1,209.85,209.85,0.15707,true],
["MAYORISTA INT BLACK","2026-10-30",1313,0.2886,0.00465,0.01613,0,0.0031,0,0,0,0,true],
["[Seguimiento] MAYORISTA BLACK 2","2026-10-31",288,0.1777,0.02091,0.11765,0,0,0,0,0,0,true],
["[Seguimiento] MAYORISTA INT BLACK","2026-10-31",244,0.25311,0,0,0,0,0,0,0,0,true]
];

// id -> [r, o, c, p, rev] (agregado del flujo en octubre)
exports.FLOWS = {
"XXaWKB":[3728,0.4246,0.1055,232,17074.05],
"SzSHvq":[523,0.4668,0.1035,14,1108.78],
"VzfG3T":[1630,0.4898,0.0971,11,887.37],
"QPm69Y":[1735,0.3343,0.0577,1,64.95],
"V6sHWg":[1514,0.4416,0.071,5,398.75],
"VaL2FJ":[514,0.4551,0.0605,6,417.32],
"WC2QGy":[8,0.5,0,0,0],
"TcDTqb":[2495,0.3027,0.0396,8,670.04]
};

// Perfiles tomados el día de actualización (06/11/2026). Activos = recuento de perfiles de correo
// (perfiles activos de Klaviyo); Enviamos = destinatarios de la última campaña B2C del mes según la interfaz.
exports.BBDD = {total:39173, activos:19187, suscritos:21935, enviamos:9526};

// Facilitado a mano el 06/11/2026: ingresos atribuidos a Klaviyo en Shopify (último clic no directo) y venta neta del mes.
exports.SHOPIFY = {rev:6300.61, ventaNeta:32505};

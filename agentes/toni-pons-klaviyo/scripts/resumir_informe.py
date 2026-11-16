#!/usr/bin/env python3
"""Resume informes de Klaviyo (campañas o flujos) guardados en fichero.

Imprime solo agregados en JSON: nunca filas de perfiles ni datos personales.
Uso:
  python3 -I resumir_informe.py campanas RUTA [--top N]
  python3 -I resumir_informe.py flujos RUTA [--top N]
  python3 -I resumir_informe.py total --campanas RUTA --flujos RUTA
  python3 -I resumir_informe.py sin_envios --semana1 RUTA --semana2 RUTA --referencia RUTA
"""
import argparse
import collections
import json
import re
from datetime import datetime

CONTEOS = ["recipients", "delivered", "opens_unique", "clicks_unique", "bounced",
           "spam_complaints", "unsubscribe_uniques", "conversion_value"]
MERCADOS = ["ES_US", "ES_INT", "EN_UK", "EN_DE", "ES", "CA", "CAT", "EU", "FR", "IT", "US", "INT"]
FORMATO_ENVIO = "%B %d, %Y, %H:%M"


def cargar(ruta):
    with open(ruta, encoding="utf-8") as fichero:
        return json.load(fichero)["data"]["attributes"]


def sumar(filas):
    return {k: sum(float(f.get(k) or 0) for f in filas) for k in CONTEOS}


def tasas(t):
    def razon(a, b):
        return a / b if b else None
    return {"open_rate": razon(t["opens_unique"], t["delivered"]),
            "click_rate": razon(t["clicks_unique"], t["delivered"]),
            "bounce_rate": razon(t["bounced"], t["recipients"]),
            "spam_rate": razon(t["spam_complaints"], t["delivered"]),
            "unsub_rate": razon(t["unsubscribe_uniques"], t["delivered"])}


def campanas(ruta):
    filas = []
    for r in cargar(ruta)["results"]:
        det = (r.get("campaign_details") or {}).get("attributes") or {}
        incluidas = (det.get("audiences") or {}).get("included") or []
        nombre_aud = incluidas[0].get("name") if incluidas and isinstance(incluidas[0], dict) else (incluidas[0] if incluidas else "sin audiencia")
        try:
            envio = datetime.strptime(det.get("send_time", ""), FORMATO_ENVIO)
        except ValueError:
            envio = None
        filas.append({"id": r["groupings"]["campaign_id"], "nombre": det.get("name"), "envio": envio,
                      "audiencia": nombre_aud, **{k: float(r["statistics"].get(k) or 0) for k in CONTEOS}})
    return filas


def flujos(ruta):
    salida = {}
    for r in cargar(ruta)["flow_aggregation"]:
        det = r["flow_details"]["attributes"]
        salida[r["flow_id"]] = {"nombre": det["name"], "estado": det.get("status"),
                                **{k: float(r["statistics"].get(k) or 0) for k in CONTEOS}}
    return salida


def mercado(nombre):
    limpio = re.sub(r"_NEW$", "", nombre.strip().upper())
    m = re.search(r"(?:_|\s)(" + "|".join(MERCADOS) + r")$", limpio)
    return m.group(1) if m else "SIN_MERCADO"


def resumen_campanas(ruta, top):
    filas = campanas(ruta)
    total = sumar(filas)
    por_aud = collections.defaultdict(lambda: {"recipients": 0.0, "conversion_value": 0.0, "campanas": 0})
    for f in filas:
        a = por_aud[f["audiencia"]]
        a["recipients"] += f["recipients"]; a["conversion_value"] += f["conversion_value"]; a["campanas"] += 1
    mejores = sorted(filas, key=lambda f: -f["conversion_value"])[:top]
    fechas = [f["envio"] for f in filas if f["envio"]]
    return {"campanas": len(filas), "totales": total, **tasas(total),
            "ultimo_envio": max(fechas).isoformat() if fechas else None,
            "por_audiencia": {k: v for k, v in sorted(por_aud.items(), key=lambda kv: -kv[1]["conversion_value"])},
            "top_ingresos": [{"nombre": f["nombre"], "envio": f["envio"].isoformat() if f["envio"] else None,
                              "recipients": f["recipients"], "conversion_value": round(f["conversion_value"], 2),
                              "open_rate": round(f["opens_unique"] / f["delivered"], 4) if f["delivered"] else None}
                             for f in mejores]}


def resumen_flujos(ruta, top):
    datos = flujos(ruta)
    total = sumar(datos.values())
    por_mercado = collections.defaultdict(lambda: {"conversion_value": 0.0, "recipients": 0.0})
    for f in datos.values():
        m = por_mercado[mercado(f["nombre"])]
        m["conversion_value"] += f["conversion_value"]; m["recipients"] += f["recipients"]
    mejores = sorted(datos.items(), key=lambda kv: -kv[1]["conversion_value"])[:top]
    return {"flujos_con_actividad": len(datos), "totales": total, **tasas(total),
            "por_mercado": {k: {kk: round(vv, 2) for kk, vv in v.items()}
                            for k, v in sorted(por_mercado.items(), key=lambda kv: -kv[1]["conversion_value"])},
            "top_ingresos": [{"id": fid, "nombre": f["nombre"], "mercado": mercado(f["nombre"]),
                              "conversion_value": round(f["conversion_value"], 2), "recipients": f["recipients"]}
                             for fid, f in mejores]}


def total(ruta_campanas, ruta_flujos):
    t = sumar(campanas(ruta_campanas) + list(flujos(ruta_flujos).values()))
    return {"totales": t, **tasas(t)}


def sin_envios(semana1, semana2, referencia):
    """Flujos LIVE con envíos en la referencia y sin envíos en la última semana (aviso) o en las dos (crítico)."""
    s1, s2, ref = flujos(semana1), flujos(semana2), flujos(referencia)
    estado = {}
    for origen in (s1, s2, ref):
        for fid, f in origen.items():
            estado.setdefault(fid, f["estado"])
    aviso, critico = [], []
    for fid, f in ref.items():
        if f["recipients"] <= 0 or estado.get(fid) != "live":
            continue
        if s1.get(fid, {}).get("recipients", 0) > 0:
            continue
        fila = {"id": fid, "nombre": f["nombre"], "mercado": mercado(f["nombre"]), "envios_referencia": f["recipients"]}
        (critico if s2.get(fid, {}).get("recipients", 0) <= 0 else aviso).append(fila)
    return {"aviso_7_dias": aviso, "critico_14_dias": critico}


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="orden", required=True)
    for nombre in ("campanas", "flujos"):
        p = sub.add_parser(nombre); p.add_argument("ruta"); p.add_argument("--top", type=int, default=8)
    p = sub.add_parser("total"); p.add_argument("--campanas", required=True); p.add_argument("--flujos", required=True)
    p = sub.add_parser("sin_envios")
    for opcion in ("--semana1", "--semana2", "--referencia"):
        p.add_argument(opcion, required=True)
    a = ap.parse_args()
    if a.orden == "campanas":
        res = resumen_campanas(a.ruta, a.top)
    elif a.orden == "flujos":
        res = resumen_flujos(a.ruta, a.top)
    elif a.orden == "total":
        res = total(a.campanas, a.flujos)
    else:
        res = sin_envios(a.semana1, a.semana2, a.referencia)
    print(json.dumps(res, ensure_ascii=False, indent=1, default=str))


if __name__ == "__main__":
    main()

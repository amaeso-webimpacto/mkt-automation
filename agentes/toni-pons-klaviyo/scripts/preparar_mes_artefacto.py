#!/usr/bin/env python3
"""Calcula los datos mensuales del artefacto de Toni Pons a partir de informes de Klaviyo guardados en fichero.

Replica el cálculo de la página (campañas, flujos y tasas ponderadas). Imprime solo agregados y filas de
campañas, flujos y SKU: nunca datos de perfiles.

Uso:
  python3 -I preparar_mes_artefacto.py kpis --campanas RUTA --flujos RUTA [--salida RUTA]
  python3 -I preparar_mes_artefacto.py bis --eventos RUTA [RUTA ...] [--salida RUTA]
  python3 -I preparar_mes_artefacto.py comparar --calculado RUTA --guardado RUTA
"""
import argparse
import json
import re
from datetime import datetime
from zoneinfo import ZoneInfo

ZONA = ZoneInfo("Europe/Madrid")
TOP_BIS = 15
TOLERANCIA = 0.01
PREFIJOS_CAMPANA = [("ES_INT", "ES_INT"), ("ES_US", "Otros"), ("EN_EU", "EU"), ("EN_USA", "US"),
                    ("EN_US", "US"), ("EN_UK", "EN_UK"), ("EN_DE", "EN_DE"), ("EN_INT", "EN_INT"),
                    ("EN_PT", "EN_INT"), ("EU", "EU"), ("US", "US"), ("CAT", "CAT"), ("CA", "CAT"),
                    ("FR", "FR"), ("IT", "IT"), ("EN", "EN"), ("ES", "ES")]
MERCADOS_FLUJO = {"ES": "ES", "CA": "CAT", "CAT": "CAT", "FR": "FR", "IT": "IT", "EU": "EU",
                  "US": "US", "USA": "US", "INT": "INT"}


def cargar_resultados(ruta):
    with open(ruta, encoding="utf-8") as fichero:
        return json.load(fichero)["data"]["attributes"]["results"]


def num(valor):
    try:
        return float(valor or 0)
    except (TypeError, ValueError):
        return 0.0


def redondear(valor, decimales):
    return round(valor + 1e-12, decimales)


def mercado_flujo(nombre):
    mayusculas = (nombre or "").upper()
    for marca, destino in (("ES_INT", "ES_INT"), ("EN_UK", "EN_UK"), ("EN_DE", "EN_DE"), ("ES_US", "Otros")):
        if marca in mayusculas:
            return destino
    resultado = None
    for ficha in re.split(r"[^A-Z]+", mayusculas):
        resultado = MERCADOS_FLUJO.get(ficha, resultado)
    return resultado or "Otros"


def mercado_campana(nombre):
    mayusculas = (nombre or "").upper()
    posicion = mayusculas.find("_")
    if posicion < 0:
        return "Otros"
    resto = re.sub(r"^LEADS\s+", "", mayusculas[posicion + 1:].replace("-", "_"))
    for prefijo, destino in PREFIJOS_CAMPANA:
        if resto == prefijo or resto.startswith((prefijo + "_", prefijo + " ", prefijo + ":")):
            return destino
    return "Otros"


def fecha_envio(detalle):
    programada = detalle.get("scheduled_at")
    if not programada:
        return ""
    instante = datetime.fromisoformat(programada.replace("Z", "+00:00")).astimezone(ZONA)
    return instante.strftime("%d-%m")


def filas_campanas(resultados):
    filas = []
    for r in resultados:
        est = r.get("statistics") or {}
        det = (r.get("campaign_details") or {}).get("attributes") or {}
        nombre = det.get("name") or r["groupings"]["campaign_id"]
        filas.append({"name": nombre, "lang": mercado_campana(nombre), "date": fecha_envio(det),
                      "sends": num(est.get("recipients")), "or": num(est.get("open_rate")) * 100,
                      "ctr": num(est.get("click_rate")) * 100, "unsub": num(est.get("unsubscribe_rate")) * 100,
                      "conv": num(est.get("conversion_rate")) * 100,
                      "rev": redondear(num(est.get("conversion_value")), 2), "id": r["groupings"]["campaign_id"]})
    return filas


def filas_flujos(resultados):
    por_flujo = {}
    for r in resultados:
        grupo, est = r.get("groupings") or {}, r.get("statistics") or {}
        detalle = ((r.get("flow_details") or {}).get("attributes") or {})
        acumulado = por_flujo.setdefault(grupo["flow_id"], {
            "name": grupo.get("flow_name") or detalle.get("name") or grupo["flow_id"], "fid": grupo["flow_id"],
            "rec": 0.0, "del": 0.0, "op": 0.0, "cl": 0.0, "cu": 0.0, "rev": 0.0})
        acumulado["rec"] += num(est.get("recipients"))
        acumulado["del"] += num(est.get("delivered"))
        acumulado["op"] += num(est.get("opens_unique"))
        acumulado["cl"] += num(est.get("clicks_unique"))
        acumulado["cu"] += num(est.get("conversion_uniques"))
        acumulado["rev"] += num(est.get("conversion_value"))
    filas = []
    for a in por_flujo.values():
        filas.append({"name": a["name"], "lang": mercado_flujo(a["name"]), "sends": a["rec"],
                      "or": a["op"] / a["del"] * 100 if a["del"] else 0,
                      "ctr": a["cl"] / a["del"] * 100 if a["del"] else 0,
                      "conv": a["cu"] / a["rec"] * 100 if a["rec"] else 0,
                      "rev": redondear(a["rev"], 2), "fid": a["fid"]})
    return [f for f in filas if f["sends"] > 0]


def acumular_tasas(resultados):
    t = {"rec": 0.0, "del": 0.0, "op": 0.0, "cl": 0.0, "bo": 0.0, "sp": 0.0, "un": 0.0}
    for r in resultados:
        est = r.get("statistics") or {}
        recibidos, entregados = num(est.get("recipients")), num(est.get("delivered"))
        t["rec"] += recibidos
        t["del"] += entregados
        t["op"] += num(est.get("opens_unique"))
        t["cl"] += num(est.get("clicks_unique"))
        t["bo"] += num(est.get("bounce_rate")) * recibidos
        t["sp"] += num(est.get("spam_complaint_rate")) * entregados
        t["un"] += num(est.get("unsubscribe_rate")) * entregados
    return t


def calcular_kpis(ruta_campanas, ruta_flujos):
    res_camp, res_flujo = cargar_resultados(ruta_campanas), cargar_resultados(ruta_flujos)
    camps, flujos = filas_campanas(res_camp), filas_flujos(res_flujo)
    a, b = acumular_tasas(res_camp), acumular_tasas(res_flujo)
    t = {clave: a[clave] + b[clave] for clave in a}
    k = {"volC": sum(f["sends"] for f in camps), "rc": redondear(sum(f["rev"] for f in camps), 2),
         "volF": sum(f["sends"] for f in flujos), "rf": redondear(sum(f["rev"] for f in flujos), 2)}
    if t["del"] > 0 and t["rec"] > 0:
        k["or"] = round(t["op"] / t["del"] * 10000) / 100
        k["ctr"] = round(t["cl"] / t["del"] * 10000) / 100
        k["bo"] = round(t["bo"] / t["rec"] * 1e6) / 1e4
        k["sp"] = round(t["sp"] / t["del"] * 1e6) / 1e4
        k["un"] = round(t["un"] / t["del"] * 1e6) / 1e4
    return {"k": k, "t": {"camps": camps, "flows": flujos}}


def sku_de_evento(evento):
    propiedades = (evento.get("attributes") or {}).get("event_properties") or {}
    return str(propiedades.get("SKU") or "").strip()


def calcular_bis(rutas):
    por_sku = {}
    for ruta in rutas:
        with open(ruta, encoding="utf-8") as fichero:
            for evento in json.load(fichero).get("data") or []:
                sku = sku_de_evento(evento)
                if sku:
                    por_sku[sku] = por_sku.get(sku, 0) + 1
    por_modelo = {}
    for sku, cuenta in por_sku.items():
        modelo = sku.split("_")[0]
        por_modelo[modelo] = por_modelo.get(modelo, 0) + cuenta

    def top(conteo):
        ordenado = sorted(conteo.items(), key=lambda par: -par[1])[:TOP_BIS]
        return [{"clave": clave, "n": cuenta} for clave, cuenta in ordenado]

    return {"t": {"bisSkusMes": top(por_sku), "bisModelosMes": top(por_modelo)},
            "solicitudes": sum(por_sku.values())}


def comparar(calculado, guardado):
    """Lista las diferencias entre lo calculado y un mes ya guardado en el artefacto."""
    informe = {"k": {}, "t": {}}
    for clave, valor in calculado.get("k", {}).items():
        previo = (guardado.get("k", {}).get(clave) or {}).get("v")
        informe["k"][clave] = {"calculado": valor, "guardado": previo,
                               "coincide": previo is not None and abs(valor - previo) <= TOLERANCIA}
    for nombre, filas in calculado.get("t", {}).items():
        previas = (guardado.get("t", {}).get(nombre) or {}).get("rows") or []
        previo_por_id = {fila.get("id") or fila.get("fid") or fila.get("name"): fila for fila in previas}
        distintas = [clave for clave, fila in ((f.get("id") or f.get("fid") or f.get("name"), f) for f in filas)
                     if clave not in previo_por_id or abs(num(previo_por_id[clave].get("rev")) - num(fila.get("rev"))) > TOLERANCIA
                     or abs(num(previo_por_id[clave].get("sends")) - num(fila.get("sends"))) > TOLERANCIA]
        informe["t"][nombre] = {"filas_calculadas": len(filas), "filas_guardadas": len(previas),
                                "filas_distintas": len(distintas)}
    return informe


def escribir(resultado, salida):
    texto = json.dumps(resultado, ensure_ascii=False, indent=1, default=str)
    if salida:
        with open(salida, "w", encoding="utf-8") as fichero:
            fichero.write(texto)
        print(json.dumps({"escrito": salida}))
    else:
        print(texto)


def main():
    analizador = argparse.ArgumentParser()
    sub = analizador.add_subparsers(dest="orden", required=True)
    p = sub.add_parser("kpis")
    p.add_argument("--campanas", required=True)
    p.add_argument("--flujos", required=True)
    p.add_argument("--salida")
    p = sub.add_parser("bis")
    p.add_argument("--eventos", nargs="+", required=True)
    p.add_argument("--salida")
    p = sub.add_parser("comparar")
    p.add_argument("--calculado", required=True)
    p.add_argument("--guardado", required=True)
    a = analizador.parse_args()
    if a.orden == "kpis":
        escribir(calcular_kpis(a.campanas, a.flujos), a.salida)
    elif a.orden == "bis":
        escribir(calcular_bis(a.eventos), a.salida)
    else:
        with open(a.calculado, encoding="utf-8") as c, open(a.guardado, encoding="utf-8") as g:
            print(json.dumps(comparar(json.load(c), json.load(g)), ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()

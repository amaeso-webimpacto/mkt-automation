#!/usr/bin/env python3
"""Resume un CSV de resultados de email marketing sin mostrar datos personales.

Escribe en un fichero Markdown el recuento de filas, las columnas, las estadísticas
de las columnas numéricas y las primeras filas. Las columnas con correos o teléfonos
solo aparecen con su nombre.
Uso:
  python3 -I resumir_csv.py RUTA_CSV RUTA_SALIDA_MD [--filas N]
"""
import argparse
import csv
import re
import statistics

CODIFICACIONES = ("utf-8-sig", "latin-1")
FILAS_MUESTRA = 5
MAX_COLUMNAS = 40
PATRON_CORREO = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
PATRON_TELEFONO = re.compile(r"^(\+\d[\d\s().-]{7,}|\d{3}[\s.-]\d{2,3}[\s.-]\d{2,3}[\s.-]?\d{0,3}|[6-9]\d{8})$")
PATRON_TOTAL = re.compile(r"^\s*total\b", re.IGNORECASE)
PATRON_MILES = re.compile(r"^-?\d{1,3}(\.\d{3})+$")


def leer_texto(ruta):
    for codificacion in CODIFICACIONES:
        try:
            with open(ruta, encoding=codificacion) as fichero:
                return fichero.read()
        except UnicodeDecodeError:
            continue
    raise ValueError("No se pudo leer el fichero con las codificaciones previstas")


def leer_filas(ruta):
    texto = leer_texto(ruta)
    dialecto = csv.Sniffer().sniff(texto[:4096], delimiters=",;\t")
    filas = list(csv.reader(texto.splitlines(), dialecto))
    return filas[0], filas[1:]


def a_numero(valor):
    limpio = re.sub(r"[€%\s]", "", valor)
    if not limpio:
        return None
    if "," in limpio:
        limpio = limpio.replace(".", "").replace(",", ".")
    elif PATRON_MILES.match(limpio):
        limpio = limpio.replace(".", "")
    try:
        return float(limpio)
    except ValueError:
        return None


def separar_totales(filas):
    datos = [f for f in filas if not (f and PATRON_TOTAL.match(f[0]))]
    return datos, len(filas) - len(datos)


def es_personal(valores):
    muestra = [v for v in valores if v][:200]
    return any(PATRON_CORREO.search(v) or PATRON_TELEFONO.match(v) for v in muestra)


def estadisticas(valores):
    numeros = [n for n in (a_numero(v) for v in valores) if n is not None]
    if len(numeros) < max(1, len([v for v in valores if v]) * 0.8):
        return None
    return {"n": len(numeros), "min": min(numeros), "max": max(numeros),
            "media": statistics.fmean(numeros), "suma": sum(numeros)}


def columnas_de(cabecera, filas):
    return {nombre: [f[i] if i < len(f) else "" for f in filas] for i, nombre in enumerate(cabecera)}


def formato(numero):
    return f"{numero:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def tabla_numericas(columnas):
    lineas = ["| Columna | Con valor | Mínimo | Máximo | Media | Suma |", "|---|---|---|---|---|---|"]
    for nombre, valores in list(columnas.items())[:MAX_COLUMNAS]:
        if es_personal(valores):
            continue
        datos = estadisticas(valores)
        if datos:
            lineas.append(f"| {nombre} | {datos['n']} | {formato(datos['min'])} | {formato(datos['max'])} | {formato(datos['media'])} | {formato(datos['suma'])} |")
    return lineas


def muestra(cabecera, filas, cuantas, ocultas):
    visibles = [i for i, nombre in enumerate(cabecera) if nombre not in ocultas][:MAX_COLUMNAS]
    lineas = ["| " + " | ".join(cabecera[i] for i in visibles) + " |", "|" + "---|" * len(visibles)]
    for fila in filas[:cuantas]:
        lineas.append("| " + " | ".join((fila[i] if i < len(fila) else "") for i in visibles) + " |")
    return lineas


def construir_resumen(ruta, cuantas):
    cabecera, todas = leer_filas(ruta)
    filas, totales = separar_totales(todas)
    columnas = columnas_de(cabecera, filas)
    ocultas = [nombre for nombre, valores in columnas.items() if es_personal(valores)]
    partes = ["# Resumen del CSV", "", f"Filas de datos: {len(filas)}. Filas de total excluidas de las estadísticas: {totales}. Columnas: {len(cabecera)}.", "",
              "Columnas: " + ", ".join(cabecera[:MAX_COLUMNAS]), ""]
    if ocultas:
        partes += ["Columnas con datos personales, no mostradas: " + ", ".join(ocultas), ""]
    partes += ["## Columnas numéricas", ""] + tabla_numericas(columnas)
    partes += ["", f"## Primeras {cuantas} filas", ""] + muestra(cabecera, filas, cuantas, ocultas)
    return "\n".join(partes) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("entrada")
    parser.add_argument("salida")
    parser.add_argument("--filas", type=int, default=FILAS_MUESTRA)
    argumentos = parser.parse_args()
    with open(argumentos.salida, "w", encoding="utf-8") as fichero:
        fichero.write(construir_resumen(argumentos.entrada, argumentos.filas))
    print(f"Resumen escrito en {argumentos.salida}")


if __name__ == "__main__":
    main()

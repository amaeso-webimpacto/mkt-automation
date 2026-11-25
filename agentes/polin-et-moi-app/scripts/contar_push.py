"""Cuenta la longitud de títulos y subtítulos de push con la regla del calendario.

Regla del calendario de comunicaciones: cada emoji cuenta como 2 caracteres.
Límites: título hasta 40 (orientativo 30), subtítulo hasta 120 (orientativo 100-120).

Uso:
    python3 -I contar_push.py "Título" "Subtítulo"
    python3 -I contar_push.py --json fichero.json
El JSON es una lista de objetos {"fecha": "25.11", "mercado": "EU", "titulo": "...", "subtitulo": "..."}.
"""
import json
import sys
import unicodedata

MAX_TITULO = 40
MAX_SUBTITULO = 120
MIN_SUBTITULO_ORIENTATIVO = 100
CARACTERES_POR_EMOJI = 2
SIN_ANCHO = {0x200D, 0xFE0F}


def es_emoji(caracter: str) -> bool:
    return unicodedata.category(caracter) == "So" and ord(caracter) > 0x2190


def longitud_push(texto: str) -> int:
    total = 0
    for caracter in texto:
        if ord(caracter) in SIN_ANCHO:
            continue
        total += CARACTERES_POR_EMOJI if es_emoji(caracter) else 1
    return total


def evaluar_push(titulo: str, subtitulo: str) -> dict:
    largo_titulo = longitud_push(titulo)
    largo_subtitulo = longitud_push(subtitulo)
    return {
        "titulo": largo_titulo,
        "subtitulo": largo_subtitulo,
        "titulo_excede": largo_titulo > MAX_TITULO,
        "subtitulo_excede": largo_subtitulo > MAX_SUBTITULO,
        "subtitulo_corto": largo_subtitulo < MIN_SUBTITULO_ORIENTATIVO,
    }


def leer_lote(ruta: str) -> list:
    with open(ruta, encoding="utf-8") as fichero:
        return json.load(fichero)


def main(argumentos: list) -> int:
    if len(argumentos) == 2 and argumentos[0] == "--json":
        resultados = []
        for push in leer_lote(argumentos[1]):
            resultado = evaluar_push(push.get("titulo", ""), push.get("subtitulo", ""))
            resultado.update({"fecha": push.get("fecha"), "mercado": push.get("mercado")})
            resultados.append(resultado)
        print(json.dumps(resultados, ensure_ascii=False, indent=2))
        return 0
    if len(argumentos) == 2:
        print(json.dumps(evaluar_push(argumentos[0], argumentos[1]), ensure_ascii=False))
        return 0
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_header.py — inlina includes/header.html dentro ogni pagina HTML del sito.

PERCHE':
    Fino al 4/9/2026 l'header veniva iniettato lato client con
    fetch("/includes/header.html"). Risultato: i ~40 link di navigazione
    NON erano presenti nell'HTML servito e Google non li usava per
    distribuire autorita' interna. Le guide raggiungibili solo dal menu
    stavano a posizione 67-94 (analisi GSC del 4/9/2026).

COSA FA:
    Sostituisce il blocco di injection con il contenuto reale di
    includes/header.html, racchiuso tra due marker HTML. E' idempotente:
    puoi rilanciarlo ogni volta che modifichi includes/header.html.

USO:
    python tools/build_header.py --check     # non scrive nulla, dice cosa farebbe
    python tools/build_header.py             # applica a tutto il sito

NOTA: includes/header.html resta la UNICA fonte di verita'.
      Non modificare mai l'header dentro le singole pagine.
"""
import os, re, sys, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEADER_SRC = os.path.join(ROOT, "includes", "header.html")

START = "<!-- ATB:HEADER:START | generato da tools/build_header.py | NON modificare a mano: edita includes/header.html e rilancia lo script -->"
END   = "<!-- ATB:HEADER:END -->"

SKIP_DIRS = {".git", "_to_delete", "includes", "tools", "img", "css", "js",
             "monetizzazione", "node_modules"}
SKIP_FILES = {"404.html", "google4334dc45e05ecb0d.html"}

# pattern 1: injection originale via fetch (tutte le varianti presenti nel repo)
RE_FETCH = re.compile(
    r'<div id="header">\s*</div>\s*<script>\s*fetch\(\s*["\']/includes/header\.html["\']\s*\).*?</script>',
    re.DOTALL | re.IGNORECASE)
# pattern 2: blocco gia' generato da questo script (per i rilanci)
RE_BLOCK = re.compile(re.escape(START) + r".*?" + re.escape(END), re.DOTALL)

def is_stub(html):
    """Pagine-ponte 'pagina spostata': non hanno header, vanno lasciate stare."""
    return 'http-equiv="refresh"' in html and len(html) < 2000

def main():
    check = "--check" in sys.argv

    if not os.path.isfile(HEADER_SRC):
        sys.exit("ERRORE: includes/header.html non trovato")
    header = open(HEADER_SRC, encoding="utf-8").read().strip()
    block = f'{START}\n<div id="header">\n{header}\n</div>\n{END}'
    print(f"header sorgente: {len(header):,} byte "
          f"(md5 {hashlib.md5(header.encode()).hexdigest()[:8]})")

    skip = set(SKIP_DIRS)
    changed = fresh = stub = nohdr = 0

    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in skip]
        for fn in sorted(filenames):
            if not fn.endswith(".html") or fn in SKIP_FILES:
                continue
            path = os.path.join(dirpath, fn)
            rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
            html = open(path, encoding="utf-8").read()

            if is_stub(html):
                stub += 1
                continue

            if RE_BLOCK.search(html):
                new = RE_BLOCK.sub(lambda m: block, html, count=1)
                kind = "aggiornato"
            elif RE_FETCH.search(html):
                new = RE_FETCH.sub(lambda m: block, html, count=1)
                kind = "convertito"
            else:
                nohdr += 1
                print(f"  [!] nessun header trovato: {rel}")
                continue

            if new == html:
                fresh += 1
                continue
            if not check:
                open(path, "w", encoding="utf-8", newline="").write(new)
            changed += 1
            print(f"  [{kind}] {rel}")

    print()
    print(f"{'SIMULAZIONE — nessun file scritto' if check else 'APPLICATO'}")
    print(f"  modificate      : {changed}")
    print(f"  gia' aggiornate : {fresh}")
    print(f"  stub saltate    : {stub}")
    print(f"  senza header    : {nohdr}")

if __name__ == "__main__":
    main()

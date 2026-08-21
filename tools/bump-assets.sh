#!/bin/sh
# bump-assets.sh - cache busting automatico per alextoolsbox.it
#
# Riscrive il ?v=... degli asset versionati in tutti gli .html usando l'hash
# del contenuto del file: la versione cambia se e solo se il file cambia.
#
# NESSUNA dipendenza esterna: usa solo git, grep e sed (gia' presenti in Git
# Bash su Windows). Volutamente NON usa Python: su Windows l'alias del
# Microsoft Store intercetta "python" e fa fallire tutto.
#
# Uso:
#   sh tools/bump-assets.sh           aggiorna gli .html nel working tree
#   sh tools/bump-assets.sh --stage   come sopra + git add (usato dal pre-commit hook)
#   sh tools/bump-assets.sh --check   non scrive nulla; exit 1 se disallineato
#
# Per aggiungere un asset: mettilo in ASSETS qui sotto. Fine.

ASSETS="css/style.css js/promo.js"

case "$1" in
    --stage) MODE=stage ;;
    --check) MODE=check ;;
    "")      MODE=write ;;
    *)       echo "uso: $0 [--stage|--check]" >&2; exit 2 ;;
esac

GIT="git --no-optional-locks"
ROOT=$($GIT rev-parse --show-toplevel) || exit 1
cd "$ROOT" || exit 1

rc=0
touched=""

for asset in $ASSETS; do
    # hash del contenuto: prima l'oid staged (cio' che verra' davvero
    # committato), altrimenti il file su disco
    oid=$($GIT rev-parse ":$asset" 2>/dev/null)
    [ -z "$oid" ] && oid=$($GIT hash-object "$asset" 2>/dev/null)
    if [ -z "$oid" ]; then
        echo "bump-assets: asset mancante, ignorato: $asset" >&2
        continue
    fi
    v=$(printf '%s' "$oid" | cut -c1-8)

    # html che citano l'asset ma NON con la versione giusta
    stale=$(grep -rl --include='*.html' --exclude-dir=.git \
                --exclude-dir=node_modules --exclude-dir=_to_delete \
                -F "$asset" . 2>/dev/null \
            | xargs -r grep -L -F "$asset?v=$v" 2>/dev/null)

    if [ -z "$stale" ]; then
        echo "bump-assets: $asset -> ?v=$v (gia' allineato)"
        continue
    fi

    n=$(printf '%s\n' "$stale" | wc -l | tr -d ' ')

    if [ "$MODE" = check ]; then
        echo "bump-assets: $asset -> ?v=$v ($n file DA AGGIORNARE)"
        rc=1
        continue
    fi

    esc=$(printf '%s' "$asset" | sed 's/\./\\./g')
    printf '%s\n' "$stale" | while IFS= read -r f; do
        [ -n "$f" ] && sed -i -E "s#($esc)(\\?v=[^\"]*)?#\\1?v=$v#g" "$f"
    done

    echo "bump-assets: $asset -> ?v=$v ($n file aggiornati)"
    touched="$touched $stale"
done

if [ "$MODE" = check ] && [ "$rc" != 0 ]; then
    echo "Esegui: sh tools/bump-assets.sh" >&2
fi

if [ "$MODE" = stage ] && [ -n "$touched" ]; then
    # shellcheck disable=SC2086
    $GIT add -- $touched || exit 1
    echo "bump-assets: file ri-aggiunti allo staging."
fi

exit $rc

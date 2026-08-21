#!/bin/sh
# Reinstalla il pre-commit hook (da rilanciare dopo ogni clone del repo).
ROOT="$(git rev-parse --show-toplevel)" || exit 1
cp "$ROOT/tools/pre-commit" "$ROOT/.git/hooks/pre-commit"
chmod +x "$ROOT/.git/hooks/pre-commit"
echo "Hook pre-commit installato in .git/hooks/"

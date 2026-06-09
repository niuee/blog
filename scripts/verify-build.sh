#!/usr/bin/env bash
set -euo pipefail
BASE=../main/dist
NEW=dist

echo "== English pages in legacy baseline that must exist in the new build =="
missing=0
while IFS= read -r f; do
  rel="${f#"$BASE"/}"
  # Skip legacy zh-tw SUFFIX pages (intentionally moved to /zh-tw/ prefix)
  case "$rel" in
    *"/zh-tw/"*) continue ;;
  esac
  if [[ "$rel" == */index.html && ! -f "$NEW/$rel" ]]; then
    echo "MISSING: $rel"; missing=$((missing+1))
  fi
done < <(find "$BASE" -name index.html)
echo "missing English pages: $missing"
exit $missing

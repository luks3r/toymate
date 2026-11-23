#!/bin/sh
# Shallow, read-only reference checkouts for agents. Never edit or import from .repos/.
set -eu
cd "$(dirname "$0")/.."
mkdir -p .repos

sync() {
  name="$1"; url="$2"
  if [ -d ".repos/$name/.git" ]; then
    git -C ".repos/$name" fetch --depth 1 origin HEAD
    git -C ".repos/$name" reset --hard FETCH_HEAD
  else
    git clone --depth 1 "$url" ".repos/$name"
  fi
}

sync Lumiverse https://github.com/prolix-oc/Lumiverse.git
sync buttplug-js https://github.com/buttplugio/buttplug-js.git

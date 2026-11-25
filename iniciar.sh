#!/bin/sh
set -eu

CDPATH= cd "$(dirname "$0")"

run() {
  if "$@"; then
    return 0
  else
    status=$?
    echo "Error al ejecutar: $*" >&2
    return "$status"
  fi
}

run npm ci
run npx prisma generate
run npx prisma migrate deploy
exec npm run dev

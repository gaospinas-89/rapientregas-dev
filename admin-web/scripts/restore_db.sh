#!/usr/bin/env bash
set -euo pipefail

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "Error: pg_restore no esta instalado. Instala PostgreSQL client tools." >&2
  exit 1
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Error: define SUPABASE_DB_URL antes de ejecutar restore." >&2
  exit 1
fi

if [ $# -lt 1 ]; then
  echo "Uso: npm run restore:db -- <ruta_backup.dump.gz|ruta_backup.dump>" >&2
  exit 1
fi

INPUT_FILE="$1"
if [ ! -f "${INPUT_FILE}" ]; then
  echo "Error: no existe el archivo ${INPUT_FILE}" >&2
  exit 1
fi

TMP_FILE=""
RESTORE_FILE="${INPUT_FILE}"

if [[ "${INPUT_FILE}" == *.gz ]]; then
  TMP_FILE="$(mktemp /tmp/supabase_restore_XXXXXX.dump)"
  gunzip -c "${INPUT_FILE}" > "${TMP_FILE}"
  RESTORE_FILE="${TMP_FILE}"
fi

echo "Restaurando desde ${INPUT_FILE} ..."
pg_restore "${RESTORE_FILE}" \
  --dbname="${SUPABASE_DB_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --jobs=4

if [ -n "${TMP_FILE}" ] && [ -f "${TMP_FILE}" ]; then
  rm -f "${TMP_FILE}"
fi

echo "Restore completado."

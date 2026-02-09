#!/usr/bin/env bash
set -euo pipefail

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump no esta instalado. Instala PostgreSQL client tools." >&2
  exit 1
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Error: define SUPABASE_DB_URL antes de ejecutar backup." >&2
  echo "Ejemplo: export SUPABASE_DB_URL='postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require'" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d_%H%M%S)"
TARGET_FILE="${BACKUP_DIR}/supabase_${STAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "Creando backup en ${TARGET_FILE} ..."
pg_dump "${SUPABASE_DB_URL}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="${TARGET_FILE}"

gzip -f "${TARGET_FILE}"

# limpia backups viejos
find "${BACKUP_DIR}" -type f -name '*.dump.gz' -mtime +"${RETENTION_DAYS}" -delete

echo "Backup completado: ${TARGET_FILE}.gz"

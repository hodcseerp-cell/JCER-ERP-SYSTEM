#!/bin/bash
# ==============================================================================
# JCER College ERP - Automated Docker PostgreSQL Database Backup Script
# Usage:
#   chmod +x backup-postgres.sh
#   ./backup-postgres.sh
# Automated Cron example (Daily at 2:00 AM):
#   0 2 * * * /var/www/jcer-erp/Admission_process/scripts/backup-postgres.sh >> /var/log/postgres-backup.log 2>&1
# ==============================================================================

set -euo pipefail

# Project root directory containing docker-compose.yml
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups/postgres"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="${BACKUP_DIR}/jcer_erp_backup_${DATE}.sql.gz"

# Create secure backup directory with restricted permissions (700: owner only)
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting PostgreSQL Docker backup..."

# Source environment variables if .env exists
if [ -f "${PROJECT_DIR}/backend/.env" ]; then
    # Safely load DB_NAME and DB_USER without printing values
    export $(grep -E '^(DB_NAME|DB_USER)=' "${PROJECT_DIR}/backend/.env" | xargs)
fi

DB_NAME="${DB_NAME:-college_erp_db}"
DB_USER="${DB_USER:-erp_user}"

cd "${PROJECT_DIR}"

# Verify the PostgreSQL container is running
if ! docker compose ps --services --filter "status=running" | grep -q "^postgres$"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: PostgreSQL container 'postgres' is not running!" >&2
    exit 1
fi

# Execute pg_dump inside the container and compress directly (never deletes or alters data)
docker compose exec -T postgres pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${FILENAME}"

# Restrict backup file permissions (600: read/write owner only)
chmod 600 "${FILENAME}"

# Verify non-empty file created
if [ ! -s "${FILENAME}" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup file was created but is empty!" >&2
    rm -f "${FILENAME}"
    exit 1
fi

BACKUP_SIZE=$(du -h "${FILENAME}" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup successfully created: ${FILENAME} (${BACKUP_SIZE})"

# Retention Policy: Delete backups older than 14 days
find "${BACKUP_DIR}" -type f -name "jcer_erp_backup_*.sql.gz" -mtime +14 -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Retention check completed (retaining last 14 days)."


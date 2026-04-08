#!/bin/bash
# Hot backup script for PocketBase with a short downtime window.

set -euo pipefail

DATA_DIR="./pb_data"
BACKUP_DIR="./backups"
PB_BIN="./pocketbase/pocketbase"
PB_HTTP="127.0.0.1:8090"
KEEP="14"

usage() {
  cat <<EOF
Usage: ./backup-pocketbase.sh [options]

Options:
  --data-dir <path>     PocketBase data directory (default: ./pb_data)
  --backup-dir <path>   Backup output directory (default: ./backups)
  --pb-bin <path>       PocketBase binary path (default: ./pocketbase/pocketbase)
  --http <host:port>    PocketBase bind address (default: 127.0.0.1:8090)
  --keep <count>        Number of newest backups to keep (default: 14)
  -h, --help            Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --data-dir)
      DATA_DIR="$2"
      shift 2
      ;;
    --backup-dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --pb-bin)
      PB_BIN="$2"
      shift 2
      ;;
    --http)
      PB_HTTP="$2"
      shift 2
      ;;
    --keep)
      KEEP="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ ! -d "$DATA_DIR" ]]; then
  echo "Data directory not found: $DATA_DIR"
  exit 1
fi

if ! [[ "$KEEP" =~ ^[0-9]+$ ]]; then
  echo "--keep must be a non-negative integer"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

PORT="${PB_HTTP##*:}"
PB_PID=""
WAS_RUNNING=0

if command -v lsof >/dev/null 2>&1; then
  CANDIDATE_PID="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
  if [[ -n "$CANDIDATE_PID" ]]; then
    CMDLINE="$(ps -p "$CANDIDATE_PID" -o command= 2>/dev/null || true)"
    if [[ "$CMDLINE" == *"pocketbase"* ]]; then
      PB_PID="$CANDIDATE_PID"
      WAS_RUNNING=1
    fi
  fi
fi

if [[ "$WAS_RUNNING" -eq 1 ]]; then
  echo "Stopping PocketBase (PID: $PB_PID)"
  kill -TERM "$PB_PID" || true

  for _ in {1..20}; do
    if ! kill -0 "$PB_PID" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if kill -0 "$PB_PID" >/dev/null 2>&1; then
    echo "PocketBase did not stop gracefully, forcing shutdown"
    kill -KILL "$PB_PID" || true
  fi

  echo "PocketBase stopped"
else
  echo "PocketBase not detected on port $PORT; backing up data directory directly"
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ARCHIVE_PATH="$BACKUP_DIR/pb_data_backup_${TIMESTAMP}.tar.gz"

echo "Creating backup archive: $ARCHIVE_PATH"
tar -czf "$ARCHIVE_PATH" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$ARCHIVE_PATH" > "${ARCHIVE_PATH}.sha256"
  echo "Checksum written: ${ARCHIVE_PATH}.sha256"
fi

if [[ "$KEEP" -gt 0 ]]; then
  echo "Applying retention (keeping newest $KEEP backup files)"
  mapfile -t OLD_BACKUPS < <(ls -1t "$BACKUP_DIR"/pb_data_backup_*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) || true)
  if [[ "${#OLD_BACKUPS[@]}" -gt 0 ]]; then
    rm -f "${OLD_BACKUPS[@]}"
    for old in "${OLD_BACKUPS[@]}"; do
      rm -f "${old}.sha256"
    done
    echo "Removed ${#OLD_BACKUPS[@]} old backup(s)"
  fi
fi

if [[ "$WAS_RUNNING" -eq 1 ]]; then
  echo "Restarting PocketBase"
  nohup "$PB_BIN" serve --http="$PB_HTTP" --dir="$DATA_DIR" > "$BACKUP_DIR/pocketbase_restart.log" 2>&1 &
  NEW_PID=$!

  HEALTH_URL="http://${PB_HTTP}/api/health"
  for _ in {1..20}; do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      echo "PocketBase restarted successfully (PID: $NEW_PID)"
      break
    fi
    sleep 1
  done

  if ! curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "Warning: PocketBase restart health check failed. Check $BACKUP_DIR/pocketbase_restart.log"
    exit 1
  fi
fi

echo "Backup complete: $ARCHIVE_PATH"

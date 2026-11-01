#!/bin/sh
# Scheduled PostgreSQL backups for the Docker Compose stack.
# Runs inside a postgres image; PGHOST/PGUSER/PGPASSWORD/PGDATABASE come from
# the compose environment. Manifests use format 2 and verify with:
#   node tools/verify-backup.mjs <manifest>
set -eu

interval=${BACKUP_INTERVAL_SECONDS:-86400}
retention=${BACKUP_RETENTION_DAYS:-7}
dir=${BACKUP_DIR:-/backups}
mkdir -p "$dir"

while :; do
  stamp=$(date -u +%Y-%m-%dT%H-%M-%SZ)
  prefix="alumniconnect-$stamp"
  dump="$dir/$prefix.dump"

  if pg_dump --format=custom --no-owner --no-privileges --file="$dump"; then
    bytes=$(wc -c < "$dump" | tr -d ' ')
    sha=$(sha256sum "$dump" | awk '{print $1}')
    created=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    cat > "$dir/$prefix.json" <<EOF
{
  "format": 2,
  "driver": "postgres",
  "createdAt": "$created",
  "source": "postgresql://$PGUSER@$PGHOST/$PGDATABASE",
  "files": [
    { "file": "$prefix.dump", "bytes": $bytes, "sha256": "$sha" }
  ],
  "restore": "pg_restore --clean --if-exists --no-owner --no-privileges -d \"\$DATABASE_URL\" $prefix.dump"
}
EOF
    echo "[backup] created $prefix ($bytes bytes)"
  else
    echo "[backup] pg_dump failed, skipping manifest" >&2
    rm -f "$dump"
  fi

  find "$dir" -type f -name 'alumniconnect-*' -mtime "+$retention" -delete
  sleep "$interval"
done

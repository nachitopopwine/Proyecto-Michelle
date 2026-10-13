#!/bin/sh
# Respaldo de MongoDB en ./backups (comprimido, con fecha). Conserva los últimos 14.
# Uso: sh scripts/backup-mongo.sh   (programarlo diario con cron en el servidor)
# Restaurar: docker compose exec mongo mongorestore --gzip --drop --archive=/backups/<archivo>
set -e
# Evita que Git Bash (Windows) convierta /backups en una ruta de Windows
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")/.."
FILE="michelle-$(date +%Y%m%d-%H%M%S).archive.gz"
mkdir -p backups
docker compose exec -T mongo mongodump --db michelle --gzip --archive="/backups/$FILE"
echo "Respaldo creado: backups/$FILE"
ls -1t backups/michelle-*.archive.gz | tail -n +15 | xargs -r rm --

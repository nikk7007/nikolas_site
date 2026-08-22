#!/usr/bin/env bash
# Deploy do site pra Hostinger via rsync (usa o host "Hostinger" do ~/.ssh/config).
#
#   ./ops/deploy.sh          # simulação (dry-run): mostra o que mudaria
#   ./ops/deploy.sh --go     # deploy de verdade
#
# O repo inteiro É o docroot; o que não deve subir está listado nos --exclude.
# Segredos (.env, .env.form, apps.json) vivem ACIMA do docroot no servidor e
# nunca são tocados por este script.
set -euo pipefail

HOST="Hostinger"
DEST="domains/nikolasleme.com.br/public_html/"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

FLAGS=(-rlptzv --delete)
[[ "${1:-}" == "--go" ]] || FLAGS+=(--dry-run)

rsync "${FLAGS[@]}" \
  --exclude '.git' \
  --exclude '.gitignore' \
  --exclude 'ops/' \
  --exclude 'api/email/tests/' \
  --exclude 'api/email/.github/' \
  --exclude 'api/email/composer.lock' \
  --exclude 'api/email/phpunit.xml' \
  --exclude '.env*' \
  --exclude 'apps.json' \
  --exclude 'form/api/secrets.php' \
  "$ROOT/" "$HOST:$DEST"

if [[ "${1:-}" == "--go" ]]; then
  echo
  echo "✔ Deploy concluído: https://nikolasleme.com.br"
else
  echo
  echo "(dry-run — nada foi enviado. Rode com --go pra valer.)"
fi

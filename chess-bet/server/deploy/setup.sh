#!/usr/bin/env bash
# Установка игрового сервера chessBet на чистую Ubuntu 24.04 (запускать от root)
set -euo pipefail

REPO="https://github.com/serwmwser/chessBet.git"
APP="/opt/chessbet"
ENVF="/etc/chessbet.env"
IP="${1:-$(curl -4 -fsS https://api.ipify.org)}"
HOST="$(echo "$IP" | tr . -).sslip.io"

echo ">>> 1/7 Обновление системы и базовые пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ufw ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https

echo ">>> 2/7 Node.js 20"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v

echo ">>> 3/7 Caddy (HTTPS)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo ">>> 4/7 Пользователь и код"
id chess >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin chess
if [ -d "$APP/.git" ]; then
  git -C "$APP" pull --ff-only
else
  git clone --depth 1 "$REPO" "$APP"
fi
mkdir -p "$APP/chess-bet/server/data"
cd "$APP/chess-bet/server"
npm ci
chown -R chess:chess "$APP"

echo ">>> 5/7 Файл настроек $ENVF (ключ оракула вы добавите сами)"
if [ ! -f "$ENVF" ]; then
  cat > "$ENVF" <<ENV
RPC_URL=https://polygon.drpc.org
ESCROW=0xaf8714656261dc770A41857706FF4b2f495e92e9
PORT=8080
ALLOWED_ORIGINS=https://himeet.online
ENV
fi
chown root:chess "$ENVF"
chmod 640 "$ENVF"

echo ">>> 6/7 Служба chessbet и Caddy"
cat > /etc/systemd/system/chessbet.service <<UNIT
[Unit]
Description=chessBet game server
After=network-online.target
Wants=network-online.target

[Service]
User=chess
WorkingDirectory=$APP/chess-bet/server
EnvironmentFile=$ENVF
ExecStart=/usr/bin/npm run start:prod
Restart=always
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/caddy/Caddyfile <<CADDY
$HOST {
    reverse_proxy 127.0.0.1:8080
}
CADDY
systemctl daemon-reload
systemctl enable chessbet
systemctl reload caddy || systemctl restart caddy

echo ">>> 7/7 Файрвол"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo
echo "ГОТОВО. Адрес сервера: https://$HOST"
echo "Дальше: добавьте ORACLE_PK в $ENVF и запустите: systemctl start chessbet"
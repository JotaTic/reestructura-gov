#!/bin/bash
set -e

echo "=========================================="
echo " ReEstructura.Gov — Deploy automático"
echo "=========================================="

# --- Variables ---
APP_DIR="/opt/reestructura"
REPO="https://github.com/JotaTic/reestructura-gov.git"
DOMAIN="reestructuracion.corpofuturo.org"
BACKEND_PORT=8000
FRONTEND_PORT=3000

# --- 1. Swap (necesario para npm build en 1GB RAM) ---
echo "[1/10] Configurando swap..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap de 2GB creado."
else
    echo "Swap ya existe."
fi

# --- 2. Dependencias del sistema ---
echo "[2/10] Instalando dependencias..."
apt-get update -qq
apt-get install -y -qq git python3-venv python3-pip nginx certbot python3-certbot-nginx curl > /dev/null 2>&1

# Actualizar Node a v20 LTS si es v18
NODE_MAJOR=$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 20 ] 2>/dev/null; then
    echo "Actualizando Node.js a v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null 2>&1
fi
echo "Node $(node -v) / npm $(npm -v)"

# --- 3. Clonar o actualizar repo ---
echo "[3/10] Clonando repositorio..."
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
    echo "Repo actualizado."
else
    rm -rf "$APP_DIR"
    git clone "$REPO" "$APP_DIR"
    echo "Repo clonado."
fi
cd "$APP_DIR"

# --- 4. Backend: Python venv + dependencias ---
echo "[4/10] Configurando backend..."
cd "$APP_DIR/plataforma/backend"

python3 -m venv .venv
source .venv/bin/activate

pip install --upgrade pip -q
pip install -r requirements.txt -q
pip install gunicorn -q

# Settings de producción
cat > .env 2>/dev/null << 'ENVEOF'
DJANGO_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=64.23.248.47,reestructuracion.corpofuturo.org,localhost
CORS_ALLOWED_ORIGINS=http://64.23.248.47,https://reestructuracion.corpofuturo.org,http://reestructuracion.corpofuturo.org
CSRF_TRUSTED_ORIGINS=http://64.23.248.47,https://reestructuracion.corpofuturo.org,http://reestructuracion.corpofuturo.org
ENVEOF

# Generar .env con secret key real
SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
cat > .env << ENVEOF
DJANGO_SECRET_KEY=$SECRET
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=64.23.248.47,reestructuracion.corpofuturo.org,localhost
CORS_ALLOWED_ORIGINS=http://64.23.248.47,https://reestructuracion.corpofuturo.org,http://reestructuracion.corpofuturo.org
CSRF_TRUSTED_ORIGINS=http://64.23.248.47,https://reestructuracion.corpofuturo.org,http://reestructuracion.corpofuturo.org
ENVEOF

echo "Migraciones..."
python manage.py migrate --no-input
python manage.py collectstatic --no-input 2>/dev/null || true

echo "Seeds..."
python manage.py seed_users 2>/dev/null || true
python manage.py seed_salary_scales 2>/dev/null || true
python manage.py seed_prestational_factors 2>/dev/null || true
python manage.py seed_talento_demo 2>/dev/null || true
python manage.py seed_mfmp_demo 2>/dev/null || true
python manage.py loaddata apps/jota/fixtures/seed_jota.json 2>/dev/null || true

deactivate

# --- 5. Frontend: build ---
echo "[5/10] Construyendo frontend (puede tardar 2-3 min)..."
cd "$APP_DIR/plataforma/frontend"
npm install --legacy-peer-deps 2>&1 | tail -3

# Configurar API URL para producción (HTTPS)
cat > .env.production << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://reestructuracion.corpofuturo.org/api
ENVEOF

npm run build 2>&1 | tail -10
echo "Frontend compilado."

# --- 6. Systemd: backend (Gunicorn) ---
echo "[6/10] Configurando servicio backend..."
cat > /etc/systemd/system/reestructura-backend.service << 'SVCEOF'
[Unit]
Description=ReEstructura.Gov Backend (Django + Gunicorn)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/reestructura/plataforma/backend
EnvironmentFile=/opt/reestructura/plataforma/backend/.env
ExecStart=/opt/reestructura/plataforma/backend/.venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 2 --timeout 120
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

# --- 7. Systemd: frontend (Next.js) ---
echo "[7/10] Configurando servicio frontend..."
cat > /etc/systemd/system/reestructura-frontend.service << 'SVCEOF'
[Unit]
Description=ReEstructura.Gov Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/reestructura/plataforma/frontend
ExecStart=/usr/bin/npm start -- -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SVCEOF

# --- 8. Nginx ---
echo "[8/10] Configurando Nginx..."
cat > /etc/nginx/sites-available/reestructura << NGXEOF
server {
    listen 80;
    server_name reestructuracion.corpofuturo.org 64.23.248.47;

    client_max_body_size 25M;

    # API y Admin → Django
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Archivos estáticos de Django
    location /static/ {
        alias /opt/reestructura/plataforma/backend/staticfiles/;
        expires 30d;
    }

    # Media (documentos subidos)
    location /media/ {
        alias /opt/reestructura/plataforma/backend/media/;
        expires 7d;
    }

    # Todo lo demás → Next.js
    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGXEOF

# Activar site
ln -sf /etc/nginx/sites-available/reestructura /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null
nginx -t 2>&1

# --- 9. Arrancar servicios ---
echo "[9/11] Arrancando servicios..."
systemctl daemon-reload
systemctl enable reestructura-backend reestructura-frontend nginx
systemctl restart reestructura-backend
systemctl restart reestructura-frontend
systemctl restart nginx

sleep 3

# --- 10. SSL con Let's Encrypt ---
echo "[10/11] Configurando HTTPS (Let's Encrypt)..."
if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    echo "Certificado SSL ya existe. Aplicando a nginx..."
    certbot --nginx -d "$DOMAIN" --redirect --non-interactive 2>&1 | tail -5
else
    echo "Obteniendo certificado SSL nuevo..."
    certbot --nginx -d "$DOMAIN" --redirect --non-interactive --agree-tos --register-unsafely-without-email 2>&1 | tail -5
fi
echo "HTTPS configurado."

# --- 11. Verificar ---
echo "[11/11] Verificando..."
echo ""
echo "Backend:"
curl -s -o /dev/null -w "  HTTP %{http_code}" http://127.0.0.1:8000/api/auth/login/ || echo "  ERROR"
echo ""
echo "Frontend:"
curl -s -o /dev/null -w "  HTTP %{http_code}" http://127.0.0.1:3000/ || echo "  ERROR"
echo ""
echo "Nginx (HTTPS):"
curl -s -o /dev/null -w "  HTTP %{http_code}" https://$DOMAIN/ || echo "  ERROR"
echo ""
echo "Login test:"
LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://$DOMAIN/api/auth/login/" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}')
if [ "$LOGIN_CODE" = "200" ]; then
    echo "  Login OK (HTTP $LOGIN_CODE)"
else
    echo "  LOGIN FAILED (HTTP $LOGIN_CODE) — verificar cookies/CSRF/SSL"
fi
echo ""

echo ""
echo "=========================================="
echo " DEPLOY COMPLETO"
echo "=========================================="
echo ""
echo " URL:      https://reestructuracion.corpofuturo.org"
echo " API:      https://reestructuracion.corpofuturo.org/api/"
echo " Admin:    https://reestructuracion.corpofuturo.org/admin/"
echo ""
echo " Login:    admin / admin123"
echo ""
echo "=========================================="

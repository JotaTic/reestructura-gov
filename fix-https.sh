#!/bin/bash
set -e
echo "=== Arreglando HTTPS ==="

# 1. Frontend env con HTTPS
cat > /opt/reestructura/plataforma/frontend/.env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://reestructuracion.corpofuturo.org/api
EOF
echo "[1/4] .env.production actualizado"

# 2. Rebuild frontend
cd /opt/reestructura/plataforma/frontend
NODE_OPTIONS="--max-old-space-size=512" npm run build 2>&1 | tail -3
echo "[2/4] Frontend recompilado"

# 3. Matar servicios viejos
systemctl stop reestructuracion-backend 2>/dev/null || true
systemctl disable reestructuracion-backend 2>/dev/null || true
systemctl stop reestructuracion-frontend 2>/dev/null || true
systemctl disable reestructuracion-frontend 2>/dev/null || true
rm -f /etc/systemd/system/reestructuracion-backend.service 2>/dev/null
rm -f /etc/systemd/system/reestructuracion-frontend.service 2>/dev/null
systemctl daemon-reload
echo "[3/4] Servicios viejos eliminados"

# 4. Reiniciar servicios nuevos
systemctl restart reestructura-backend
systemctl restart reestructura-frontend
systemctl restart nginx
sleep 3
echo "[4/4] Servicios reiniciados"

# Verificar
echo ""
echo "=== Verificando ==="
curl -s -o /dev/null -w "Backend: HTTP %{http_code}\n" http://127.0.0.1:8000/api/auth/login/
curl -s -o /dev/null -w "Frontend: HTTP %{http_code}\n" http://127.0.0.1:3000/
curl -s -o /dev/null -w "Nginx HTTPS: HTTP %{http_code}\n" https://reestructuracion.corpofuturo.org/
echo ""
echo "=== LISTO ==="
echo "Abre: https://reestructuracion.corpofuturo.org"
echo "Login: admin / admin123"

# ReEstructura.Gov — Plataforma de Reestructuración de Entidades Públicas

Plataforma web (SaaS + on-premise) para acompañar los procesos de diseño y rediseño institucional de entidades públicas colombianas, siguiendo la *Guía de Diseño y Rediseño Institucional* de Función Pública y el marco legal aplicable (Ley 489/1998, Ley 790/2002, Ley 909/2004, Ley 1437/2011, Decreto 1083/2015, Decreto 785/2005, entre otros).

## Stack

- **Backend**: Django 5 + Django REST Framework + PostgreSQL 16
- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui + AG Grid
- **Auth (posterior)**: Keycloak (OIDC/SSO)
- **Contenedores**: Docker + docker-compose
- **Responsive**: mobile-first

## Estructura del repo

```
plataforma/
├── backend/           # Django project
│   ├── config/        # settings, urls, wsgi, asgi
│   ├── apps/
│   │   ├── core/      # Tenant, Entity, Department, User
│   │   ├── cargas/    # Módulo 10 — Matriz de Cargas de Trabajo ⭐
│   │   ├── nomenclatura/  # Catálogo Decreto 785/2005 y 2489/2006
│   │   └── ...        # (diagnóstico, diseño, actos, etc. en próximos sprints)
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/          # Next.js app
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── types/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Módulos (roadmap)

| # | Módulo | Estado |
|---|--------|--------|
| 10 | Matriz de Cargas de Trabajo (Anexo 5) | 🚧 En construcción |
| 1 | IAM & Multi-tenant (Keycloak) | ⏳ Próximo |
| 2 | Entity Profile & Onboarding | ⏳ |
| 5 | Legal Knowledge Base | ⏳ |
| 6 | Diagnóstico (DOFA, marco legal) | ⏳ |
| 7 | Análisis Financiero | ⏳ |
| 8 | Procesos & Cadena de Valor | ⏳ |
| 9 | Estructura Orgánica | ⏳ |
| 11 | Planta de Personal | ⏳ |
| 12 | Manual de Funciones | ⏳ |
| 13 | Retén Social | ⏳ |
| 14 | Generador de Actos Administrativos | ⏳ |

## Ejecución local (Docker)

```bash
cd plataforma
docker-compose up --build
```

- Backend: http://localhost:8000/api/
- Frontend: http://localhost:3000/
- Admin Django: http://localhost:8000/admin/
- Postgres: localhost:5432

## Ejecución local (sin Docker)

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py loaddata apps/nomenclatura/fixtures/decreto_785_2005.json
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

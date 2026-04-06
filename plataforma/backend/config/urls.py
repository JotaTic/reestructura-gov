from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.core.urls')),
    path('api/', include('apps.nomenclatura.urls')),
    path('api/', include('apps.cargas.urls')),
    path('api/', include('apps.planta.urls')),
    path('api/', include('apps.diagnostico.urls')),
    path('api/', include('apps.procesos.urls')),
    path('api/', include('apps.actos.urls')),
    path('api/', include('apps.legal.urls')),
    path('api/', include('apps.financiero.urls')),
    path('api/', include('apps.reten.urls')),
    path('api/', include('apps.jota.urls')),
    path('api/', include('apps.talento.urls')),
    path('api/', include('apps.nomina.urls')),
    path('api/', include('apps.mfmp.urls')),
    # Sprint 3
    path('api/', include('apps.manual_legacy.urls')),
    path('api/', include('apps.procedimientos.urls')),
    path('api/', include('apps.mandatos.urls')),
    path('api/', include('apps.documentos.urls')),
    # Sprint 4
    path('api/', include('apps.analisis.urls')),
    path('api/', include('apps.common.urls')),
    # Sprint 5
    path('api/', include('apps.consultas.urls')),
    path('api/', include('apps.participacion.urls')),
    # Sprint 6
    path('api/', include('apps.simulador.urls')),
    path('api/', include('apps.notificaciones.urls')),
    path('api/dashboard/', include('apps.core.urls_dashboard')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

# Servir archivos de media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from django.contrib import admin
from django.urls import path, include
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
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

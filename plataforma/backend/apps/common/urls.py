from django.urls import path
from .views import validate_restructuring

urlpatterns = [
    path('validar/restructuring/<int:restructuring_id>/', validate_restructuring, name='validate-restructuring'),
]

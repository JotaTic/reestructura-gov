from django.urls import path
from .views_dashboard import dashboard

urlpatterns = [
    path('', dashboard, name='dashboard'),
]

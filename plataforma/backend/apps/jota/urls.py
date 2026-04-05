from django.urls import path
from .views import config_view, ask_view

urlpatterns = [
    path('jota/config/', config_view, name='jota-config'),
    path('jota/ask/', ask_view, name='jota-ask'),
]

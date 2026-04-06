from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'kind', 'message', 'read', 'created_at']
    list_filter = ['kind', 'read', 'entity']
    search_fields = ['message', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['read']

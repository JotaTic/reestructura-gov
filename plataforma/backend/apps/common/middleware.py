"""
Middleware que propaga `request.user` al thread-local de auditoría para que los
signals de `apps.common.signals` puedan registrarlo en `ChangeLog`.
"""
from .signals import set_audit_user


class AuditUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, 'user', None)
        set_audit_user(user if (user and user.is_authenticated) else None)
        try:
            return self.get_response(request)
        finally:
            set_audit_user(None)

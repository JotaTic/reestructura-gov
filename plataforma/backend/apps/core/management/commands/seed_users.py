"""
Crea/actualiza los grupos (perfiles) del equipo técnico y un usuario por grupo.

Los perfiles corresponden al numeral 2 — Fase 1 del prompt:
    Planeación, Talento Humano, Jurídica, Secretaría General, Financiera,
    Equipo Técnico y Consulta (solo lectura).
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand


ROLES: list[dict[str, str]] = [
    {
        'group': 'Administrador',
        'username': 'admin',
        'password': 'admin123',
        'email': 'admin@reestructura.gov.co',
        'first_name': 'Administrador',
        'last_name': 'Plataforma',
        'superuser': True,
    },
    {
        'group': 'Planeación',
        'username': 'planeacion',
        'password': 'planeacion123',
        'email': 'planeacion@entidad.gov.co',
        'first_name': 'Jefe',
        'last_name': 'de Planeación',
    },
    {
        'group': 'Talento Humano',
        'username': 'talento',
        'password': 'talento123',
        'email': 'talento@entidad.gov.co',
        'first_name': 'Jefe',
        'last_name': 'de Talento Humano',
    },
    {
        'group': 'Jurídica',
        'username': 'juridica',
        'password': 'juridica123',
        'email': 'juridica@entidad.gov.co',
        'first_name': 'Jefe',
        'last_name': 'Jurídica',
    },
    {
        'group': 'Secretaría General',
        'username': 'secretaria',
        'password': 'secretaria123',
        'email': 'secretaria@entidad.gov.co',
        'first_name': 'Secretario',
        'last_name': 'General',
    },
    {
        'group': 'Financiera',
        'username': 'financiera',
        'password': 'financiera123',
        'email': 'financiera@entidad.gov.co',
        'first_name': 'Jefe',
        'last_name': 'Financiera',
    },
    {
        'group': 'Equipo Técnico',
        'username': 'tecnico',
        'password': 'tecnico123',
        'email': 'tecnico@entidad.gov.co',
        'first_name': 'Consultor',
        'last_name': 'Técnico',
    },
    {
        'group': 'Consulta',
        'username': 'consulta',
        'password': 'consulta123',
        'email': 'consulta@entidad.gov.co',
        'first_name': 'Usuario',
        'last_name': 'de Consulta',
    },
]


class Command(BaseCommand):
    help = 'Crea grupos (perfiles) y un usuario de ejemplo por cada uno.'

    def handle(self, *args, **options):
        User = get_user_model()
        for role in ROLES:
            group, _ = Group.objects.get_or_create(name=role['group'])
            user, created = User.objects.get_or_create(
                username=role['username'],
                defaults={
                    'email': role['email'],
                    'first_name': role['first_name'],
                    'last_name': role['last_name'],
                    'is_staff': True,
                    'is_superuser': role.get('superuser', False),
                },
            )
            user.email = role['email']
            user.first_name = role['first_name']
            user.last_name = role['last_name']
            user.is_staff = True
            user.is_superuser = role.get('superuser', False)
            user.set_password(role['password'])
            user.save()
            user.groups.add(group)
            action = 'creado' if created else 'actualizado'
            self.stdout.write(
                self.style.SUCCESS(
                    f'{action.capitalize()}: {role["username"]} / {role["password"]} — {role["group"]}'
                )
            )
        self.stdout.write(self.style.SUCCESS('\nUsuarios y perfiles listos. Ingresa al admin en /admin/.'))

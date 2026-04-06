"""
Crea/actualiza los grupos del equipo técnico, un usuario por grupo y el set
de entidades permitidas por usuario. Llama a `seed_permissions` al final.

Sprint 0 — además:
- Asigna todas las entidades existentes a todos los usuarios (mientras no
  haya políticas afinadas por entidad).
- Crea un usuario de prueba `tenant_test` con acceso SOLO a la primera entidad,
  para validar el aislamiento multi-tenant.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.core.models import Entity, UserEntityAccess


ROLES: list[dict] = [
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
    help = 'Crea grupos, usuarios, accesos a entidades y matriz de permisos por defecto.'

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
            self.stdout.write(self.style.SUCCESS(
                f'{action.capitalize()}: {role["username"]} / {role["password"]} — {role["group"]}'
            ))

        # --- Entidades permitidas por usuario ---
        entities = list(Entity.objects.all())
        if entities:
            for role in ROLES:
                if role.get('superuser'):
                    continue
                user = User.objects.get(username=role['username'])
                for idx, ent in enumerate(entities):
                    UserEntityAccess.objects.get_or_create(
                        user=user, entity=ent,
                        defaults={'is_default': (idx == 0)},
                    )

            # Usuario de prueba aislado: solo primera entidad.
            tenant_test, _ = User.objects.get_or_create(
                username='tenant_test',
                defaults={
                    'email': 'tenant@test.local',
                    'first_name': 'Tenant',
                    'last_name': 'Test',
                    'is_staff': True,
                },
            )
            tenant_test.set_password('tenant123')
            tenant_test.save()
            tenant_test.groups.add(Group.objects.get(name='Consulta'))
            UserEntityAccess.objects.get_or_create(
                user=tenant_test, entity=entities[0],
                defaults={'is_default': True},
            )
            # Limpia accesos extra si los hubiera
            UserEntityAccess.objects.filter(user=tenant_test).exclude(
                entity=entities[0]
            ).delete()
            self.stdout.write(self.style.SUCCESS(
                f'Usuario de prueba aislado: tenant_test / tenant123 — acceso solo a {entities[0].name}'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                'No hay entidades; omito asignación de accesos y usuario de prueba.'
            ))

        # --- Matriz de permisos ---
        call_command('seed_permissions')

        self.stdout.write(self.style.SUCCESS(
            '\nUsuarios, accesos y matriz listos. Ingresa al admin en /admin/.'
        ))

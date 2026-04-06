"""
Seed de datos demo para el módulo de Hojas de vida (M15).

Siembra 5 empleados en la primera entidad existente con perfiles variados:
- 2 con pregrado
- 1 con maestría
- 1 técnico
- 1 bachiller
- Uno nacido en 1965 (mujer, cerca de pensión)
- Experiencias con is_public_sector=True (2-15 años)

Idempotente por id_number.
"""
from datetime import date
from django.core.management.base import BaseCommand


DEMO_EMPLOYEES = [
    {
        'id_type': 'CC',
        'id_number': '12345001',
        'full_name': 'Carlos Andrés Rodríguez Peña',
        'first_name': 'Carlos Andrés',
        'last_name': 'Rodríguez Peña',
        'birth_date': date(1985, 3, 14),
        'sex': 'M',
        'has_disability': False,
        'is_head_of_household': True,
        'email': 'carlos.rodriguez@demo.gov.co',
        'phone': '3101234567',
        'education': [
            {
                'level': 'PREGRADO',
                'institution': 'Universidad Nacional de Colombia',
                'program': 'Administración Pública',
                'title': 'Administrador Público',
                'graduation_date': date(2008, 11, 15),
            }
        ],
        'experience': [
            {
                'employer': 'Alcaldía Municipal de Bucaramanga',
                'position_name': 'Profesional Universitario',
                'sector': 'PUBLICO',
                'start_date': date(2009, 2, 1),
                'end_date': date(2018, 12, 31),
                'is_current': False,
                'is_public_sector': True,
            },
            {
                'employer': 'Gobernación de Santander',
                'position_name': 'Asesor de Planeación',
                'sector': 'PUBLICO',
                'start_date': date(2019, 1, 15),
                'end_date': None,
                'is_current': True,
                'is_public_sector': True,
            },
        ],
    },
    {
        'id_type': 'CC',
        'id_number': '12345002',
        'full_name': 'Ana María Gómez Torres',
        'first_name': 'Ana María',
        'last_name': 'Gómez Torres',
        'birth_date': date(1990, 7, 22),
        'sex': 'F',
        'has_disability': False,
        'is_head_of_household': True,
        'email': 'ana.gomez@demo.gov.co',
        'phone': '3209876543',
        'education': [
            {
                'level': 'PREGRADO',
                'institution': 'Universidad de Antioquia',
                'program': 'Economía',
                'title': 'Economista',
                'graduation_date': date(2013, 6, 20),
            }
        ],
        'experience': [
            {
                'employer': 'Secretaría de Hacienda Distrital',
                'position_name': 'Analista Financiero',
                'sector': 'PUBLICO',
                'start_date': date(2014, 3, 1),
                'end_date': date(2020, 5, 31),
                'is_current': False,
                'is_public_sector': True,
            },
            {
                'employer': 'Ministerio de Hacienda',
                'position_name': 'Profesional Especializado',
                'sector': 'PUBLICO',
                'start_date': date(2020, 8, 1),
                'end_date': None,
                'is_current': True,
                'is_public_sector': True,
            },
        ],
    },
    {
        'id_type': 'CC',
        'id_number': '12345003',
        'full_name': 'Luis Eduardo Vargas Mora',
        'first_name': 'Luis Eduardo',
        'last_name': 'Vargas Mora',
        'birth_date': date(1982, 11, 5),
        'sex': 'M',
        'has_disability': False,
        'is_head_of_household': False,
        'email': 'luis.vargas@demo.gov.co',
        'phone': '3158765432',
        'education': [
            {
                'level': 'PREGRADO',
                'institution': 'Universidad Externado de Colombia',
                'program': 'Derecho',
                'title': 'Abogado',
                'graduation_date': date(2006, 4, 10),
            },
            {
                'level': 'MAESTRIA',
                'institution': 'Universidad de los Andes',
                'program': 'Derecho Administrativo',
                'title': 'Magíster en Derecho Administrativo',
                'graduation_date': date(2010, 11, 30),
            },
        ],
        'experience': [
            {
                'employer': 'Consejo de Estado',
                'position_name': 'Magistrado Auxiliar',
                'sector': 'PUBLICO',
                'start_date': date(2007, 1, 15),
                'end_date': date(2013, 12, 31),
                'is_current': False,
                'is_public_sector': True,
            },
            {
                'employer': 'DAFP - Departamento Administrativo de la Función Pública',
                'position_name': 'Director de Empleo Público',
                'sector': 'PUBLICO',
                'start_date': date(2014, 2, 1),
                'end_date': None,
                'is_current': True,
                'is_public_sector': True,
            },
        ],
    },
    {
        'id_type': 'CC',
        'id_number': '12345004',
        'full_name': 'Sandra Milena López Cruz',
        'first_name': 'Sandra Milena',
        'last_name': 'López Cruz',
        'birth_date': date(1995, 4, 18),
        'sex': 'F',
        'has_disability': False,
        'is_head_of_household': False,
        'email': 'sandra.lopez@demo.gov.co',
        'phone': '3004567890',
        'education': [
            {
                'level': 'TECNICO',
                'institution': 'SENA',
                'program': 'Gestión Documental',
                'title': 'Técnico en Gestión Documental',
                'graduation_date': date(2015, 12, 15),
            }
        ],
        'experience': [
            {
                'employer': 'Alcaldía Municipal',
                'position_name': 'Auxiliar Administrativo',
                'sector': 'PUBLICO',
                'start_date': date(2016, 6, 1),
                'end_date': None,
                'is_current': True,
                'is_public_sector': True,
            },
        ],
    },
    {
        'id_type': 'CC',
        'id_number': '12345005',
        'full_name': 'Rosa Inés Castillo Bermúdez',
        'first_name': 'Rosa Inés',
        'last_name': 'Castillo Bermúdez',
        'birth_date': date(1965, 9, 3),  # ~60 años, cerca de pensión
        'sex': 'F',
        'has_disability': False,
        'is_head_of_household': True,
        'email': 'rosa.castillo@demo.gov.co',
        'phone': '3122223333',
        'education': [
            {
                'level': 'BACHILLERATO',
                'institution': 'Colegio Nacional',
                'program': 'Bachillerato Académico',
                'title': 'Bachiller Académico',
                'graduation_date': date(1983, 11, 30),
            }
        ],
        'experience': [
            {
                'employer': 'Alcaldía Municipal',
                'position_name': 'Secretaria',
                'sector': 'PUBLICO',
                'start_date': date(1990, 3, 1),
                'end_date': date(2008, 12, 31),
                'is_current': False,
                'is_public_sector': True,
            },
            {
                'employer': 'Gobernación Regional',
                'position_name': 'Auxiliar Administrativo',
                'sector': 'PUBLICO',
                'start_date': date(2009, 2, 1),
                'end_date': None,
                'is_current': True,
                'is_public_sector': True,
            },
        ],
    },
]


class Command(BaseCommand):
    help = 'Siembra 5 empleados demo en la primera entidad (idempotente).'

    def handle(self, *args, **options):
        from apps.core.models import Entity
        from apps.talento.models import Employee, EmployeeEducation, EmployeeExperience

        entity = Entity.objects.order_by('id').first()
        if entity is None:
            self.stdout.write(self.style.WARNING(
                'seed_talento_demo: No hay entidades registradas. Termina sin sembrar.'
            ))
            return

        self.stdout.write(f'Sembrando en entidad: {entity.name} (id={entity.id})')

        for emp_data in DEMO_EMPLOYEES:
            education_data = emp_data.pop('education', [])
            experience_data = emp_data.pop('experience', [])

            emp, created = Employee.objects.get_or_create(
                entity=entity,
                id_type=emp_data['id_type'],
                id_number=emp_data['id_number'],
                defaults={k: v for k, v in emp_data.items() if k not in ('id_type', 'id_number')},
            )

            if created:
                self.stdout.write(f'  + Empleado creado: {emp.full_name}')
            else:
                self.stdout.write(f'  = Empleado ya existe: {emp.full_name}')

            for edu in education_data:
                EmployeeEducation.objects.get_or_create(
                    employee=emp,
                    level=edu['level'],
                    program=edu['program'],
                    defaults={k: v for k, v in edu.items() if k not in ('level', 'program')},
                )

            for exp in experience_data:
                EmployeeExperience.objects.get_or_create(
                    employee=emp,
                    employer=exp['employer'],
                    start_date=exp['start_date'],
                    defaults={k: v for k, v in exp.items() if k not in ('employer', 'start_date')},
                )

        self.stdout.write(self.style.SUCCESS('seed_talento_demo: Completado.'))

"""
Script para poblar tablas de referencia de la plataforma ReEstructura.Gov.

Tablas que se llenan:
1. nomina.SalaryScale — Escala salarial 2026 orden nacional (Decreto 312/2026)
2. nomina.PrestationalFactor — Factores prestacionales 2025-2026
3. actos.ActTemplate — Plantillas de actos administrativos
4. jota.JotaIntent — Base de conocimiento FAQ del chatbot
5. core.GroupModelPermission — Matriz de permisos RBAC
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from decimal import Decimal
from django.contrib.auth.models import Group

# ============================================================================
# 1. ESCALA SALARIAL 2026 — ORDEN NACIONAL (Decreto 312 de 2026)
# ============================================================================
from apps.nomina.models import SalaryScale

SALARY_DATA_2026 = {
    'DIRECTIVO': {
        '01': 5293581, '02': 5919855, '03': 6250864, '04': 6643885,
        '05': 6814857, '06': 7117079, '07': 7542645, '08': 7708993,
        '09': 7994734, '10': 8588629, '11': 8721841, '12': 8997051,
        '13': 9386536, '14': 9892195, '15': 10098000, '16': 10237626,
        '17': 10797415, '18': 11693970, '19': 12592536, '20': 13847346,
        '21': 14037005, '22': 15532732, '23': 17060239, '24': 18409014,
        '25': 19848984, '26': 20881129, '27': 21916397, '28': 23137520,
    },
    'ASESOR': {
        '01': 5166213, '02': 5586678, '03': 6096859, '04': 6938944,
        '05': 7117079, '06': 8058629, '07': 8997051, '08': 9846003,
        '09': 10347469, '10': 10760056, '11': 11313849, '12': 11882975,
        '13': 13028467, '14': 13752253, '15': 14035181, '16': 15422173,
        '17': 17038830, '18': 18494549,
    },
    'PROFESIONAL': {
        '01': 3119094, '02': 3447755, '03': 3603330, '04': 3794233,
        '05': 4013577, '06': 4153336, '07': 4358947, '08': 4575673,
        '09': 4772635, '10': 4935488, '11': 5143280, '12': 5456747,
        '13': 5912154, '14': 6326832, '15': 6994971, '16': 7541568,
        '17': 7932386, '18': 8542780, '19': 9189072, '20': 9891819,
        '21': 10543046, '22': 11339380, '23': 11981390, '24': 12920000,
    },
    'TECNICO': {
        '02': 1523145, '03': 1634493, '04': 1731869, '05': 1842350,
        '06': 2217402, '07': 2362842, '08': 2422734, '09': 2666265,
        '10': 2790103, '11': 2941401, '12': 3119094, '13': 3326260,
        '14': 3447755, '15': 3603330, '16': 4071270, '17': 4358390,
        '18': 4789503,
    },
    'ASISTENCIAL': {
        '06': 1523145, '07': 1634493, '08': 1731869, '09': 1842350,
        '10': 2024954, '11': 2185702, '12': 2346870, '13': 2422734,
        '14': 2475809, '15': 2552761, '16': 2666265, '17': 2722570,
        '18': 2790103, '19': 2862077, '20': 2951000, '21': 3075194,
        '22': 3263350, '23': 3603330, '24': 3930191, '25': 4358947,
        '26': 4741981,
    },
}

# Calcular 2025 dividiendo por 1.07 (incremento 7%)
SALARY_DATA_2025 = {}
for level, grades in SALARY_DATA_2026.items():
    SALARY_DATA_2025[level] = {
        g: round(v / 1.07) for g, v in grades.items()
    }

print("=== ESCALAS SALARIALES ===")
created_sal = 0
updated_sal = 0

for year, data in [(2025, SALARY_DATA_2025), (2026, SALARY_DATA_2026)]:
    for level, grades in data.items():
        for grade, salary in grades.items():
            # El código corresponde al nivel (series del Dec. 2489/2006)
            code_prefix = {'DIRECTIVO': '0', 'ASESOR': '1', 'PROFESIONAL': '2',
                          'TECNICO': '3', 'ASISTENCIAL': '4'}[level]
            obj, created = SalaryScale.objects.update_or_create(
                order='NACIONAL',
                year=year,
                level=level,
                grade=grade,
                code=code_prefix,
                defaults={'base_salary': Decimal(str(salary))}
            )
            if created:
                created_sal += 1
            else:
                updated_sal += 1

print(f"  Creados: {created_sal}, Actualizados: {updated_sal}")
print(f"  Total escalas: {SalaryScale.objects.count()}")


# ============================================================================
# 2. FACTORES PRESTACIONALES
# ============================================================================
from apps.nomina.models import PrestationalFactor

PRESTATIONAL_FACTORS = [
    # Territorial General
    {
        'regime': 'TERRITORIAL_GENERAL', 'year': 2026, 'factor': Decimal('1.5547'),
        'detail': {
            'prima_servicios': 0.0833,
            'prima_vacaciones': 0.0417,
            'prima_navidad': 0.0833,
            'cesantias': 0.0833,
            'intereses_cesantias': 0.01,
            'vacaciones': 0.0417,
            'salud_patronal': 0.085,
            'pension_patronal': 0.12,
            'arl_riesgo_i': 0.00522,
            'sena': 0.02,
            'icbf': 0.03,
            'caja_compensacion': 0.04,
        }
    },
    {
        'regime': 'TERRITORIAL_GENERAL', 'year': 2025, 'factor': Decimal('1.5547'),
        'detail': {
            'prima_servicios': 0.0833,
            'prima_vacaciones': 0.0417,
            'prima_navidad': 0.0833,
            'cesantias': 0.0833,
            'intereses_cesantias': 0.01,
            'vacaciones': 0.0417,
            'salud_patronal': 0.085,
            'pension_patronal': 0.12,
            'arl_riesgo_i': 0.00522,
            'sena': 0.02,
            'icbf': 0.03,
            'caja_compensacion': 0.04,
        }
    },
    # Nacional General
    {
        'regime': 'NACIONAL_GENERAL', 'year': 2026, 'factor': Decimal('1.5547'),
        'detail': {
            'prima_servicios': 0.0833,
            'prima_vacaciones': 0.0417,
            'prima_navidad': 0.0833,
            'cesantias': 0.0833,
            'intereses_cesantias': 0.01,
            'vacaciones': 0.0417,
            'salud_patronal': 0.085,
            'pension_patronal': 0.12,
            'arl_riesgo_i': 0.00522,
            'sena': 0.02,
            'icbf': 0.03,
            'caja_compensacion': 0.04,
        }
    },
    {
        'regime': 'NACIONAL_GENERAL', 'year': 2025, 'factor': Decimal('1.5547'),
        'detail': {
            'prima_servicios': 0.0833,
            'prima_vacaciones': 0.0417,
            'prima_navidad': 0.0833,
            'cesantias': 0.0833,
            'intereses_cesantias': 0.01,
            'vacaciones': 0.0417,
            'salud_patronal': 0.085,
            'pension_patronal': 0.12,
            'arl_riesgo_i': 0.00522,
            'sena': 0.02,
            'icbf': 0.03,
            'caja_compensacion': 0.04,
        }
    },
    # Trabajador Oficial
    {
        'regime': 'TRABAJADOR_OFICIAL', 'year': 2026, 'factor': Decimal('1.6200'),
        'detail': {
            'prima_servicios': 0.0833,
            'prima_vacaciones': 0.0417,
            'prima_navidad': 0.0833,
            'cesantias': 0.0833,
            'intereses_cesantias': 0.01,
            'vacaciones': 0.0417,
            'salud_patronal': 0.085,
            'pension_patronal': 0.12,
            'arl_riesgo_i': 0.00522,
            'sena': 0.02,
            'icbf': 0.03,
            'caja_compensacion': 0.04,
            'dotacion_estimada': 0.05,
        }
    },
    {
        'regime': 'TRABAJADOR_OFICIAL', 'year': 2025, 'factor': Decimal('1.6200'),
        'detail': {
            'prima_servicios': 0.0833,
            'prima_vacaciones': 0.0417,
            'prima_navidad': 0.0833,
            'cesantias': 0.0833,
            'intereses_cesantias': 0.01,
            'vacaciones': 0.0417,
            'salud_patronal': 0.085,
            'pension_patronal': 0.12,
            'arl_riesgo_i': 0.00522,
            'sena': 0.02,
            'icbf': 0.03,
            'caja_compensacion': 0.04,
            'dotacion_estimada': 0.05,
        }
    },
]

print("\n=== FACTORES PRESTACIONALES ===")
created_pf = 0
updated_pf = 0
for pf in PRESTATIONAL_FACTORS:
    obj, created = PrestationalFactor.objects.update_or_create(
        regime=pf['regime'],
        year=pf['year'],
        defaults={'factor': pf['factor'], 'detail': pf['detail']}
    )
    if created:
        created_pf += 1
    else:
        updated_pf += 1
print(f"  Creados: {created_pf}, Actualizados: {updated_pf}")
print(f"  Total factores: {PrestationalFactor.objects.count()}")


# ============================================================================
# 3. PLANTILLAS DE ACTOS ADMINISTRATIVOS
# ============================================================================
from apps.actos.models import ActTemplate

TEMPLATES = [
    # --- ESTRUCTURA ---
    {
        'kind': 'DECRETO', 'scope': 'NACIONAL', 'topic': 'ESTRUCTURA',
        'name': 'Decreto de modificación de estructura — Orden Nacional',
        'description': 'Plantilla para decreto del Gobierno Nacional que modifica la estructura de una entidad del orden nacional (Art. 54 Ley 489/1998).',
        'body': '''DECRETO NÚMERO _____ DE {year}

({issue_date})

"Por el cual se modifica la estructura de {entity_name}"

EL PRESIDENTE DE LA REPÚBLICA DE COLOMBIA

En ejercicio de las facultades constitucionales y legales, en especial las conferidas por el numeral 16 del artículo 189 de la Constitución Política y el artículo 54 de la Ley 489 de 1998, y

CONSIDERANDO:

Que el artículo 54 de la Ley 489 de 1998 faculta al Gobierno Nacional para modificar la estructura de los Ministerios, Departamentos Administrativos, y demás organismos administrativos del orden nacional.

Que {problem_statement}

Que se cuenta con el estudio técnico que sustenta la modificación de la estructura, de conformidad con lo previsto en el artículo 46 de la Ley 489 de 1998.

Que {technical_justification}

DECRETA:

ARTÍCULO 1°. OBJETO. Modificar la estructura de {entity_name}, la cual será la siguiente:

{proposed_structure}

ARTÍCULO 2°. FUNCIONES DE LAS DEPENDENCIAS. Las funciones de las dependencias de {entity_name} serán las siguientes:

{department_functions}

ARTÍCULO 3°. VIGENCIA. El presente decreto rige a partir de la fecha de su publicación y deroga las disposiciones que le sean contrarias.

PUBLÍQUESE Y CÚMPLASE

Dado en Bogotá, D.C., a los {issue_date}

EL PRESIDENTE DE LA REPÚBLICA
{authority_name}'''
    },
    {
        'kind': 'ACUERDO', 'scope': 'MUNICIPAL', 'topic': 'ESTRUCTURA',
        'name': 'Acuerdo Municipal de modificación de estructura',
        'description': 'Plantilla para Acuerdo del Concejo Municipal que modifica la estructura de la administración central municipal (Art. 313-6 CP).',
        'body': '''ACUERDO NÚMERO _____ DE {year}

({issue_date})

"Por medio del cual se modifica la estructura de la Administración Central del Municipio de {municipality_name}"

EL CONCEJO MUNICIPAL DE {municipality_name}

En uso de sus atribuciones constitucionales y legales, en especial las conferidas por el numeral 6 del artículo 313 de la Constitución Política, la Ley 136 de 1994 modificada por la Ley 1551 de 2012, y

CONSIDERANDO:

Que el numeral 6 del artículo 313 de la Constitución Política atribuye a los Concejos la competencia para determinar la estructura de la administración municipal.

Que la Ley 489 de 1998, en su artículo 54, establece los principios y reglas generales para la modificación de las estructuras de las entidades públicas.

Que {problem_statement}

Que se cuenta con el estudio técnico y la justificación pertinente.

Que se solicitó concepto previo al Departamento Administrativo de la Función Pública, según lo previsto en el Decreto 1083 de 2015.

ACUERDA:

ARTÍCULO 1°. Modificar la estructura de la Administración Central del Municipio de {municipality_name}, la cual quedará conformada por las siguientes dependencias:

{proposed_structure}

ARTÍCULO 2°. FUNCIONES. Las funciones generales de cada dependencia serán las que se establezcan en el acto administrativo correspondiente.

ARTÍCULO 3°. VIGENCIA Y DEROGATORIAS. El presente Acuerdo rige a partir de su publicación y deroga las disposiciones que le sean contrarias.

PUBLÍQUESE Y CÚMPLASE

Dado en {municipality_name}, a los {issue_date}

EL PRESIDENTE DEL CONCEJO
{council_president}

EL SECRETARIO DEL CONCEJO
{council_secretary}'''
    },
    {
        'kind': 'ORDENANZA', 'scope': 'DEPARTAMENTAL', 'topic': 'ESTRUCTURA',
        'name': 'Ordenanza de modificación de estructura departamental',
        'description': 'Plantilla para Ordenanza de la Asamblea Departamental que modifica la estructura de la administración departamental (Art. 300-7 CP).',
        'body': '''ORDENANZA NÚMERO _____ DE {year}

({issue_date})

"Por la cual se modifica la estructura de la Administración Departamental de {department_name}"

LA ASAMBLEA DEPARTAMENTAL DE {department_name}

En uso de sus atribuciones constitucionales y legales, en especial las conferidas por el numeral 7 del artículo 300 de la Constitución Política, y

CONSIDERANDO:

Que el numeral 7 del artículo 300 de la Constitución Política atribuye a las Asambleas Departamentales la competencia para determinar la estructura de la Administración Departamental.

Que {problem_statement}

Que se cuenta con el estudio técnico correspondiente.

ORDENA:

ARTÍCULO 1°. Modificar la estructura de la Administración Central del Departamento de {department_name}.

{proposed_structure}

ARTÍCULO 2°. VIGENCIA. La presente Ordenanza rige a partir de su publicación.

PUBLÍQUESE Y CÚMPLASE

EL PRESIDENTE DE LA ASAMBLEA
{assembly_president}

EL SECRETARIO GENERAL
{assembly_secretary}'''
    },
    # --- PLANTA ---
    {
        'kind': 'DECRETO', 'scope': 'MUNICIPAL', 'topic': 'PLANTA',
        'name': 'Decreto de adopción de planta de personal — Municipal',
        'description': 'Plantilla para Decreto del Alcalde que adopta o modifica la planta de personal del municipio (Art. 315-7 CP, Ley 909/2004).',
        'body': '''DECRETO NÚMERO _____ DE {year}

({issue_date})

"Por el cual se establece la planta de personal de la Administración Central del Municipio de {municipality_name}"

EL ALCALDE DEL MUNICIPIO DE {municipality_name}

En ejercicio de sus atribuciones constitucionales y legales, en especial las conferidas por el numeral 7 del artículo 315 de la Constitución Política, la Ley 909 de 2004, el Decreto 785 de 2005, y

CONSIDERANDO:

Que mediante Acuerdo No. {structure_act} se modificó la estructura de la Administración Central del Municipio.

Que se realizó el estudio técnico de cargas de trabajo conforme al artículo 19 de la Ley 909 de 2004.

Que la planta de personal se ajusta a la nomenclatura y clasificación del Decreto 785 de 2005.

Que se verificó el cumplimiento de los límites de gasto de funcionamiento de la Ley 617 de 2000.

Que {technical_justification}

DECRETA:

ARTÍCULO 1°. Establecer la planta de personal de la Administración Central del Municipio de {municipality_name}, así:

DESPACHO DEL ALCALDE
{payroll_mayor_office}

{payroll_departments}

ARTÍCULO 2°. PLANTA GLOBAL. La planta de cargos del Municipio de {municipality_name} queda conformada por un total de {total_positions} cargos distribuidos así:

| Nivel | Cantidad |
|-------|----------|
| Directivo | {qty_directivo} |
| Asesor | {qty_asesor} |
| Profesional | {qty_profesional} |
| Técnico | {qty_tecnico} |
| Asistencial | {qty_asistencial} |

ARTÍCULO 3°. El costo anual de la planta de personal aquí adoptada asciende a ${annual_cost}, incluido el factor prestacional, dentro del límite previsto por la Ley 617 de 2000.

ARTÍCULO 4°. VIGENCIA. El presente Decreto rige a partir de la fecha de su publicación.

PUBLÍQUESE Y CÚMPLASE

EL ALCALDE
{authority_name}'''
    },
    {
        'kind': 'DECRETO', 'scope': 'NACIONAL', 'topic': 'PLANTA',
        'name': 'Decreto de adopción de planta de personal — Orden Nacional',
        'description': 'Plantilla para decreto del Gobierno Nacional que adopta la planta de personal de una entidad del orden nacional.',
        'body': '''DECRETO NÚMERO _____ DE {year}

({issue_date})

"Por el cual se establece la planta de personal de {entity_name}"

EL PRESIDENTE DE LA REPÚBLICA DE COLOMBIA

En ejercicio de sus facultades constitucionales y legales, en especial las conferidas por el numeral 14 del artículo 189 de la Constitución Política, la Ley 909 de 2004, y el Decreto Ley 770 de 2005, y

CONSIDERANDO:

Que mediante Decreto No. {structure_act} se modificó la estructura de {entity_name}.

Que se realizó el estudio técnico de que trata el artículo 19 de la Ley 909 de 2004.

Que la planta se ajusta al sistema de nomenclatura del Decreto 2489 de 2006.

DECRETA:

ARTÍCULO 1°. La planta de personal de {entity_name} será la siguiente:

{payroll_departments}

ARTÍCULO 2°. VIGENCIA. El presente decreto rige a partir de su publicación.

PUBLÍQUESE Y CÚMPLASE

EL PRESIDENTE DE LA REPÚBLICA
{authority_name}'''
    },
    # --- MANUAL ---
    {
        'kind': 'RESOLUCION', 'scope': 'MUNICIPAL', 'topic': 'MANUAL',
        'name': 'Resolución de adopción del Manual de Funciones — Municipal',
        'description': 'Plantilla para Resolución del Alcalde que adopta el Manual Específico de Funciones y Competencias Laborales (Dec. 785/2005, Dec. 1083/2015).',
        'body': '''RESOLUCIÓN NÚMERO _____ DE {year}

({issue_date})

"Por la cual se adopta el Manual Específico de Funciones y de Competencias Laborales de la Administración Central del Municipio de {municipality_name}"

EL ALCALDE DEL MUNICIPIO DE {municipality_name}

En ejercicio de sus atribuciones legales, en especial las conferidas por el artículo 28 del Decreto 785 de 2005, compilado en el Decreto 1083 de 2015, y

CONSIDERANDO:

Que mediante Decreto No. {payroll_act} se estableció la planta de personal del Municipio.

Que el artículo 28 del Decreto 785 de 2005, compilado en el artículo 2.2.2.6.1 del Decreto 1083 de 2015, establece que los organismos y entidades deberán expedir el manual específico de funciones.

Que el Decreto 815 de 2018 estableció las competencias laborales generales por niveles jerárquicos.

Que {technical_justification}

RESUELVE:

ARTÍCULO 1°. Adoptar el Manual Específico de Funciones y de Competencias Laborales para los empleos de la planta de personal de la Administración Central del Municipio de {municipality_name}, contenido en el anexo que hace parte integral de la presente Resolución.

ARTÍCULO 2°. La Secretaría de Gobierno o quien haga sus veces deberá entregar a cada funcionario copia de las funciones y competencias determinadas en el presente manual para el empleo respectivo.

ARTÍCULO 3°. VIGENCIA. La presente Resolución rige a partir de la fecha de su expedición.

COMUNÍQUESE Y CÚMPLASE

EL ALCALDE
{authority_name}'''
    },
    {
        'kind': 'RESOLUCION', 'scope': 'NACIONAL', 'topic': 'MANUAL',
        'name': 'Resolución de adopción del Manual de Funciones — Orden Nacional',
        'description': 'Plantilla para Resolución que adopta el Manual de Funciones en entidades del orden nacional (Dec. 1785/2014, Dec. 1083/2015).',
        'body': '''RESOLUCIÓN NÚMERO _____ DE {year}

({issue_date})

"Por la cual se adopta el Manual Específico de Funciones y de Competencias Laborales de {entity_name}"

EL DIRECTOR GENERAL / GERENTE DE {entity_name}

En ejercicio de sus atribuciones legales, en especial las conferidas por el Decreto 1785 de 2014, compilado en el Decreto 1083 de 2015, y

CONSIDERANDO:

Que mediante Decreto No. {payroll_act} se estableció la planta de personal de {entity_name}.

Que el Decreto 1785 de 2014 establece las funciones y requisitos generales para los empleos del orden nacional.

RESUELVE:

ARTÍCULO 1°. Adoptar el Manual Específico de Funciones y de Competencias Laborales de {entity_name}, contenido en el anexo de la presente Resolución.

ARTÍCULO 2°. VIGENCIA. La presente Resolución rige a partir de su expedición.

COMUNÍQUESE Y CÚMPLASE

{authority_name}'''
    },
    # --- SALARIAL ---
    {
        'kind': 'DECRETO', 'scope': 'MUNICIPAL', 'topic': 'SALARIAL',
        'name': 'Decreto de escala salarial — Municipal',
        'description': 'Plantilla para Decreto del Alcalde que fija la escala salarial municipal conforme a los límites del Gobierno Nacional (Ley 4/1992).',
        'body': '''DECRETO NÚMERO _____ DE {year}

({issue_date})

"Por el cual se fija la escala de remuneración de los empleos de la Administración Central del Municipio de {municipality_name} para la vigencia fiscal {fiscal_year}"

EL ALCALDE DEL MUNICIPIO DE {municipality_name}

En ejercicio de sus atribuciones legales, en especial las conferidas por la Ley 4 de 1992, los decretos nacionales que fijan los límites máximos salariales, y

CONSIDERANDO:

Que la Ley 4 de 1992 señala las normas para la fijación del régimen salarial y prestacional de los empleados públicos de las entidades territoriales.

Que el Gobierno Nacional expidió el Decreto {national_salary_decree} que establece los límites máximos salariales para la vigencia {fiscal_year}.

DECRETA:

ARTÍCULO 1°. Fijar la siguiente escala de remuneración mensual para los empleos de la Administración Central del Municipio de {municipality_name}:

{salary_table}

ARTÍCULO 2°. VIGENCIA. El presente Decreto rige a partir del 1° de enero de {fiscal_year}.

PUBLÍQUESE Y CÚMPLASE

EL ALCALDE
{authority_name}'''
    },
    # --- SUPRESIÓN ---
    {
        'kind': 'DECRETO', 'scope': 'MUNICIPAL', 'topic': 'SUPRESION',
        'name': 'Decreto de supresión de empleos — Municipal',
        'description': 'Plantilla para Decreto de supresión de empleos con garantías del retén social (Ley 790/2002, Decreto 190/2003).',
        'body': '''DECRETO NÚMERO _____ DE {year}

({issue_date})

"Por el cual se suprimen unos empleos de la planta de personal de la Administración Central del Municipio de {municipality_name}"

EL ALCALDE DEL MUNICIPIO DE {municipality_name}

En ejercicio de sus atribuciones constitucionales y legales, y

CONSIDERANDO:

Que mediante estudio técnico se determinó la necesidad de suprimir empleos de la planta de personal.

Que se garantiza la protección especial prevista en el artículo 12 de la Ley 790 de 2002 y el Decreto 190 de 2003 (retén social) para madres y padres cabeza de familia, personas con discapacidad, pre-pensionados, mujeres en estado de embarazo y lactancia.

Que se informó a la Comisión de Personal conforme al artículo 16 de la Ley 909 de 2004.

Que los empleados de carrera administrativa cuyos cargos se supriman tendrán derecho preferencial a ser incorporados en empleo igual o equivalente de la nueva planta, conforme al artículo 44 de la Ley 909 de 2004.

DECRETA:

ARTÍCULO 1°. Suprimir los siguientes empleos de la planta de personal:

{positions_to_suppress}

ARTÍCULO 2°. RETÉN SOCIAL. Los servidores públicos que se encuentren en las condiciones previstas en el artículo 12 de la Ley 790 de 2002 serán reubicados o mantenidos en la planta hasta que cese la condición de protección.

ARTÍCULO 3°. INDEMNIZACIÓN. Los empleados de carrera administrativa que sean retirados del servicio por supresión del empleo tendrán derecho a la indemnización prevista en el artículo 44 de la Ley 909 de 2004.

ARTÍCULO 4°. VIGENCIA. El presente Decreto rige a partir de su publicación.

PUBLÍQUESE Y CÚMPLASE

EL ALCALDE
{authority_name}'''
    },
    # --- LIQUIDACIÓN ---
    {
        'kind': 'DECRETO', 'scope': 'MUNICIPAL', 'topic': 'LIQUIDACION',
        'name': 'Decreto de supresión y liquidación de entidad descentralizada — Municipal',
        'description': 'Plantilla para Decreto de supresión y liquidación de entidad descentralizada municipal (Decreto 254/2000, Ley 1105/2006).',
        'body': '''DECRETO NÚMERO _____ DE {year}

({issue_date})

"Por el cual se ordena la supresión y liquidación de {entity_name}"

EL ALCALDE DEL MUNICIPIO DE {municipality_name}

En ejercicio de sus atribuciones constitucionales y legales, en especial las conferidas por la Ley 489 de 1998, el Decreto 254 de 2000 y la Ley 1105 de 2006, y

CONSIDERANDO:

Que {problem_statement}

Que se verificó el cumplimiento de las causales de supresión previstas en el artículo 52 de la Ley 489 de 1998.

DECRETA:

ARTÍCULO 1°. Ordenar la supresión y liquidación de {entity_name}.

ARTÍCULO 2°. LIQUIDADOR. Designar como liquidador a {liquidator_name}.

ARTÍCULO 3°. PLAZO. El proceso de liquidación se realizará en un plazo máximo de {liquidation_months} meses.

ARTÍCULO 4°. VIGENCIA. El presente decreto rige a partir de su publicación.

PUBLÍQUESE Y CÚMPLASE

EL ALCALDE
{authority_name}'''
    },
    # Entidades descentralizadas
    {
        'kind': 'RESOLUCION', 'scope': 'DESCENTRALIZADO', 'topic': 'ESTRUCTURA',
        'name': 'Resolución de reorganización interna — Entidad Descentralizada',
        'description': 'Plantilla para resolución de reorganización interna de entidad descentralizada por servicios.',
        'body': '''RESOLUCIÓN NÚMERO _____ DE {year}

({issue_date})

"Por la cual se establece la organización interna de {entity_name}"

EL DIRECTOR GENERAL / GERENTE DE {entity_name}

En ejercicio de sus facultades legales y estatutarias, y

CONSIDERANDO:

Que la Junta Directiva / Consejo Directivo mediante Acuerdo No. {board_agreement} aprobó la modificación de la estructura.

Que {problem_statement}

RESUELVE:

ARTÍCULO 1°. Establecer la organización interna de {entity_name} así:

{proposed_structure}

ARTÍCULO 2°. VIGENCIA. La presente resolución rige a partir de su expedición.

COMUNÍQUESE Y CÚMPLASE

{authority_name}'''
    },
    {
        'kind': 'RESOLUCION', 'scope': 'DESCENTRALIZADO', 'topic': 'PLANTA',
        'name': 'Resolución de planta de personal — Entidad Descentralizada',
        'description': 'Plantilla para resolución que adopta la planta de personal de una entidad descentralizada.',
        'body': '''RESOLUCIÓN NÚMERO _____ DE {year}

({issue_date})

"Por la cual se establece la planta de personal de {entity_name}"

EL DIRECTOR GENERAL / GERENTE DE {entity_name}

En ejercicio de sus facultades legales y estatutarias, y

CONSIDERANDO:

Que se realizó el estudio técnico de cargas de trabajo conforme al artículo 19 de la Ley 909 de 2004.

Que {technical_justification}

RESUELVE:

ARTÍCULO 1°. Adoptar la planta de personal de {entity_name} así:

{payroll_departments}

ARTÍCULO 2°. VIGENCIA. La presente resolución rige a partir de su expedición.

COMUNÍQUESE Y CÚMPLASE

{authority_name}'''
    },
]

print("\n=== PLANTILLAS DE ACTOS ADMINISTRATIVOS ===")
created_act = 0
updated_act = 0
for t in TEMPLATES:
    obj, created = ActTemplate.objects.update_or_create(
        kind=t['kind'], scope=t['scope'], topic=t['topic'], name=t['name'],
        defaults={
            'description': t['description'],
            'body': t['body'],
            'is_active': True,
        }
    )
    if created:
        created_act += 1
    else:
        updated_act += 1
print(f"  Creados: {created_act}, Actualizados: {updated_act}")
print(f"  Total plantillas: {ActTemplate.objects.count()}")


# ============================================================================
# 4. JOTA INTENTS — Base de conocimiento FAQ del chatbot
# ============================================================================
from apps.jota.models import JotaIntent, JotaSettings

# Asegurar singleton de configuración
JotaSettings.get_solo()

INTENTS = [
    # --- Normatividad ---
    {'name': 'Ley 909 de 2004', 'slug': 'ley-909-2004', 'category': 'Normatividad',
     'keywords': 'ley 909, carrera administrativa, empleo publico, gerencia publica',
     'answer': '**Ley 909 de 2004** — Norma principal vigente sobre empleo público y carrera administrativa.\n\n- Regula el ingreso, permanencia y retiro por mérito\n- Crea el sistema de gerencia pública\n- Art. 19: levantamiento de cargas de trabajo\n- Art. 21: empleos temporales\n- Art. 44: derecho preferencial de incorporación en reestructuración\n- Modificada por Ley 1960 de 2019 (ascensos)',
     'priority': 20},
    {'name': 'Ley 489 de 1998', 'slug': 'ley-489-1998', 'category': 'Normatividad',
     'keywords': 'ley 489, estructura, organizacion, administracion publica, reestructuracion, supresion, fusion',
     'answer': '**Ley 489 de 1998** — Organización y funcionamiento de la Administración Pública.\n\n- Regula la creación, supresión y reestructuración de entidades\n- Art. 52: causales de supresión de entidades\n- Art. 54: modificación de estructura por el Gobierno\n- Aplica a todas las entidades públicas',
     'priority': 20},
    {'name': 'Decreto 785 de 2005', 'slug': 'decreto-785-2005', 'category': 'Normatividad',
     'keywords': 'decreto 785, nomenclatura territorial, clasificacion empleos, niveles jerarquicos, territorial',
     'answer': '**Decreto 785 de 2005** — Nomenclatura y clasificación de empleos para entidades territoriales.\n\n- Define 5 niveles: Directivo, Asesor, Profesional, Técnico, Asistencial\n- Establece denominaciones, códigos y requisitos generales\n- Aplica a departamentos, distritos y municipios\n- Es complementario al Decreto 2489/2006 (orden nacional)',
     'priority': 18},
    {'name': 'Decreto 2489 de 2006', 'slug': 'decreto-2489-2006', 'category': 'Normatividad',
     'keywords': 'decreto 2489, nomenclatura nacional, clasificacion empleos, orden nacional, grados, codigos',
     'answer': '**Decreto 2489 de 2006** — Nomenclatura y clasificación de empleos del orden nacional.\n\n- Define denominaciones, códigos y grados salariales\n- Aplica a ministerios, departamentos administrativos, superintendencias, UAE, etc.\n- Complementario al Decreto 785/2005 (territorial)',
     'priority': 18},
    {'name': 'Ley 617 de 2000', 'slug': 'ley-617-2000', 'category': 'Normatividad',
     'keywords': 'ley 617, gastos funcionamiento, limites, categoria, municipio, departamento, racionalizacion',
     'answer': '**Ley 617 de 2000** — Racionalización del gasto público territorial.\n\n- Fija límites a gastos de funcionamiento por categoría\n- Exige certificar cumplimiento antes de modificar planta\n- Categoriza departamentos, distritos y municipios\n- Fundamental para validar viabilidad financiera de reestructuración',
     'priority': 18},
    {'name': 'Decreto 1083 de 2015', 'slug': 'decreto-1083-2015', 'category': 'Normatividad',
     'keywords': 'decreto 1083, decreto unico, reglamentario, funcion publica, compilacion',
     'answer': '**Decreto 1083 de 2015** — Decreto Único Reglamentario del Sector de Función Pública.\n\n- Compila TODA la normativa reglamentaria de función pública\n- Incluye: empleo público, funciones, competencias, administración de personal, SIGEP\n- Art. 2.2.12.1: concepto previo DAFP para reestructuración\n- Es la norma de referencia para cualquier trámite de empleo público',
     'priority': 18},
    {'name': 'Constitución y función pública', 'slug': 'constitucion-funcion-publica', 'category': 'Normatividad',
     'keywords': 'constitucion, articulo 122, articulo 125, articulo 130, funcion publica, cnsc, merito',
     'answer': '**Constitución Política** — Título V, Capítulo 2 (Arts. 122-131):\n\n- Art. 122: Todo cargo debe tener funciones detalladas en ley\n- Art. 123: Define servidores públicos\n- Art. 125: **Carrera administrativa** como regla general\n- Art. 126: Prohibición de nepotismo\n- Art. 130: Crea la CNSC\n- Art. 209: Principios de la función administrativa\n- Art. 313-6: Concejos determinan estructura municipal',
     'priority': 20},
    {'name': 'Retén social', 'slug': 'reten-social', 'category': 'Normatividad',
     'keywords': 'reten social, proteccion, madre cabeza, discapacidad, prepensionado, embarazo, supresion, ley 790',
     'answer': '**Retén Social** (Ley 790/2002, Art. 12; Decreto 190/2003)\n\nProtección especial en procesos de reestructuración para:\n- Madres y padres cabeza de familia\n- Personas con discapacidad\n- Pre-pensionados (les faltan 3 años o menos para pensión)\n- Mujeres en embarazo y lactancia\n- Aforados sindicales\n\nEstos servidores **no pueden ser desvinculados** mientras dure la protección. Deben ser reubicados.',
     'priority': 22},
    # --- Módulos de la plataforma ---
    {'name': 'Matriz de cargas de trabajo', 'slug': 'matriz-cargas', 'category': 'Módulos',
     'keywords': 'matriz, cargas, trabajo, estudio tecnico, tiempos, frecuencia, anexo 5',
     'answer': '**Matriz de Cargas de Trabajo** (Anexo 5 - Cartilla Función Pública)\n\nEs el estudio técnico que sustenta la planta de personal:\n1. Identifique procesos y actividades por dependencia\n2. Asigne tiempos (mínimo, usual, máximo) y frecuencias\n3. El sistema calcula horas-hombre/mes necesarias\n4. Compare con la planta actual para detectar excesos o déficits\n\n**Requisito legal**: Art. 19, Ley 909/2004',
     'priority': 15},
    {'name': 'Diagnóstico institucional', 'slug': 'diagnostico', 'category': 'Módulos',
     'keywords': 'diagnostico, dofa, foda, analisis, mision, vision, entorno, fase 2',
     'answer': '**Diagnóstico Institucional** (Fase 2)\n\nEl módulo de Diagnóstico incluye:\n- Análisis de misión y visión\n- Matriz DOFA (Fortalezas, Debilidades, Oportunidades, Amenazas)\n- Análisis del entorno (económico, político, social, tecnológico)\n- Marco legal correlacionado\n- Análisis de duplicidades funcionales\n\nEs la base para justificar la reestructuración.',
     'priority': 15},
    {'name': 'Manual de funciones', 'slug': 'manual-funciones', 'category': 'Módulos',
     'keywords': 'manual, funciones, competencias, requisitos, perfil, cargo, decreto 815',
     'answer': '**Manual Específico de Funciones y Competencias Laborales**\n\nDefine para cada cargo:\n- Propósito principal\n- Funciones esenciales\n- Requisitos de estudio y experiencia\n- Competencias comportamentales (Decreto 815/2018)\n\n**Normativa aplicable:**\n- Dec. 785/2005 (territorial) o Dec. 1785/2014 (nacional)\n- Dec. 1083/2015 (compilado)\n- Se adopta por Resolución del jefe de la entidad',
     'priority': 15},
    {'name': 'Actos administrativos', 'slug': 'actos-administrativos', 'category': 'Módulos',
     'keywords': 'actos, administrativos, decreto, acuerdo, ordenanza, resolucion, expedicion, fase 4',
     'answer': '**Actos Administrativos** (Fase 4 - Implementación)\n\nTipos de actos según el ámbito:\n- **Decreto**: Gobierno Nacional, Gobernador, Alcalde\n- **Ordenanza**: Asamblea Departamental\n- **Acuerdo**: Concejo Municipal / Junta Directiva\n- **Resolución**: Entidad descentralizada\n\nDeben cumplir el CPACA (Ley 1437/2011): motivación, publicidad, notificaciones.',
     'priority': 15},
    {'name': 'Planta de personal', 'slug': 'planta-personal', 'category': 'Módulos',
     'keywords': 'planta, personal, cargos, empleos, actual, propuesta, global, estructural',
     'answer': '**Planta de Personal**\n\nPuede ser:\n- **Global**: agrupa cargos sin asignarlos a dependencia específica\n- **Estructural**: distribuye cargos por dependencia\n\nCada cargo tiene: denominación, código, grado, nivel jerárquico, cantidad.\n\nPara modificar la planta se requiere:\n1. Estudio técnico de cargas (Art. 19, Ley 909)\n2. Cumplir Ley 617/2000 (territoriales)\n3. Concepto DAFP (Art. 2.2.12.1, Dec. 1083/2015)',
     'priority': 15},
    {'name': 'Escala salarial', 'slug': 'escala-salarial', 'category': 'Módulos',
     'keywords': 'escala, salarial, salario, remuneracion, grado, asignacion basica, factor prestacional',
     'answer': '**Escala Salarial y Factor Prestacional**\n\n- La escala salarial se fija anualmente por decreto del Gobierno Nacional\n- Cada grado tiene una asignación básica mensual\n- El **factor prestacional** (~1.55) incluye: prima de servicios, cesantías, intereses, vacaciones, aportes patronales (salud, pensión, ARL, SENA, ICBF, caja)\n- **Costo real** = salario base × factor prestacional × 12 meses\n\nLa plataforma calcula automáticamente el costo de la planta.',
     'priority': 15},
    {'name': 'Simulador de escenarios', 'slug': 'simulador', 'category': 'Módulos',
     'keywords': 'simulador, escenario, comparar, clonar, analisis, sensibilidad, costo',
     'answer': '**Simulador de Escenarios**\n\nPermite crear y comparar escenarios de reestructuración:\n- Clone el escenario base\n- Modifique cargos, niveles, cantidades\n- Compare costos entre escenarios\n- Analice el impacto financiero\n- Cada escenario puede tener su propia planta propuesta\n\nIdeal para análisis de sensibilidad antes de tomar decisiones.',
     'priority': 15},
    {'name': 'Cómo crear una reestructuración', 'slug': 'crear-reestructuracion', 'category': 'Flujo general',
     'keywords': 'crear, nueva, reestructuracion, iniciar, proceso, pasos, como empezar',
     'answer': '**Para crear una reestructuración:**\n\n1. Vaya a **Entidades** y seleccione (o cree) la entidad\n2. Complete los datos básicos: orden, naturaleza jurídica, categoría\n3. En la pestaña de **Reestructuraciones**, cree una nueva\n4. Defina nombre, fecha de referencia y objetivos\n5. El sistema activará los módulos según los objetivos seleccionados\n\n**Fases del proceso:**\n- Fase 1: Acuerdo inicial y cronograma\n- Fase 2: Diagnóstico institucional\n- Fase 3: Rediseño (procesos, cargas, planta)\n- Fase 4: Implementación (actos administrativos)',
     'priority': 25},
    {'name': 'Niveles jerárquicos', 'slug': 'niveles-jerarquicos', 'category': 'Conceptos',
     'keywords': 'niveles, jerarquicos, directivo, asesor, profesional, tecnico, asistencial',
     'answer': '**Niveles Jerárquicos** (Dec. 770/2005 y Dec. 785/2005)\n\n- **Directivo**: Dirección general, formulación de políticas, planes y programas\n- **Asesor**: Asistencia, asesoría y consejo a los directivos\n- **Profesional**: Aplicación de conocimientos profesionales\n- **Técnico**: Desarrollo de procesos y procedimientos técnicos\n- **Asistencial**: Actividades de apoyo y complementarias',
     'priority': 18},
    {'name': 'MFMP Marco Fiscal', 'slug': 'mfmp-marco-fiscal', 'category': 'Módulos',
     'keywords': 'mfmp, marco fiscal, mediano plazo, ley 819, proyeccion, ingresos, gastos, deuda',
     'answer': '**MFMP — Marco Fiscal de Mediano Plazo** (Ley 819/2003)\n\nProyección a 10 años de:\n- Ingresos por concepto (tributarios, transferencias, SGP, etc.)\n- Gastos (personal, generales, transferencias, inversión)\n- Servicio de deuda y endeudamiento\n\nPermite verificar la **sostenibilidad fiscal** de la reestructuración.\nCada escenario puede evaluar el impacto a mediano plazo.',
     'priority': 15},
    {'name': 'Comisión de Personal', 'slug': 'comision-personal', 'category': 'Conceptos',
     'keywords': 'comision, personal, sindicato, participacion, informar, consulta',
     'answer': '**Comisión de Personal** (Art. 16, Ley 909/2004)\n\nÓrgano bipartito (representantes de la entidad + representantes de los empleados).\n\nEn reestructuración:\n- Debe ser **informada** del proceso\n- Participa en la vigilancia de la carrera administrativa\n- Las comunicaciones sindicales deben documentarse\n\nLa plataforma registra actas de reuniones y comunicaciones sindicales.',
     'priority': 12},
]

print("\n=== JOTA INTENTS (FAQ Chatbot) ===")
created_ji = 0
updated_ji = 0
for intent in INTENTS:
    obj, created = JotaIntent.objects.update_or_create(
        slug=intent['slug'],
        defaults={
            'name': intent['name'],
            'category': intent['category'],
            'keywords': intent['keywords'],
            'answer': intent['answer'],
            'priority': intent['priority'],
            'is_active': True,
        }
    )
    if created:
        created_ji += 1
    else:
        updated_ji += 1
print(f"  Creados: {created_ji}, Actualizados: {updated_ji}")
print(f"  Total intents: {JotaIntent.objects.count()}")


# ============================================================================
# 5. PERMISOS RBAC — GroupModelPermission
# ============================================================================
from apps.core.models import GroupModelPermission

ROLES = {
    'Editor': {'create': True, 'read': True, 'update': True, 'delete': False},
    'Revisor': {'create': False, 'read': True, 'update': False, 'delete': False},
    'Administrador': {'create': True, 'read': True, 'update': True, 'delete': True},
    'Consultor': {'create': False, 'read': True, 'update': False, 'delete': False},
}

MODELS_TO_PROTECT = [
    ('core', 'entity'), ('core', 'restructuring'), ('core', 'department'),
    ('core', 'timelineactivity'), ('core', 'restructuringobjective'),
    ('legal', 'legalnorm'),
    ('nomenclatura', 'jobnomenclature'),
    ('diagnostico', 'diagnosis'), ('diagnostico', 'swotitem'),
    ('diagnostico', 'legalreference'), ('diagnostico', 'environmentanalysis'),
    ('procesos', 'processmap'), ('procesos', 'process'),
    ('procedimientos', 'procedure'), ('procedimientos', 'procedurestep'),
    ('cargas', 'workloadmatrix'), ('cargas', 'workloadentry'),
    ('planta', 'payrollplan'), ('planta', 'payrollposition'),
    ('actos', 'acttemplate'), ('actos', 'actdraft'),
    ('nomina', 'salaryscale'), ('nomina', 'prestationalfactor'),
    ('nomina', 'entitysalaryconfig'),
    ('simulador', 'scenario'),
    ('talento', 'employee'), ('talento', 'employmentrecord'),
    ('reten', 'protectedemployee'),
    ('financiero', 'fiscalyear'),
    ('mfmp', 'mfmp'), ('mfmp', 'mfmpincomeprojection'),
    ('mfmp', 'mfmpexpenseprojection'),
    ('documentos', 'document'),
    ('mandatos', 'legalmandate'), ('mandatos', 'mandatecompliance'),
    ('consultas', 'officialconsultation'),
    ('participacion', 'committeemeeting'),
    ('manual_legacy', 'legacymanual'),
]

print("\n=== PERMISOS RBAC ===")
created_perm = 0
updated_perm = 0

for role_name, perms in ROLES.items():
    group, _ = Group.objects.get_or_create(name=role_name)
    for app_label, model_name in MODELS_TO_PROTECT:
        obj, created = GroupModelPermission.objects.update_or_create(
            group=group, app_label=app_label, model=model_name,
            defaults={
                'can_create': perms['create'],
                'can_read': perms['read'],
                'can_update': perms['update'],
                'can_delete': perms['delete'],
            }
        )
        if created:
            created_perm += 1
        else:
            updated_perm += 1

print(f"  Creados: {created_perm}, Actualizados: {updated_perm}")
print(f"  Total permisos: {GroupModelPermission.objects.count()}")
print(f"  Grupos creados: {list(Group.objects.values_list('name', flat=True))}")


# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("\n" + "=" * 60)
print("RESUMEN FINAL DE CARGA")
print("=" * 60)
print(f"  Escalas salariales:        {SalaryScale.objects.count()}")
print(f"  Factores prestacionales:   {PrestationalFactor.objects.count()}")
print(f"  Plantillas de actos:       {ActTemplate.objects.count()}")
print(f"  Intents Jota (FAQ):        {JotaIntent.objects.count()}")
print(f"  Permisos RBAC:             {GroupModelPermission.objects.count()}")
print(f"  Grupos de usuario:         {Group.objects.count()}")
print("=" * 60)

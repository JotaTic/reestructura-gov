"""
Módulo de Contratistas OPS/CPS.

Registra los contratistas de prestación de servicios de la entidad,
sus actividades y permite cruzar con la planta de personal para detectar:
- Funciones permanentes ejecutadas por contratistas (desnaturalización)
- Actividades misionales sin cargo en planta
- Necesidad de crear nuevos cargos
"""
from decimal import Decimal
from django.db import models

from apps.common.audit import AuditedModel
from apps.core.models import Entity, Department
from apps.nomenclatura.models import HierarchyLevel


class Contractor(AuditedModel):
    """Contratista de prestación de servicios (OPS/CPS)."""

    class ContractType(models.TextChoices):
        OPS = 'OPS', 'Orden de Prestación de Servicios'
        CPS = 'CPS', 'Contrato de Prestación de Servicios'
        OTRO = 'OTRO', 'Otro tipo de contrato'

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='contractors')
    restructuring = models.ForeignKey(
        'core.Restructuring', on_delete=models.CASCADE, related_name='contractors',
    )

    # Identificación
    full_name = models.CharField('Nombre completo', max_length=255)
    id_type = models.CharField('Tipo documento', max_length=4, default='CC')
    id_number = models.CharField('Número de identificación', max_length=20)

    # Contrato
    contract_type = models.CharField('Tipo de contrato', max_length=8, choices=ContractType.choices)
    contract_number = models.CharField('Número de contrato', max_length=64)
    contract_object = models.TextField('Objeto del contrato')
    contract_value = models.DecimalField('Valor del contrato', max_digits=14, decimal_places=2, default=0)
    monthly_value = models.DecimalField('Valor mensual estimado', max_digits=12, decimal_places=2, default=0)

    # Ubicación organizacional
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, related_name='contractors',
        verbose_name='Dependencia donde presta servicios',
    )
    supervisor = models.CharField('Supervisor del contrato', max_length=255)

    # Vigencia
    start_date = models.DateField('Fecha de inicio')
    end_date = models.DateField('Fecha de finalización')
    is_active = models.BooleanField('Contrato vigente', default=True)

    # Perfil del contratista
    education_level = models.CharField('Nivel educativo', max_length=32, blank=True)
    profession = models.CharField('Profesión/título', max_length=255, blank=True)
    experience_years = models.PositiveIntegerField('Años de experiencia', default=0)

    # Análisis
    executes_permanent_functions = models.BooleanField(
        '¿Ejecuta funciones permanentes?', default=False,
        help_text='Verdadero si el contratista realiza funciones que deberían ser de un cargo permanente.',
    )
    replaces_plant_position = models.BooleanField(
        '¿Suple un cargo de planta?', default=False,
        help_text='Verdadero si ocupa funciones de un cargo que debería existir en planta.',
    )
    suggested_hierarchy_level = models.CharField(
        'Nivel jerárquico sugerido (si se creara cargo)',
        max_length=16, choices=HierarchyLevel.choices, blank=True,
    )
    notes = models.TextField('Observaciones', blank=True)

    class Meta:
        verbose_name = 'Contratista'
        verbose_name_plural = 'Contratistas'
        unique_together = [('entity', 'contract_number')]
        ordering = ['department', 'full_name']
        indexes = [
            models.Index(fields=['entity', 'department']),
            models.Index(fields=['entity', 'contract_type']),
        ]

    def __str__(self):
        return f'{self.full_name} — {self.get_contract_type_display()} #{self.contract_number}'

    @property
    def duration_months(self):
        if self.start_date and self.end_date:
            delta = self.end_date - self.start_date
            return round(delta.days / 30, 1)
        return 0


class ContractorActivity(AuditedModel):
    """Actividad que ejecuta un contratista, para cruzar con cargas laborales."""

    class ActivityNature(models.TextChoices):
        MISIONAL = 'MISIONAL', 'Misional'
        APOYO = 'APOYO', 'Apoyo'
        ESTRATEGICA = 'ESTRATEGICA', 'Estratégica'
        TEMPORAL = 'TEMPORAL', 'Temporal / Proyecto'

    contractor = models.ForeignKey(Contractor, on_delete=models.CASCADE, related_name='activities')

    process = models.CharField('Proceso asociado', max_length=255)
    activity = models.CharField('Actividad / Función', max_length=500)
    nature = models.CharField('Naturaleza', max_length=16, choices=ActivityNature.choices)

    # Tiempos (igual formato que cargas)
    monthly_frequency = models.DecimalField(
        'Frecuencia mensual', max_digits=10, decimal_places=4, default=1,
    )
    estimated_hours_month = models.DecimalField(
        'Horas/mes estimadas', max_digits=10, decimal_places=2, default=0,
    )

    # Cruce
    equivalent_job_code = models.CharField(
        'Código de cargo equivalente en planta', max_length=8, blank=True,
        help_text='Si esta actividad la debería hacer un cargo de planta, indicar cuál.',
    )
    equivalent_hierarchy_level = models.CharField(
        'Nivel jerárquico equivalente', max_length=16,
        choices=HierarchyLevel.choices, blank=True,
    )

    observations = models.TextField('Observaciones', blank=True)

    class Meta:
        verbose_name = 'Actividad de contratista'
        verbose_name_plural = 'Actividades de contratistas'
        ordering = ['contractor', 'process', 'activity']

    def __str__(self):
        return f'{self.contractor.full_name} — {self.activity[:60]}'

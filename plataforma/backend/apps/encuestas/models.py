"""
Módulo de Encuestas de Cargas Laborales — Portal Público.

Permite enviar un link único a funcionarios, contratistas OPS/CPS y demás
participantes para que registren sus actividades, frecuencias y tiempos.
Las respuestas se consolidan automáticamente en la matriz de cargas.

Flujo:
  1. Admin crea una WorkloadSurvey vinculada a una WorkloadMatrix.
  2. Agrega SurveyParticipant (uno por persona) → se genera un token UUID.
  3. El participante accede a /encuesta/{token} (sin autenticación).
  4. Llena sus actividades → SurveyActivity.
  5. El admin revisa y aprueba → se consolidan en WorkloadEntry.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone

from apps.common.audit import AuditedModel
from apps.core.models import Entity, Department
from apps.nomenclatura.models import HierarchyLevel
from apps.cargas.models import FATIGUE_FACTOR


class WorkloadSurvey(AuditedModel):
    """Encuesta de cargas vinculada a una matriz."""

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Borrador'
        OPEN = 'OPEN', 'Abierta'
        CLOSED = 'CLOSED', 'Cerrada'

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='workload_surveys')
    matrix = models.ForeignKey(
        'cargas.WorkloadMatrix', on_delete=models.CASCADE, related_name='surveys',
    )
    name = models.CharField('Nombre de la encuesta', max_length=255)
    description = models.TextField(
        'Instrucciones para los participantes', blank=True,
        default='Por favor registre todas las actividades que realiza en su cargo/contrato, '
                'indicando la frecuencia mensual y los tiempos estimados.',
    )
    status = models.CharField('Estado', max_length=16, choices=Status.choices, default=Status.DRAFT)
    deadline = models.DateField('Fecha límite', null=True, blank=True)

    class Meta:
        verbose_name = 'Encuesta de cargas'
        verbose_name_plural = 'Encuestas de cargas'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.get_status_display()})'

    @property
    def is_active(self):
        if self.status != self.Status.OPEN:
            return False
        if self.deadline and self.deadline < timezone.now().date():
            return False
        return True

    @property
    def participants_count(self):
        return self.participants.count()

    @property
    def responses_count(self):
        return self.participants.filter(submitted=True).count()


class SurveyParticipant(models.Model):
    """Persona invitada a responder la encuesta (funcionario, OPS, CPS, etc.)."""

    class LinkType(models.TextChoices):
        CARRERA = 'CARRERA', 'Carrera administrativa'
        LNR = 'LNR', 'Libre nombramiento y remoción'
        PROVISIONAL = 'PROVISIONAL', 'Provisional'
        TEMPORAL = 'TEMPORAL', 'Temporal'
        SUPERNUMERARIO = 'SUPERNUMERARIO', 'Supernumerario'
        TRABAJADOR_OFICIAL = 'TRABAJADOR_OFICIAL', 'Trabajador oficial'
        OPS = 'OPS', 'Orden de Prestación de Servicios'
        CPS = 'CPS', 'Contrato de Prestación de Servicios'
        OTRO = 'OTRO', 'Otro'

    survey = models.ForeignKey(WorkloadSurvey, on_delete=models.CASCADE, related_name='participants')
    token = models.UUIDField('Token de acceso', default=uuid.uuid4, unique=True, editable=False)

    # Datos del participante
    full_name = models.CharField('Nombre completo', max_length=255)
    id_number = models.CharField('Número de identificación', max_length=20)
    email = models.EmailField('Correo electrónico', blank=True)
    phone = models.CharField('Teléfono', max_length=20, blank=True)

    # Vinculación
    link_type = models.CharField('Tipo de vinculación', max_length=24, choices=LinkType.choices)
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, related_name='survey_participants',
        verbose_name='Dependencia',
    )

    # Para OPS/CPS
    contract_number = models.CharField('Número de contrato', max_length=64, blank=True)
    contract_object = models.TextField('Objeto del contrato', blank=True)
    contract_supervisor = models.CharField('Supervisor del contrato', max_length=255, blank=True)
    contract_start = models.DateField('Fecha inicio contrato', null=True, blank=True)
    contract_end = models.DateField('Fecha fin contrato', null=True, blank=True)

    # Cargo (para funcionarios de planta)
    job_denomination = models.CharField('Denominación del empleo/cargo', max_length=255, blank=True)
    job_code = models.CharField('Código', max_length=8, blank=True)
    job_grade = models.CharField('Grado', max_length=8, blank=True)

    # Estado
    submitted = models.BooleanField('Encuesta diligenciada', default=False)
    submitted_at = models.DateTimeField('Fecha de envío', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Participante'
        verbose_name_plural = 'Participantes'
        unique_together = [('survey', 'id_number')]
        ordering = ['full_name']

    def __str__(self):
        return f'{self.full_name} ({self.get_link_type_display()})'

    @property
    def is_contractor(self):
        return self.link_type in (self.LinkType.OPS, self.LinkType.CPS)

    @property
    def survey_url(self):
        return f'/encuesta/{self.token}'


class SurveyActivity(models.Model):
    """Actividad registrada por un participante en la encuesta."""

    participant = models.ForeignKey(SurveyParticipant, on_delete=models.CASCADE, related_name='activities')

    # Actividad
    process = models.CharField('Proceso', max_length=255)
    activity = models.CharField('Actividad / Función', max_length=500)
    procedure = models.CharField('Procedimiento', max_length=500, blank=True)

    # Nivel jerárquico sugerido
    hierarchy_level = models.CharField(
        'Nivel jerárquico', max_length=16, choices=HierarchyLevel.choices,
        blank=True, help_text='Opcional. El técnico puede ajustarlo luego.',
    )

    # Tiempos
    monthly_frequency = models.DecimalField(
        'Frecuencia mensual', max_digits=10, decimal_places=4,
        help_text='Veces al mes que realiza esta actividad.',
    )
    t_min = models.DecimalField('Tiempo mínimo (horas)', max_digits=8, decimal_places=2)
    t_usual = models.DecimalField('Tiempo usual (horas)', max_digits=8, decimal_places=2)
    t_max = models.DecimalField('Tiempo máximo (horas)', max_digits=8, decimal_places=2)

    # Calculados
    standard_time = models.DecimalField('Tiempo estándar (h)', max_digits=10, decimal_places=4, editable=False, default=0)
    hh_month = models.DecimalField('Horas-hombre/mes', max_digits=10, decimal_places=4, editable=False, default=0)

    # Metadatos
    is_core_activity = models.BooleanField(
        '¿Es actividad misional?', default=False,
        help_text='Si la actividad es misional de la entidad (no de apoyo/administrativa).',
    )
    should_be_in_plant = models.BooleanField(
        '¿Debería ser cargo de planta?', null=True, blank=True, default=None,
        help_text='Opinión del participante: ¿esta actividad requiere un cargo permanente?',
    )
    observations = models.TextField('Observaciones', blank=True)

    # Aprobación
    approved = models.BooleanField('Aprobada por el técnico', default=False)
    consolidated = models.BooleanField('Consolidada en matriz', default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Actividad de encuesta'
        verbose_name_plural = 'Actividades de encuesta'
        ordering = ['participant', 'process', 'activity']

    def save(self, *args, **kwargs):
        base = (self.t_min + Decimal('4') * self.t_usual + self.t_max) / Decimal('6')
        self.standard_time = (base * FATIGUE_FACTOR).quantize(Decimal('0.0001'))
        self.hh_month = (self.monthly_frequency * self.standard_time).quantize(Decimal('0.0001'))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.participant.full_name} — {self.activity[:60]}'

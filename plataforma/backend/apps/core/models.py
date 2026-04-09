"""
Núcleo: modelo de Entidad (tenant lógico) y Dependencias.

Ajustado al numeral 1.1 del prompt de reestructuración:
- Orden, categoría municipal, naturaleza jurídica (condiciona reglas y salidas).
"""
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.audit import AuditedModel


class Entity(models.Model):
    """Entidad pública sujeta a reestructuración. Actúa como tenant lógico."""

    class Order(models.TextChoices):
        NACIONAL = 'NACIONAL', 'Nacional'
        DEPARTAMENTAL = 'DEPARTAMENTAL', 'Departamental'
        DISTRITAL = 'DISTRITAL', 'Distrital'
        MUNICIPAL = 'MUNICIPAL', 'Municipal'

    class MunicipalityCategory(models.TextChoices):
        ESPECIAL = 'ESPECIAL', 'Especial'
        PRIMERA = '1', 'Primera'
        SEGUNDA = '2', 'Segunda'
        TERCERA = '3', 'Tercera'
        CUARTA = '4', 'Cuarta'
        QUINTA = '5', 'Quinta'
        SEXTA = '6', 'Sexta'
        NA = 'NA', 'No aplica'

    class LegalNature(models.TextChoices):
        # Sector central
        MINISTERIO = 'MINISTERIO', 'Ministerio'
        DEPTO_ADMINISTRATIVO = 'DEPTO_ADMIN', 'Departamento Administrativo'
        SUPER_SIN_PJ = 'SUPER_SIN_PJ', 'Superintendencia sin personería'
        UAE_SIN_PJ = 'UAE_SIN_PJ', 'Unidad Administrativa Especial sin personería'
        ALCALDIA = 'ALCALDIA', 'Alcaldía'
        GOBERNACION = 'GOBERNACION', 'Gobernación'
        SECRETARIA_DESPACHO = 'SEC_DESPACHO', 'Secretaría del Despacho'
        # Sector descentralizado
        ESTABLECIMIENTO_PUBLICO = 'ESTAB_PUBLICO', 'Establecimiento Público'
        EICE = 'EICE', 'Empresa Industrial y Comercial del Estado'
        SOC_ECON_MIXTA = 'SOC_ECON_MIXTA', 'Sociedad de Economía Mixta'
        ESE = 'ESE', 'Empresa Social del Estado'
        ESP_SPD = 'ESP_SPD', 'Empresa Oficial de Servicios Públicos Domiciliarios'
        INSTITUTO_CYT = 'INSTITUTO_CYT', 'Instituto Científico y Tecnológico'
        SUPER_CON_PJ = 'SUPER_CON_PJ', 'Superintendencia con personería'
        UAE_CON_PJ = 'UAE_CON_PJ', 'Unidad Administrativa Especial con personería'
        ESPECIAL = 'ESPECIAL', 'Entidad de naturaleza especial'

    name = models.CharField('Nombre', max_length=255)
    acronym = models.CharField('Sigla', max_length=32, blank=True)
    order = models.CharField('Orden', max_length=16, choices=Order.choices)
    municipality_category = models.CharField(
        'Categoría municipal',
        max_length=8,
        choices=MunicipalityCategory.choices,
        default=MunicipalityCategory.NA,
    )
    legal_nature = models.CharField('Naturaleza jurídica', max_length=24, choices=LegalNature.choices)
    creation_norm = models.CharField('Norma de creación', max_length=255, blank=True)
    nit = models.CharField('NIT', max_length=20, blank=True)

    # --- Numeral 1.1 — insumos vigentes ---
    current_structure_act = models.CharField(
        'Acto de estructura vigente', max_length=255, blank=True,
        help_text='Decreto/Ordenanza/Acuerdo que adopta la estructura actual.',
    )
    current_payroll_act = models.CharField(
        'Acto de planta vigente', max_length=255, blank=True,
        help_text='Decreto/Resolución que adopta la planta de personal actual.',
    )
    current_manual_act = models.CharField(
        'Acto del manual vigente', max_length=255, blank=True,
        help_text='Acto administrativo del manual específico de funciones vigente.',
    )

    # --- Numeral 1.2 — cuatro interrogantes del acuerdo inicial ---
    problem_statement = models.TextField(
        '¿Cuál es el problema a resolver?', blank=True,
        help_text='Panorama actual, debilidades, carencias.',
    )
    objectives = models.TextField(
        '¿Cómo planea resolverlo?', blank=True,
        help_text='Objetivos generales y específicos.',
    )
    approach = models.TextField(
        '¿Qué necesita para resolverlo?', blank=True,
        help_text='Paso a paso, tiempo, alcance.',
    )
    risks = models.TextField(
        '¿Qué pasa si no se resuelve?', blank=True,
        help_text='Riesgos identificados.',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Entidad'
        verbose_name_plural = 'Entidades'
        ordering = ['name']

    def __str__(self) -> str:
        return f'{self.name} ({self.get_order_display()})'

    @property
    def nomenclature_decree(self) -> str:
        """Decreto aplicable para nomenclatura de empleos."""
        return '2489/2006' if self.order == self.Order.NACIONAL else '785/2005'


class Restructuring(models.Model):
    """
    Expediente de un ejercicio de reestructuración para una entidad.

    Cada entidad puede tener múltiples reestructuraciones (p.ej. "Rediseño 2023",
    "Rediseño 2026"). Los módulos transaccionales (diagnóstico, procesos, cargas,
    planta, actos) pertenecen a una reestructuración específica.
    """

    class Status(models.TextChoices):
        BORRADOR = 'BORRADOR', 'Borrador'
        DIAGNOSTICO_COMPLETO = 'DIAGNOSTICO_COMPLETO', 'Diagnóstico completo'
        ANALISIS_COMPLETO = 'ANALISIS_COMPLETO', 'Análisis completo'
        REVISION_JURIDICA = 'REVISION_JURIDICA', 'Revisión jurídica'
        REVISION_FINANCIERA = 'REVISION_FINANCIERA', 'Revisión financiera'
        CONCEPTO_DAFP_SOLICITADO = 'CONCEPTO_DAFP_SOLICITADO', 'Concepto DAFP solicitado'
        CONCEPTO_DAFP_RECIBIDO = 'CONCEPTO_DAFP_RECIBIDO', 'Concepto DAFP recibido'
        COMISION_PERSONAL_INFORMADA = 'COMISION_PERSONAL_INFORMADA', 'Comisión de personal informada'
        APROBADO = 'APROBADO', 'Aprobada'
        ACTO_EXPEDIDO = 'ACTO_EXPEDIDO', 'Acto expedido'
        IMPLEMENTADO = 'IMPLEMENTADO', 'Implementada'
        ARCHIVADO = 'ARCHIVADO', 'Archivada'

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='restructurings')
    name = models.CharField('Nombre', max_length=255)
    code = models.CharField('Código', max_length=64, blank=True)
    reference_date = models.DateField('Fecha de referencia')
    status = models.CharField('Estado', max_length=32, choices=Status.choices, default=Status.BORRADOR)
    current_status_since = models.DateTimeField(
        'En estado actual desde', null=True, blank=True,
        help_text='Fecha/hora en que entró al estado actual. Útil para medir tiempos de proceso.',
    )
    description = models.TextField('Descripción', blank=True)
    created_by = models.ForeignKey(
        'auth.User', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='restructurings_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Reestructuración'
        verbose_name_plural = 'Reestructuraciones'
        ordering = ['-reference_date', 'entity']
        indexes = [models.Index(fields=['entity', 'status'])]

    def __str__(self) -> str:
        return f'{self.entity.acronym or self.entity.name} — {self.name}'


class TimelineActivity(models.Model):
    """
    Actividad del cronograma de la Fase 1 (Acuerdo Inicial).
    Corresponde al Anexo 1 de la Cartilla de Función Pública.
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente'
        IN_PROGRESS = 'IN_PROGRESS', 'En curso'
        DONE = 'DONE', 'Completada'
        BLOCKED = 'BLOCKED', 'Bloqueada'

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='timeline')
    name = models.CharField('Actividad', max_length=255)
    responsible = models.CharField('Responsable', max_length=255, blank=True)
    indicator = models.CharField('Indicador', max_length=255, blank=True)
    start_date = models.DateField('Fecha inicio', null=True, blank=True)
    end_date = models.DateField('Fecha fin', null=True, blank=True)
    status = models.CharField('Estado', max_length=16, choices=Status.choices, default=Status.PENDING)
    order = models.PositiveIntegerField('Orden', default=0)
    notes = models.TextField('Notas', blank=True)

    class Meta:
        verbose_name = 'Actividad del cronograma'
        verbose_name_plural = 'Cronograma'
        ordering = ['entity', 'order', 'start_date']

    def __str__(self) -> str:
        return f'{self.entity.acronym or self.entity.name} — {self.name}'


class Department(models.Model):
    """Dependencia de una entidad (Secretaría, Oficina, Dirección, etc.)."""

    class Level(models.TextChoices):
        DESPACHO = 'DESPACHO', 'Despacho'
        SECRETARIA = 'SECRETARIA', 'Secretaría'
        DIRECCION = 'DIRECCION', 'Dirección'
        SUBDIRECCION = 'SUBDIRECCION', 'Subdirección'
        OFICINA = 'OFICINA', 'Oficina'
        GRUPO = 'GRUPO', 'Grupo interno de trabajo'
        AREA = 'AREA', 'Área / Unidad'

    # Mapeo: dado el nivel del padre, sugerir el nivel del hijo
    CHILD_LEVEL_SUGGESTION = {
        'DESPACHO': 'SECRETARIA',
        'SECRETARIA': 'DIRECCION',
        'DIRECCION': 'SUBDIRECCION',
        'SUBDIRECCION': 'OFICINA',
        'OFICINA': 'GRUPO',
        'GRUPO': 'AREA',
        'AREA': 'AREA',
    }

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField('Nombre', max_length=255)
    code = models.CharField('Código interno', max_length=32, blank=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children'
    )
    level = models.CharField(
        'Nivel organizacional', max_length=16,
        choices=Level.choices, default=Level.AREA,
        help_text='Tipo de dependencia según la jerarquía organizacional.',
    )
    order = models.PositiveIntegerField('Orden de presentación', default=0)

    class Meta:
        verbose_name = 'Dependencia'
        verbose_name_plural = 'Dependencias'
        ordering = ['entity', 'order', 'name']
        indexes = [
            models.Index(fields=['entity', 'level']),
        ]

    def __str__(self) -> str:
        return f'{self.entity.acronym or self.entity.name} / {self.name}'

    def suggest_child_level(self) -> str:
        """Sugiere el nivel organizacional para una subdependencia."""
        return self.CHILD_LEVEL_SUGGESTION.get(self.level, 'AREA')


# ---------------------------------------------------------------------------
#                    Sprint 0 — Multi-tenant y matriz de permisos
# ---------------------------------------------------------------------------


class UserEntityAccess(models.Model):
    """Acceso de un usuario a una entidad (multi-tenant estricto).

    Un usuario puede tener varias entidades; solo una marcada como
    is_default=True (constraint parcial). El superusuario NO necesita
    registros aqui: ve todas las entidades.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='entity_access'
    )
    entity = models.ForeignKey(
        Entity, on_delete=models.CASCADE, related_name='user_access'
    )
    is_default = models.BooleanField(
        'Entidad por defecto', default=False,
        help_text='Entidad con la que el usuario entra al iniciar sesion.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Acceso usuario-entidad'
        verbose_name_plural = 'Accesos usuario-entidad'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'entity'], name='uniq_user_entity_access'
            ),
            models.UniqueConstraint(
                fields=['user'], condition=models.Q(is_default=True),
                name='uniq_user_default_entity',
            ),
        ]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['entity']),
        ]

    def __str__(self) -> str:
        flag = ' (default)' if self.is_default else ''
        return f'{self.user_id}->{self.entity_id}{flag}'


class GroupModelPermission(models.Model):
    """Matriz CRUD por (grupo, modelo).

    Se lee desde apps.common.permissions.MatrixPermission en cada request.
    La matriz se administra desde /superadmin/permissions/.
    """

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='model_permissions')
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    can_create = models.BooleanField(default=False)
    can_read = models.BooleanField(default=False)
    can_update = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Permiso de grupo sobre modelo'
        verbose_name_plural = 'Permisos de grupo sobre modelo'
        constraints = [
            models.UniqueConstraint(
                fields=['group', 'app_label', 'model'],
                name='uniq_group_model_permission',
            ),
        ]
        indexes = [
            models.Index(fields=['group']),
            models.Index(fields=['app_label', 'model']),
        ]

    def clean(self):
        if not self.app_label or not self.model:
            raise ValidationError('app_label y model son obligatorios.')

    def __str__(self) -> str:
        bits = ''.join([
            'C' if self.can_create else '-',
            'R' if self.can_read else '-',
            'U' if self.can_update else '-',
            'D' if self.can_delete else '-',
        ])
        return f'{self.group.name} | {self.app_label}.{self.model} [{bits}]'


# ---------------------------------------------------------------------------
#                    Sprint 1 — Objetivos de reestructuración
# ---------------------------------------------------------------------------

class RestructuringObjective(AuditedModel):
    """
    Objetivo específico de un expediente de reestructuración.

    Cada reestructuración puede tener múltiples objetivos (uno por kind).
    El kind determina los módulos activos, validadores y entregables (ver
    apps.core.objectives.OBJECTIVE_DEFINITIONS).
    """

    class Kind(models.TextChoices):
        FORTALECIMIENTO_INSTITUCIONAL = 'FORTALECIMIENTO_INSTITUCIONAL', 'Fortalecimiento institucional'
        NIVELACION_SALARIAL = 'NIVELACION_SALARIAL', 'Nivelación salarial'
        RECLASIFICACION_EMPLEOS = 'RECLASIFICACION_EMPLEOS', 'Reclasificación de empleos'
        CREACION_DEPENDENCIA = 'CREACION_DEPENDENCIA', 'Creación de dependencia'
        SUPRESION_DEPENDENCIA = 'SUPRESION_DEPENDENCIA', 'Supresión de dependencia'
        SUPRESION_EMPLEOS = 'SUPRESION_EMPLEOS', 'Supresión de empleos'
        LIQUIDACION_ENTIDAD = 'LIQUIDACION_ENTIDAD', 'Liquidación de entidad'
        FUSION_ENTIDADES = 'FUSION_ENTIDADES', 'Fusión de entidades'
        ESCISION_ENTIDAD = 'ESCISION_ENTIDAD', 'Escisión de entidad'
        MODERNIZACION_TECNOLOGICA = 'MODERNIZACION_TECNOLOGICA', 'Modernización tecnológica'
        CUMPLIMIENTO_COMPETENCIAS = 'CUMPLIMIENTO_COMPETENCIAS', 'Cumplimiento de competencias'
        AJUSTE_ORDEN_JUDICIAL = 'AJUSTE_ORDEN_JUDICIAL', 'Ajuste por orden judicial'
        CUMPLIMIENTO_LEY_617 = 'CUMPLIMIENTO_LEY_617', 'Cumplimiento Ley 617/2000'
        PLANTA_TRANSITORIA = 'PLANTA_TRANSITORIA', 'Planta transitoria'
        PLAN_CARRERA_CNSC = 'PLAN_CARRERA_CNSC', 'Plan de carrera CNSC'
        AJUSTE_NOMENCLATURA = 'AJUSTE_NOMENCLATURA', 'Ajuste de nomenclatura'

    restructuring = models.ForeignKey(
        Restructuring,
        on_delete=models.CASCADE,
        related_name='objectives',
    )
    kind = models.CharField('Tipo de objetivo', max_length=40, choices=Kind.choices)
    description = models.TextField('Descripción', blank=True)
    target_metric = models.CharField('Métrica objetivo', max_length=255, blank=True)
    target_value = models.DecimalField(
        'Valor objetivo', max_digits=14, decimal_places=2,
        null=True, blank=True,
    )
    indicator = models.CharField('Indicador de seguimiento', max_length=255, blank=True)
    deadline = models.DateField('Fecha límite', null=True, blank=True)
    priority = models.PositiveIntegerField('Prioridad', default=1)

    class Meta:
        verbose_name = 'Objetivo de reestructuración'
        verbose_name_plural = 'Objetivos de reestructuración'
        ordering = ['restructuring', 'priority', 'kind']
        unique_together = [('restructuring', 'kind')]
        indexes = [models.Index(fields=['restructuring'])]

    def clean(self):
        from apps.core.objectives import OBJECTIVE_DEFINITIONS
        if self.kind and self.kind not in OBJECTIVE_DEFINITIONS:
            raise ValidationError({'kind': f'Tipo de objetivo desconocido: {self.kind}'})

    def __str__(self) -> str:
        return f'{self.restructuring} — {self.get_kind_display()}'

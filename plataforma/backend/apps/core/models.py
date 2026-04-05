"""
Núcleo: modelo de Entidad (tenant lógico) y Dependencias.

Ajustado al numeral 1.1 del prompt de reestructuración:
- Orden, categoría municipal, naturaleza jurídica (condiciona reglas y salidas).
"""
from django.db import models


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
        DRAFT = 'DRAFT', 'Borrador'
        IN_PROGRESS = 'IN_PROGRESS', 'En curso'
        APPROVED = 'APPROVED', 'Aprobada'
        IMPLEMENTED = 'IMPLEMENTED', 'Implementada'
        ARCHIVED = 'ARCHIVED', 'Archivada'

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='restructurings')
    name = models.CharField('Nombre', max_length=255)
    code = models.CharField('Código', max_length=64, blank=True)
    reference_date = models.DateField('Fecha de referencia')
    status = models.CharField('Estado', max_length=16, choices=Status.choices, default=Status.DRAFT)
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

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField('Nombre', max_length=255)
    code = models.CharField('Código interno', max_length=32, blank=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children'
    )
    order = models.PositiveIntegerField('Orden de presentación', default=0)

    class Meta:
        verbose_name = 'Dependencia'
        verbose_name_plural = 'Dependencias'
        ordering = ['entity', 'order', 'name']

    def __str__(self) -> str:
        return f'{self.entity.acronym or self.entity.name} / {self.name}'

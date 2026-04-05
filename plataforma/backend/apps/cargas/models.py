"""
Módulo 10 — Matriz de Perfiles y Cargas de Trabajo (Anexo 5 Función Pública).

Implementa el numeral 2.bis del prompt de reestructuración:
- Formulario 1: levantamiento por dependencia, actividad por actividad, cargo por cargo.
- Formulario 2: consolidado por nivel jerárquico y dependencia.

Fórmula del Tiempo Estándar (Instructivo Función Pública, 24/04/2024):
    TE = [(Tmin + 4·TU + Tmax) / 6] × 1.07      (+7% de tiempo muerto/fatiga)

Jornada de referencia: 167 horas/mes.
"""
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import Entity, Department
from apps.nomenclatura.models import HierarchyLevel


HOURS_PER_MONTH = Decimal('167')
FATIGUE_FACTOR = Decimal('1.07')


class WorkloadMatrix(models.Model):
    """Contenedor lógico del ejercicio de cargas para una entidad en una fecha."""

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='workload_matrices')
    restructuring = models.ForeignKey(
        'core.Restructuring', on_delete=models.CASCADE, related_name='workload_matrices',
    )
    name = models.CharField('Nombre del estudio', max_length=255)
    reference_date = models.DateField('Fecha de referencia')
    notes = models.TextField('Notas', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Matriz de cargas de trabajo'
        verbose_name_plural = 'Matrices de cargas de trabajo'
        ordering = ['-reference_date', 'entity']

    def __str__(self) -> str:
        return f'{self.entity.acronym or self.entity.name} — {self.name}'


class WorkloadEntry(models.Model):
    """
    Una fila del Formulario 1: una actividad medida, asignada a un cargo específico
    dentro de una dependencia. Corresponde a las columnas 1–14 del Anexo 5.
    """

    matrix = models.ForeignKey(WorkloadMatrix, on_delete=models.CASCADE, related_name='entries')
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='workload_entries')

    # Col 1–3
    process = models.CharField('Proceso', max_length=255)
    activity = models.CharField('Actividad', max_length=500)
    procedure = models.CharField('Procedimiento', max_length=500, blank=True)

    # Col 4 — nivel jerárquico (se excluye DIRECTIVO del levantamiento)
    hierarchy_level = models.CharField('Nivel jerárquico', max_length=16, choices=HierarchyLevel.choices)

    # Col 5
    requirements = models.TextField('Requisitos de estudio y experiencia', blank=True)

    # Col 6, 7, 8 — cargo específico
    job_denomination = models.CharField('Denominación del empleo', max_length=255)
    job_code = models.CharField('Código', max_length=8, blank=True)
    job_grade = models.CharField('Grado', max_length=8, blank=True)

    # Col 9
    main_purpose = models.TextField('Propósito principal del empleo', blank=True,
                                    help_text='Verbo + objeto + condición.')

    # Col 10
    monthly_frequency = models.DecimalField(
        'Frecuencia mensual', max_digits=10, decimal_places=4,
        help_text='Veces/mes. Fracciones: anual=0.0833, semestral=0.1667, etc.',
    )

    # Col 11–13
    t_min = models.DecimalField('Tiempo mínimo (h)', max_digits=8, decimal_places=2)
    t_usual = models.DecimalField('Tiempo usual (h)', max_digits=8, decimal_places=2)
    t_max = models.DecimalField('Tiempo máximo (h)', max_digits=8, decimal_places=2)

    # Col 14 — calculado automáticamente
    standard_time = models.DecimalField('Tiempo estándar (h)', max_digits=10, decimal_places=4, editable=False)

    # Total horas-hombre mes (frecuencia × TE) — col 15–19 en la matriz de FP.
    hh_month = models.DecimalField('Horas-hombre/mes', max_digits=10, decimal_places=4, editable=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Actividad medida'
        verbose_name_plural = 'Actividades medidas'
        ordering = ['department', 'process', 'activity']
        indexes = [
            models.Index(fields=['matrix', 'department']),
            models.Index(fields=['matrix', 'hierarchy_level']),
            models.Index(fields=['matrix', 'job_code']),
        ]

    # ---------- Lógica de dominio ----------

    def clean(self) -> None:
        """Validaciones del dominio."""
        super().clean()
        if self.hierarchy_level == HierarchyLevel.DIRECTIVO:
            raise ValidationError(
                'Los empleos del nivel DIRECTIVO no se miden por cargas de trabajo '
                '(ver Instructivo FP 24/04/2024). Se digitan en el resumen de empleos '
                'según la norma de estructura.'
            )
        if self.t_min < 0 or self.t_usual < 0 or self.t_max < 0:
            raise ValidationError('Los tiempos no pueden ser negativos.')
        if not (self.t_min <= self.t_usual <= self.t_max):
            raise ValidationError('Debe cumplirse Tmin ≤ Tusual ≤ Tmax.')
        if self.monthly_frequency < 0:
            raise ValidationError('La frecuencia mensual no puede ser negativa.')
        if self.matrix.entity_id != self.department.entity_id:
            raise ValidationError('La dependencia no pertenece a la entidad de la matriz.')

    def _compute_standard_time(self) -> Decimal:
        base = (self.t_min + Decimal('4') * self.t_usual + self.t_max) / Decimal('6')
        return (base * FATIGUE_FACTOR).quantize(Decimal('0.0001'))

    def _compute_hh_month(self) -> Decimal:
        return (self.monthly_frequency * self.standard_time).quantize(Decimal('0.0001'))

    def save(self, *args, **kwargs):
        self.full_clean()
        self.standard_time = self._compute_standard_time()
        self.hh_month = self._compute_hh_month()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f'{self.department} — {self.activity[:50]}'

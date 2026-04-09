"""Módulo de Plan de Implementación post-aprobación."""
from django.db import models
from apps.common.audit import AuditedModel


class ImplementationPlan(AuditedModel):
    """Plan de implementación vinculado a una reestructuración."""
    restructuring = models.ForeignKey(
        'core.Restructuring', on_delete=models.CASCADE, related_name='implementation_plans',
    )
    name = models.CharField('Nombre', max_length=255)
    description = models.TextField('Descripción', blank=True)
    start_date = models.DateField('Fecha inicio', null=True, blank=True)
    end_date = models.DateField('Fecha fin estimada', null=True, blank=True)

    class Meta:
        verbose_name = 'Plan de implementación'
        verbose_name_plural = 'Planes de implementación'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ImplementationTask(AuditedModel):
    """Tarea del plan de implementación."""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente'
        IN_PROGRESS = 'IN_PROGRESS', 'En progreso'
        COMPLETED = 'COMPLETED', 'Completada'
        BLOCKED = 'BLOCKED', 'Bloqueada'

    class Category(models.TextChoices):
        NOTIFICACION = 'NOTIFICACION', 'Notificación a empleados'
        INCORPORACION = 'INCORPORACION', 'Incorporación carrera'
        LIQUIDACION = 'LIQUIDACION', 'Liquidación/indemnización'
        CONVOCATORIA = 'CONVOCATORIA', 'Convocatoria CNSC'
        REUBICACION = 'REUBICACION', 'Reubicación'
        SUPRESION = 'SUPRESION', 'Supresión de cargo'
        ADMINISTRATIVO = 'ADMINISTRATIVO', 'Trámite administrativo'
        OTRO = 'OTRO', 'Otro'

    plan = models.ForeignKey(ImplementationPlan, on_delete=models.CASCADE, related_name='tasks')
    name = models.CharField('Tarea', max_length=500)
    category = models.CharField('Categoría', max_length=16, choices=Category.choices, default=Category.OTRO)
    responsible = models.CharField('Responsable', max_length=255, blank=True)
    start_date = models.DateField('Fecha inicio', null=True, blank=True)
    end_date = models.DateField('Fecha fin', null=True, blank=True)
    status = models.CharField('Estado', max_length=16, choices=Status.choices, default=Status.PENDING)
    depends_on = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='dependents',
    )
    notes = models.TextField('Notas', blank=True)
    order = models.PositiveIntegerField('Orden', default=0)

    class Meta:
        verbose_name = 'Tarea de implementación'
        verbose_name_plural = 'Tareas de implementación'
        ordering = ['order', 'start_date']

    def __str__(self):
        return self.name

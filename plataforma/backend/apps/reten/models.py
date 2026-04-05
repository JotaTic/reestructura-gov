"""
Módulo 13 — Retén Social (Ley 790/2002, Decreto 190/2003).

Registra los empleados con protección especial durante procesos de supresión
de cargos. La jurisprudencia asociada (Corte Constitucional T-014/07, T-078/09
y Consejo de Estado 25000-23-25-000-2001-07679-02) es de obligatoria consulta.
"""
from django.db import models

from apps.core.models import Entity


class ProtectedEmployee(models.Model):
    """Empleado amparado por el retén social."""

    class Protection(models.TextChoices):
        MADRE_CABEZA = 'MADRE_CABEZA', 'Madre cabeza de familia'
        PADRE_CABEZA = 'PADRE_CABEZA', 'Padre cabeza de familia'
        DISCAPACIDAD = 'DISCAPACIDAD', 'Persona con discapacidad'
        PRE_PENSIONADO = 'PRE_PENSIONADO', 'Pre-pensionado'
        EMBARAZO = 'EMBARAZO', 'Empleada en embarazo'
        LACTANCIA = 'LACTANCIA', 'Empleada en lactancia'
        FUERO_SINDICAL = 'FUERO_SINDICAL', 'Empleado con fuero sindical'

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='protected_employees')
    full_name = models.CharField('Nombre completo', max_length=255)
    id_type = models.CharField('Tipo documento', max_length=8, default='CC')
    id_number = models.CharField('Número documento', max_length=32)
    job_denomination = models.CharField('Cargo actual', max_length=255, blank=True)
    department = models.CharField('Dependencia', max_length=255, blank=True)
    protection_type = models.CharField('Tipo de protección', max_length=16, choices=Protection.choices)
    protection_start = models.DateField('Fecha inicio de protección', null=True, blank=True)
    protection_end = models.DateField('Fecha estimada de fin', null=True, blank=True)
    evidence = models.TextField(
        'Soporte documental',
        blank=True,
        help_text='Describe el soporte que acredita la condición.',
    )
    active = models.BooleanField('Protección vigente', default=True)
    notes = models.TextField('Observaciones', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Empleado con protección'
        verbose_name_plural = 'Retén social'
        ordering = ['entity', 'full_name']
        indexes = [models.Index(fields=['entity', 'protection_type', 'active'])]

    def __str__(self) -> str:
        return f'{self.full_name} ({self.get_protection_type_display()})'

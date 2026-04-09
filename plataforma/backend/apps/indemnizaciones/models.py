"""Módulo de cálculo de indemnizaciones y costos de supresión."""
from decimal import Decimal
from django.db import models
from apps.common.audit import AuditedModel


class SuppressionAnalysis(AuditedModel):
    """Análisis de costos de supresión para una reestructuración."""
    restructuring = models.ForeignKey(
        'core.Restructuring', on_delete=models.CASCADE, related_name='suppression_analyses',
    )
    name = models.CharField('Nombre del análisis', max_length=255)
    reference_date = models.DateField('Fecha de referencia')
    notes = models.TextField('Notas', blank=True)

    class Meta:
        verbose_name = 'Análisis de supresión'
        verbose_name_plural = 'Análisis de supresión'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class SuppressionCost(AuditedModel):
    """Costo de supresión individual por cargo/empleado."""

    class AppointmentType(models.TextChoices):
        CARRERA = 'CARRERA', 'Carrera administrativa'
        LNR = 'LNR', 'Libre nombramiento y remoción'
        PROVISIONAL = 'PROVISIONAL', 'Provisional'
        TEMPORAL = 'TEMPORAL', 'Temporal'
        TRABAJADOR_OFICIAL = 'TRABAJADOR_OFICIAL', 'Trabajador oficial'

    analysis = models.ForeignKey(SuppressionAnalysis, on_delete=models.CASCADE, related_name='costs')
    employee_name = models.CharField('Nombre del empleado', max_length=255, blank=True)
    employee_ref = models.ForeignKey(
        'talento.Employee', null=True, blank=True, on_delete=models.SET_NULL, related_name='suppression_costs',
    )
    position_denomination = models.CharField('Denominación del cargo', max_length=255)
    position_code = models.CharField('Código', max_length=8, blank=True)
    position_grade = models.CharField('Grado', max_length=8, blank=True)
    department_name = models.CharField('Dependencia', max_length=255, blank=True)

    appointment_type = models.CharField('Tipo vinculación', max_length=20, choices=AppointmentType.choices)
    years_of_service = models.DecimalField('Años de servicio', max_digits=6, decimal_places=2, default=0)
    monthly_salary = models.DecimalField('Salario mensual', max_digits=12, decimal_places=2, default=0)

    # Costos calculados
    severance_cost = models.DecimalField(
        'Indemnización', max_digits=14, decimal_places=2, default=0,
        help_text='Carrera: 45 días × salario por primer año + 15 días × año adicional.',
    )
    pending_benefits = models.DecimalField(
        'Prestaciones pendientes', max_digits=14, decimal_places=2, default=0,
        help_text='Cesantías, vacaciones, prima pendientes.',
    )
    total_suppression_cost = models.DecimalField(
        'Costo total supresión', max_digits=14, decimal_places=2, default=0,
    )
    annual_savings = models.DecimalField(
        'Ahorro anual', max_digits=14, decimal_places=2, default=0,
        help_text='Salario × factor prestacional × 12.',
    )
    break_even_months = models.DecimalField(
        'Meses para recuperar', max_digits=6, decimal_places=1, default=0,
    )
    has_reten_social = models.BooleanField('Tiene retén social', default=False)
    reten_type = models.CharField('Tipo retén', max_length=64, blank=True)
    notes = models.TextField('Observaciones', blank=True)

    class Meta:
        verbose_name = 'Costo de supresión'
        verbose_name_plural = 'Costos de supresión'
        ordering = ['department_name', 'position_denomination']

    def save(self, *args, **kwargs):
        self._calculate_costs()
        super().save(*args, **kwargs)

    def _calculate_costs(self):
        salary = self.monthly_salary or Decimal('0')
        years = self.years_of_service or Decimal('0')
        daily = salary / Decimal('30')

        # Indemnización según tipo
        if self.appointment_type == 'CARRERA':
            if years <= 1:
                self.severance_cost = (daily * Decimal('45')).quantize(Decimal('0.01'))
            else:
                first_year = daily * Decimal('45')
                additional = daily * Decimal('15') * (years - 1)
                self.severance_cost = (first_year + additional).quantize(Decimal('0.01'))
        else:
            self.severance_cost = Decimal('0')

        self.total_suppression_cost = (self.severance_cost + self.pending_benefits).quantize(Decimal('0.01'))
        # Factor prestacional aprox 1.55
        self.annual_savings = (salary * Decimal('1.55') * Decimal('12')).quantize(Decimal('0.01'))
        if self.annual_savings > 0:
            monthly_savings = self.annual_savings / Decimal('12')
            if monthly_savings > 0:
                self.break_even_months = (self.total_suppression_cost / monthly_savings).quantize(Decimal('0.1'))

    def __str__(self):
        return f'{self.position_denomination} — {self.employee_name or "Vacante"}'

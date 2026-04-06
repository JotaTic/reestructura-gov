"""
Módulo 15 — Hojas de vida de empleados.

Almacena la información laboral, académica y personal de los empleados
vinculados a las entidades registradas en la plataforma.
"""
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.audit import AuditedModel
from apps.core.models import Entity


class Employee(AuditedModel):
    """Empleado de una entidad pública."""

    class IdType(models.TextChoices):
        CC = 'CC', 'Cédula de ciudadanía'
        CE = 'CE', 'Cédula de extranjería'
        PA = 'PA', 'Pasaporte'
        TI = 'TI', 'Tarjeta de identidad'
        RC = 'RC', 'Registro civil'

    class Sex(models.TextChoices):
        MALE = 'M', 'Masculino'
        FEMALE = 'F', 'Femenino'
        NON_BINARY = 'NB', 'No binario'

    entity = models.ForeignKey(
        Entity, on_delete=models.CASCADE, related_name='employees',
    )
    id_type = models.CharField('Tipo de documento', max_length=4, choices=IdType.choices)
    id_number = models.CharField('Número de documento', max_length=20)
    full_name = models.CharField('Nombre completo', max_length=200)
    first_name = models.CharField('Nombres', max_length=100)
    last_name = models.CharField('Apellidos', max_length=100)
    birth_date = models.DateField('Fecha de nacimiento')
    sex = models.CharField('Sexo', max_length=2, choices=Sex.choices)
    has_disability = models.BooleanField('Tiene discapacidad', default=False)
    disability_percentage = models.PositiveIntegerField(
        '% de discapacidad', null=True, blank=True,
    )
    is_head_of_household = models.BooleanField('Cabeza de hogar', default=False)
    email = models.EmailField('Correo electrónico', blank=True)
    phone = models.CharField('Teléfono', max_length=30, blank=True)
    address = models.CharField('Dirección', max_length=255, blank=True)

    class Meta:
        verbose_name = 'Empleado'
        verbose_name_plural = 'Empleados'
        ordering = ['entity', 'last_name', 'first_name']
        unique_together = [('entity', 'id_type', 'id_number')]
        indexes = [
            models.Index(fields=['entity']),
            models.Index(fields=['id_number']),
        ]

    def clean(self):
        if self.has_disability and self.disability_percentage is None:
            raise ValidationError(
                {'disability_percentage': 'Ingrese el porcentaje de discapacidad.'}
            )
        if not self.has_disability and self.disability_percentage is not None:
            self.disability_percentage = None

    def __str__(self) -> str:
        return f'{self.full_name} ({self.id_type} {self.id_number})'


class EmployeeEducation(models.Model):
    """Historial de formación académica del empleado."""

    class Level(models.TextChoices):
        PRIMARIA = 'PRIMARIA', 'Primaria'
        BACHILLERATO = 'BACHILLERATO', 'Bachillerato'
        TECNICO = 'TECNICO', 'Técnico'
        TECNOLOGO = 'TECNOLOGO', 'Tecnólogo'
        PREGRADO = 'PREGRADO', 'Pregrado / Profesional'
        ESPECIALIZACION = 'ESPECIALIZACION', 'Especialización'
        MAESTRIA = 'MAESTRIA', 'Maestría'
        DOCTORADO = 'DOCTORADO', 'Doctorado'

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='education',
    )
    level = models.CharField('Nivel educativo', max_length=20, choices=Level.choices)
    institution = models.CharField('Institución', max_length=200)
    program = models.CharField('Programa', max_length=200)
    title = models.CharField('Título obtenido', max_length=200)
    graduation_date = models.DateField('Fecha de grado', null=True, blank=True)
    credential_number = models.CharField('Número de tarjeta profesional', max_length=64, blank=True)

    class Meta:
        verbose_name = 'Educación del empleado'
        verbose_name_plural = 'Educación de empleados'
        ordering = ['employee', 'level']
        indexes = [models.Index(fields=['employee'])]

    def __str__(self) -> str:
        return f'{self.employee} — {self.get_level_display()}: {self.program}'


class EmployeeExperience(models.Model):
    """Historial de experiencia laboral del empleado."""

    class Sector(models.TextChoices):
        PUBLICO = 'PUBLICO', 'Público'
        PRIVADO = 'PRIVADO', 'Privado'
        MIXTO = 'MIXTO', 'Mixto'
        INDEPENDIENTE = 'INDEPENDIENTE', 'Independiente'
        OTRO = 'OTRO', 'Otro'

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='experience',
    )
    employer = models.CharField('Empleador', max_length=200)
    position_name = models.CharField('Cargo desempeñado', max_length=200)
    sector = models.CharField('Sector', max_length=20, choices=Sector.choices)
    start_date = models.DateField('Fecha de inicio')
    end_date = models.DateField('Fecha de retiro', null=True, blank=True)
    is_current = models.BooleanField('Empleo actual', default=False)
    is_public_sector = models.BooleanField('Sector público', default=False)
    functions = models.TextField('Funciones desempeñadas', blank=True)

    class Meta:
        verbose_name = 'Experiencia laboral'
        verbose_name_plural = 'Experiencias laborales'
        ordering = ['employee', '-start_date']
        indexes = [models.Index(fields=['employee'])]

    def clean(self):
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({'end_date': 'La fecha de retiro no puede ser anterior al inicio.'})
        if self.is_current and self.end_date:
            self.end_date = None

    def __str__(self) -> str:
        return f'{self.employee} — {self.employer} ({self.start_date})'


class EmployeeTraining(models.Model):
    """Capacitaciones y cursos realizados por el empleado."""

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='training',
    )
    topic = models.CharField('Tema', max_length=200)
    hours = models.PositiveIntegerField('Horas', default=0)
    institution = models.CharField('Institución', max_length=200)
    completed_at = models.DateField('Fecha de finalización', null=True, blank=True)
    cert = models.CharField('Número de certificado', max_length=64, blank=True)

    class Meta:
        verbose_name = 'Capacitación'
        verbose_name_plural = 'Capacitaciones'
        ordering = ['employee', '-completed_at']

    def __str__(self) -> str:
        return f'{self.employee} — {self.topic}'


class EmployeeEvaluation(models.Model):
    """Evaluación de desempeño anual del empleado."""

    class Result(models.TextChoices):
        SOBRESALIENTE = 'SOBRESALIENTE', 'Sobresaliente'
        SATISFACTORIO = 'SATISFACTORIO', 'Satisfactorio'
        NO_SATISFACTORIO = 'NO_SATISFACTORIO', 'No satisfactorio'

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='evaluations',
    )
    year = models.PositiveIntegerField('Año')
    score = models.DecimalField('Puntaje', max_digits=6, decimal_places=2)
    result = models.CharField('Resultado', max_length=20, choices=Result.choices)
    evaluator = models.CharField('Evaluador', max_length=200)
    at = models.DateField('Fecha de evaluación')

    class Meta:
        verbose_name = 'Evaluación de desempeño'
        verbose_name_plural = 'Evaluaciones de desempeño'
        ordering = ['employee', '-year']
        unique_together = [('employee', 'year')]

    def __str__(self) -> str:
        return f'{self.employee} — {self.year}: {self.get_result_display()}'


class EmploymentRecord(AuditedModel):
    """Registro de vinculación laboral del empleado."""

    class AppointmentType(models.TextChoices):
        CARRERA = 'CARRERA', 'Carrera administrativa'
        LNR = 'LNR', 'Libre nombramiento y remoción'
        PROVISIONAL = 'PROVISIONAL', 'Provisional'
        TEMPORAL = 'TEMPORAL', 'Temporal'
        SUPERNUMERARIO = 'SUPERNUMERARIO', 'Supernumerario'
        TRABAJADOR_OFICIAL = 'TRABAJADOR_OFICIAL', 'Trabajador oficial'

    class AdminStatus(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        VACACIONES = 'VACACIONES', 'En vacaciones'
        LICENCIA_REMUNERADA = 'LICENCIA_REMUNERADA', 'Licencia remunerada'
        LICENCIA_NO_REMUNERADA = 'LICENCIA_NO_REMUNERADA', 'Licencia no remunerada'
        COMISION_SERVICIOS = 'COMISION_SERVICIOS', 'Comisión de servicios'
        COMISION_ESTUDIO = 'COMISION_ESTUDIO', 'Comisión de estudios'
        ENCARGO = 'ENCARGO', 'En encargo'
        SUSPENDIDO = 'SUSPENDIDO', 'Suspendido'

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='employment_records',
    )
    position = models.ForeignKey(
        'planta.PayrollPosition',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='employment_records',
    )
    entity = models.ForeignKey(
        Entity, on_delete=models.CASCADE, related_name='employment_records',
    )
    appointment_type = models.CharField(
        'Forma de vinculación', max_length=20, choices=AppointmentType.choices,
    )
    appointment_date = models.DateField('Fecha de posesión')
    termination_date = models.DateField('Fecha de retiro', null=True, blank=True)
    termination_reason = models.CharField('Motivo de retiro', max_length=200, blank=True)
    administrative_status = models.CharField(
        'Situación administrativa', max_length=25,
        choices=AdminStatus.choices,
        default=AdminStatus.ACTIVO,
    )
    is_active = models.BooleanField('Vigente', default=True)

    class Meta:
        verbose_name = 'Vinculación laboral'
        verbose_name_plural = 'Vinculaciones laborales'
        ordering = ['employee', '-appointment_date']
        indexes = [
            models.Index(fields=['employee']),
            models.Index(fields=['position']),
        ]

    def clean(self):
        if self.termination_date and self.appointment_date and self.termination_date < self.appointment_date:
            raise ValidationError({'termination_date': 'La fecha de retiro no puede ser anterior a la posesión.'})

    def __str__(self) -> str:
        return f'{self.employee} — {self.get_appointment_type_display()} ({self.appointment_date})'

"""Módulo de Equipo Técnico de la reestructuración."""
from django.db import models
from apps.common.audit import AuditedModel


class TechnicalTeamMember(AuditedModel):
    """Miembro del equipo técnico de la reestructuración."""

    class Role(models.TextChoices):
        COORDINADOR = 'COORDINADOR', 'Coordinador'
        PLANEACION = 'PLANEACION', 'Planeación'
        JURIDICO = 'JURIDICO', 'Jurídico'
        FINANCIERO = 'FINANCIERO', 'Financiero'
        TALENTO_HUMANO = 'TH', 'Talento Humano'
        TECNICO = 'TECNICO', 'Técnico'
        OTRO = 'OTRO', 'Otro'

    restructuring = models.ForeignKey(
        'core.Restructuring', on_delete=models.CASCADE, related_name='team_members',
    )
    name = models.CharField('Nombre completo', max_length=255)
    position = models.CharField('Cargo', max_length=255, blank=True)
    department = models.CharField('Dependencia', max_length=255, blank=True)
    role_in_team = models.CharField('Rol en el equipo', max_length=16, choices=Role.choices)
    email = models.EmailField('Correo', blank=True)
    phone = models.CharField('Teléfono', max_length=20, blank=True)
    active = models.BooleanField('Activo', default=True)

    class Meta:
        verbose_name = 'Miembro del equipo técnico'
        verbose_name_plural = 'Miembros del equipo técnico'
        ordering = ['role_in_team', 'name']

    def __str__(self):
        return f'{self.name} ({self.get_role_in_team_display()})'

"""
Jota — asistente conversacional determinista por palabras clave.

Sin IA, sin servicios externos. Todo el contenido es administrable desde el
admin de Django por superusuarios.
"""
from django.core.exceptions import ValidationError
from django.db import models


class JotaSettings(models.Model):
    """Singleton con la configuración global del asistente."""

    class Position(models.TextChoices):
        BOTTOM_RIGHT = 'bottom-right', 'Abajo a la derecha'
        BOTTOM_LEFT = 'bottom-left', 'Abajo a la izquierda'

    is_enabled = models.BooleanField('Habilitado', default=True)
    bot_name = models.CharField('Nombre del bot', max_length=64, default='Jota')
    welcome_message = models.TextField(
        'Mensaje de bienvenida',
        default='¡Hola! Soy **Jota**, tu asistente de ayuda. '
                'Pregúntame sobre los módulos de ReEstructura.Gov.',
    )
    fallback_message = models.TextField(
        'Mensaje fallback',
        default='No encontré información sobre eso. Prueba preguntando por '
                '"matriz de cargas", "planta", "diagnóstico" o "actos administrativos".',
    )
    suggested_questions = models.TextField(
        'Preguntas sugeridas (una por línea)',
        blank=True,
        default='¿Qué es la matriz de cargas?\n¿Cómo creo una reestructuración?\n¿Cómo genero el manual de funciones?\n¿Qué es el retén social?',
    )
    position = models.CharField(
        'Posición', max_length=16, choices=Position.choices, default=Position.BOTTOM_RIGHT,
    )
    primary_color = models.CharField(
        'Color primario (hex)', max_length=16, default='#0e7490',
        help_text='Color del botón flotante.',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración de Jota'
        verbose_name_plural = 'Configuración de Jota'

    def __str__(self) -> str:
        return f'Jota — {"activo" if self.is_enabled else "inactivo"}'

    def clean(self):
        # Singleton: no permitir más de un registro.
        if not self.pk and JotaSettings.objects.exists():
            raise ValidationError('Solo puede existir una configuración de Jota.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        # Invalidar la cache del motor de matching.
        from . import matching
        matching.invalidate_cache()

    @classmethod
    def get_solo(cls) -> 'JotaSettings':
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class JotaIntent(models.Model):
    """Una pregunta/tema que el bot sabe responder."""

    name = models.CharField('Nombre', max_length=128)
    slug = models.SlugField('Slug', max_length=140, unique=True)
    category = models.CharField('Categoría', max_length=64, blank=True,
                                help_text='Ej.: Módulos, Flujo general, Problemas comunes.')
    keywords = models.TextField(
        'Palabras clave',
        help_text='Separa por comas o saltos de línea. Coincidencia por subcadena, sin tildes, en minúsculas.',
    )
    answer = models.TextField(
        'Respuesta',
        help_text='Markdown ligero: **negrita**, *itálica*, - listas, [texto](/ruta).',
    )
    priority = models.PositiveSmallIntegerField('Prioridad', default=10,
                                                help_text='Mayor = gana en empates.')
    is_active = models.BooleanField('Activo', default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Intención de Jota'
        verbose_name_plural = 'Intenciones de Jota'
        ordering = ['-priority', 'name']
        indexes = [models.Index(fields=['is_active', 'priority'])]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from . import matching
        matching.invalidate_cache()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        from . import matching
        matching.invalidate_cache()

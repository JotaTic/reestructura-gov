import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cargas', '0004_workloadentry_procedure_step'),
        ('core', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ManualFuncionesOverride',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado en')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado en')),
                ('job_code', models.CharField(max_length=8, verbose_name='Código')),
                ('job_grade', models.CharField(blank=True, default='', max_length=8, verbose_name='Grado')),
                ('custom_purpose', models.TextField(blank=True, default='', verbose_name='Propósito personalizado')),
                ('custom_functions', models.JSONField(default=list, verbose_name='Funciones personalizadas')),
                ('custom_requirements', models.JSONField(default=dict, verbose_name='Requisitos personalizados')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL, verbose_name='Creado por')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL, verbose_name='Actualizado por')),
                ('entity', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='manual_overrides', to='core.entity')),
                ('restructuring', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='manual_overrides', to='core.restructuring')),
            ],
            options={
                'verbose_name': 'Ajuste manual de funciones',
                'unique_together': {('entity', 'restructuring', 'job_code', 'job_grade')},
            },
        ),
    ]

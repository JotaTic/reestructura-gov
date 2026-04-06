"""Sprint 10 — CommitteeMember model + CommitteeMeeting.minutes_file."""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('participacion', '0002_rename_participaci_committ_date_idx_participaci_committ_a9abe1_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='CommitteeMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado en')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado en')),
                ('name', models.CharField(max_length=255, verbose_name='Nombre')),
                ('position', models.CharField(max_length=255, verbose_name='Cargo')),
                ('member_type', models.CharField(
                    choices=[('EMPLOYEE_REP', 'Representante empleados'), ('ENTITY_REP', 'Representante entidad')],
                    max_length=20, verbose_name='Tipo de representante',
                )),
                ('start_date', models.DateField(verbose_name='Fecha de inicio')),
                ('end_date', models.DateField(blank=True, null=True, verbose_name='Fecha de fin')),
                ('active', models.BooleanField(default=True, verbose_name='Activo')),
                ('committee', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='member_records',
                    to='participacion.personnelcommittee',
                    verbose_name='Comisión',
                )),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('updated_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Miembro de comisión',
                'verbose_name_plural': 'Miembros de comisión',
                'ordering': ['committee', '-active', 'name'],
            },
        ),
        migrations.AddField(
            model_name='committeemeeting',
            name='minutes_file',
            field=models.FileField(blank=True, null=True, upload_to='actas/', verbose_name='Archivo del acta'),
        ),
    ]

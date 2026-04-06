from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0007_restructuring_new_statuses'),
        ('documentos', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='OfficialConsultation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado en')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado en')),
                ('entity_target', models.CharField(
                    choices=[
                        ('DAFP', 'Función Pública'),
                        ('MINHACIENDA', 'MinHacienda'),
                        ('MINTRABAJO', 'MinTrabajo'),
                        ('CNSC', 'CNSC'),
                        ('CONTRALORIA', 'Contraloría'),
                        ('PERSONERIA', 'Personería'),
                        ('OTRO', 'Otro'),
                    ],
                    max_length=16,
                    verbose_name='Organismo consultado',
                )),
                ('subject', models.CharField(max_length=500, verbose_name='Asunto')),
                ('sent_at', models.DateField(blank=True, null=True, verbose_name='Fecha de envío')),
                ('reference_number', models.CharField(blank=True, max_length=100, verbose_name='Número de radicado')),
                ('response_at', models.DateField(blank=True, null=True, verbose_name='Fecha de respuesta')),
                ('response_result', models.CharField(
                    choices=[
                        ('PENDIENTE', 'Pendiente'),
                        ('FAVORABLE', 'Favorable'),
                        ('NO_FAVORABLE', 'No favorable'),
                        ('CON_OBSERVACIONES', 'Con observaciones'),
                    ],
                    default='PENDIENTE',
                    max_length=24,
                    verbose_name='Resultado de la respuesta',
                )),
                ('notes', models.TextField(blank=True, verbose_name='Notas')),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Creado por',
                )),
                ('updated_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Actualizado por',
                )),
                ('restructuring', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='consultations',
                    to='core.restructuring',
                    verbose_name='Reestructuración',
                )),
                ('response_document', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='consultation_responses',
                    to='documentos.document',
                    verbose_name='Documento de respuesta',
                )),
            ],
            options={
                'verbose_name': 'Consulta oficial',
                'verbose_name_plural': 'Consultas oficiales',
                'ordering': ['-sent_at', 'entity_target'],
            },
        ),
        migrations.AddIndex(
            model_name='officialconsultation',
            index=models.Index(fields=['restructuring', 'entity_target'], name='consultas_restr_target_idx'),
        ),
    ]

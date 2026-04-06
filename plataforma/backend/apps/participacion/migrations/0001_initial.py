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
            name='PersonnelCommittee',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado en')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado en')),
                ('name', models.CharField(default='Comisión de Personal', max_length=255, verbose_name='Nombre')),
                ('members_json', models.JSONField(
                    blank=True,
                    default=list,
                    help_text='Lista de objetos {name, role, since}.',
                    verbose_name='Miembros',
                )),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Creado por',
                )),
                ('updated_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Actualizado por',
                )),
                ('entity', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='committees',
                    to='core.entity',
                    verbose_name='Entidad',
                )),
            ],
            options={
                'verbose_name': 'Comisión de personal',
                'verbose_name_plural': 'Comisiones de personal',
                'ordering': ['entity', 'name'],
                'unique_together': {('entity', 'name')},
            },
        ),
        migrations.CreateModel(
            name='CommitteeMeeting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado en')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado en')),
                ('date', models.DateField(verbose_name='Fecha')),
                ('agenda', models.TextField(blank=True, verbose_name='Orden del día')),
                ('minutes_text', models.TextField(blank=True, verbose_name='Acta (texto)')),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Creado por',
                )),
                ('updated_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Actualizado por',
                )),
                ('committee', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='meetings',
                    to='participacion.personnelcommittee',
                    verbose_name='Comisión',
                )),
                ('restructuring', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='committee_meetings',
                    to='core.restructuring',
                    verbose_name='Reestructuración',
                )),
                ('minutes_document', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='committee_minutes',
                    to='documentos.document',
                    verbose_name='Documento del acta',
                )),
            ],
            options={
                'verbose_name': 'Reunión de comisión',
                'verbose_name_plural': 'Reuniones de comisión',
                'ordering': ['-date'],
            },
        ),
        migrations.AddIndex(
            model_name='committeemeeting',
            index=models.Index(fields=['committee', 'date'], name='participaci_committ_date_idx'),
        ),
        migrations.AddIndex(
            model_name='committeemeeting',
            index=models.Index(fields=['restructuring'], name='participaci_restr_idx'),
        ),
        migrations.CreateModel(
            name='UnionCommunication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado en')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado en')),
                ('union_name', models.CharField(max_length=255, verbose_name='Organización sindical')),
                ('sent_at', models.DateField(verbose_name='Fecha de envío')),
                ('subject', models.CharField(max_length=500, verbose_name='Asunto')),
                ('body', models.TextField(blank=True, verbose_name='Cuerpo del comunicado')),
                ('response_received', models.BooleanField(default=False, verbose_name='¿Respuesta recibida?')),
                ('response_notes', models.TextField(blank=True, verbose_name='Notas de la respuesta')),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Creado por',
                )),
                ('updated_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Actualizado por',
                )),
                ('restructuring', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='union_communications',
                    to='core.restructuring',
                    verbose_name='Reestructuración',
                )),
                ('document', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to='documentos.document',
                    verbose_name='Documento',
                )),
            ],
            options={
                'verbose_name': 'Comunicación sindical',
                'verbose_name_plural': 'Comunicaciones sindicales',
                'ordering': ['-sent_at', 'union_name'],
            },
        ),
        migrations.AddIndex(
            model_name='unioncommunication',
            index=models.Index(fields=['restructuring', 'sent_at'], name='participaci_union_restr_idx'),
        ),
    ]

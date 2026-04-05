from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('diagnostico', '0002_diagnosis_restructuring'),
        ('core', '0004_backfill_legacy_restructuring'),
    ]

    operations = [
        migrations.AlterField(
            model_name='diagnosis',
            name='restructuring',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='diagnoses',
                to='core.restructuring',
            ),
        ),
    ]

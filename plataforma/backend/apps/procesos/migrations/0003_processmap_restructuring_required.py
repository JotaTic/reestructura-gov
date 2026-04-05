from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procesos', '0002_processmap_restructuring'),
        ('core', '0004_backfill_legacy_restructuring'),
    ]

    operations = [
        migrations.AlterField(
            model_name='processmap',
            name='restructuring',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='process_maps',
                to='core.restructuring',
            ),
        ),
    ]

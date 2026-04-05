from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cargas', '0002_workloadmatrix_restructuring'),
        ('core', '0004_backfill_legacy_restructuring'),
    ]

    operations = [
        migrations.AlterField(
            model_name='workloadmatrix',
            name='restructuring',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='workload_matrices',
                to='core.restructuring',
            ),
        ),
    ]

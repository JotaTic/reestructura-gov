from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planta', '0002_payrollplan_restructuring'),
        ('core', '0004_backfill_legacy_restructuring'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payrollplan',
            name='restructuring',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='payroll_plans',
                to='core.restructuring',
            ),
        ),
    ]

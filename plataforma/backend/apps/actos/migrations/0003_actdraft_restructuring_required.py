from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('actos', '0002_actdraft_restructuring'),
        ('core', '0004_backfill_legacy_restructuring'),
    ]

    operations = [
        migrations.AlterField(
            model_name='actdraft',
            name='restructuring',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='act_drafts',
                to='core.restructuring',
            ),
        ),
    ]

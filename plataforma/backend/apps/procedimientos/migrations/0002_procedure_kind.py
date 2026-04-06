from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procedimientos', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='procedure',
            name='kind',
            field=models.CharField(
                'Tipo',
                max_length=10,
                choices=[('CURRENT', 'Vigente'), ('PROPOSED', 'Propuesto')],
                default='CURRENT',
            ),
        ),
    ]

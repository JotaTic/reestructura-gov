from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('talento', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='cv_file',
            field=models.FileField(
                blank=True, null=True, upload_to='hojas_de_vida/', verbose_name='Hoja de vida',
            ),
        ),
    ]

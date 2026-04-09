from django.contrib import admin
from .models import WorkloadSurvey, SurveyParticipant, SurveyActivity

admin.site.register(WorkloadSurvey)
admin.site.register(SurveyParticipant)
admin.site.register(SurveyActivity)

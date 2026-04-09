"""
Servicio de consolidación: convierte las actividades aprobadas de una encuesta
en entradas de la matriz de cargas de trabajo (WorkloadEntry).
"""
from apps.cargas.models import WorkloadEntry


def consolidate_survey_to_matrix(survey):
    """
    Toma las SurveyActivity aprobadas y no consolidadas y las convierte
    en WorkloadEntry dentro de la matriz vinculada.
    """
    from .models import SurveyActivity

    activities = SurveyActivity.objects.filter(
        participant__survey=survey,
        approved=True,
        consolidated=False,
    ).select_related('participant', 'participant__department')

    created = 0
    errors = []

    for act in activities:
        participant = act.participant
        try:
            entry = WorkloadEntry(
                matrix=survey.matrix,
                department=participant.department,
                process=act.process,
                activity=act.activity,
                procedure=act.procedure,
                hierarchy_level=act.hierarchy_level or 'PROFESIONAL',
                requirements='',
                job_denomination=participant.job_denomination or participant.contract_object[:255] if participant.contract_object else '',
                job_code=participant.job_code,
                job_grade=participant.job_grade,
                main_purpose='',
                monthly_frequency=act.monthly_frequency,
                t_min=act.t_min,
                t_usual=act.t_usual,
                t_max=act.t_max,
            )
            entry.save()
            act.consolidated = True
            act.save(update_fields=['consolidated'])
            created += 1
        except Exception as e:
            errors.append({
                'activity_id': act.id,
                'participant': participant.full_name,
                'error': str(e),
            })

    return {
        'consolidated': created,
        'errors': errors,
        'total_pending': SurveyActivity.objects.filter(
            participant__survey=survey,
            approved=True,
            consolidated=False,
        ).count(),
    }

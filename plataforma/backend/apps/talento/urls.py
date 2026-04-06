from rest_framework.routers import DefaultRouter

from .views import (
    EmployeeViewSet,
    EmployeeEducationViewSet,
    EmployeeExperienceViewSet,
    EmployeeTrainingViewSet,
    EmployeeEvaluationViewSet,
    EmploymentRecordViewSet,
)

router = DefaultRouter()
router.register('empleados', EmployeeViewSet, basename='employee')
router.register('empleados-educacion', EmployeeEducationViewSet, basename='employee-education')
router.register('empleados-experiencia', EmployeeExperienceViewSet, basename='employee-experience')
router.register('empleados-capacitacion', EmployeeTrainingViewSet, basename='employee-training')
router.register('empleados-evaluaciones', EmployeeEvaluationViewSet, basename='employee-evaluation')
router.register('empleados-vinculaciones', EmploymentRecordViewSet, basename='employment-record')

urlpatterns = router.urls

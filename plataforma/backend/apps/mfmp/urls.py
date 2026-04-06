from rest_framework.routers import DefaultRouter

from .views import (
    MFMPViewSet,
    MFMPIncomeProjectionViewSet,
    MFMPExpenseProjectionViewSet,
    MFMPDebtProjectionViewSet,
    MFMPScenarioViewSet,
)

router = DefaultRouter()
router.register(r'mfmp', MFMPViewSet, basename='mfmp')
router.register(r'mfmp-ingresos', MFMPIncomeProjectionViewSet, basename='mfmp-ingresos')
router.register(r'mfmp-gastos', MFMPExpenseProjectionViewSet, basename='mfmp-gastos')
router.register(r'mfmp-deuda', MFMPDebtProjectionViewSet, basename='mfmp-deuda')
router.register(r'mfmp-escenarios', MFMPScenarioViewSet, basename='mfmp-escenarios')

urlpatterns = router.urls

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LancamentoFinanceiroViewSet

router = DefaultRouter()
router.register(r'lancamentos', LancamentoFinanceiroViewSet, basename='lancamento-financeiro')

urlpatterns = [
    path('', include(router.urls)),
]
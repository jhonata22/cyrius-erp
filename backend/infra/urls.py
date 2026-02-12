from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import AtivoViewSet

router = DefaultRouter()
# Adicionado basename='ativo' para garantir estabilidade nos testes e roteamento correto
router.register(r'ativos', AtivoViewSet, basename='ativo')

urlpatterns = [
    path('', include(router.urls)),
]
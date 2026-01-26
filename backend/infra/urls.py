from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import AtivoViewSet, DocumentacaoTecnicaViewSet

router = DefaultRouter()
router.register(r'ativos', AtivoViewSet)
router.register(r'documentacao', DocumentacaoTecnicaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
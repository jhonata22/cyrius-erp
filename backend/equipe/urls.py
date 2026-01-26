from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import EquipeViewSet

router = DefaultRouter()
router.register(r'equipe', EquipeViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    ClienteViewSet, ContatoClienteViewSet, ProvedorInternetViewSet, 
    ContaEmailViewSet, ContratoViewSet
)

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet)
router.register(r'contatos', ContatoClienteViewSet)
router.register(r'provedores', ProvedorInternetViewSet)
router.register(r'emails', ContaEmailViewSet)
router.register(r'contratos', ContratoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
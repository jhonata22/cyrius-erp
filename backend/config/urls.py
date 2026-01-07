"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# 1. IMPORTS ATUALIZADOS (Incluindo as novas Views)
from core.views import (
    ClienteViewSet, 
    ChamadoViewSet, 
    EquipeViewSet, 
    FinanceiroViewSet,
    # --- Novas Views Abaixo ---
    ContatoClienteViewSet, 
    ProvedorInternetViewSet, 
    ContaEmailViewSet, 
    DocumentacaoTecnicaViewSet, 
    AtivoViewSet
)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()

# --- ROTAS EXISTENTES ---
router.register(r'clientes', ClienteViewSet)
router.register(r'equipe', EquipeViewSet)
router.register(r'chamados', ChamadoViewSet, basename='chamado')
router.register(r'financeiro', FinanceiroViewSet)

# --- NOVAS ROTAS (Essenciais para a Documentação funcionar) ---
router.register(r'contatos', ContatoClienteViewSet)
router.register(r'provedores', ProvedorInternetViewSet)
router.register(r'emails', ContaEmailViewSet)
router.register(r'documentacao', DocumentacaoTecnicaViewSet)
router.register(r'ativos', AtivoViewSet) # <--- AQUI ESTÁ A CORREÇÃO DO ERRO 404

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Rotas da API
    path('api/', include(router.urls)), 

    # Rotas de Autenticação (JWT)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
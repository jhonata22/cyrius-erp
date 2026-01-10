"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

# 1. IMPORTS ATUALIZADOS
from core.views import (
    ClienteViewSet, 
    ChamadoViewSet, 
    EquipeViewSet, 
    # MUDANÇA AQUI: O nome da classe no views.py agora é LancamentoFinanceiroViewSet
    LancamentoFinanceiroViewSet, 
    ContatoClienteViewSet, 
    ProvedorInternetViewSet, 
    ContaEmailViewSet, 
    DocumentacaoTecnicaViewSet, 
    AtivoViewSet, 
    FornecedorViewSet, 
    ProdutoViewSet, 
    MovimentacaoEstoqueViewSet
)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()

router.register(r'clientes', ClienteViewSet)
router.register(r'equipe', EquipeViewSet)
router.register(r'chamados', ChamadoViewSet, basename='chamado')

# MUDANÇA AQUI: Registrando o novo ViewSet
router.register(r'financeiro', LancamentoFinanceiroViewSet)

router.register(r'contatos', ContatoClienteViewSet)
router.register(r'provedores', ProvedorInternetViewSet)
router.register(r'emails', ContaEmailViewSet)
router.register(r'documentacao', DocumentacaoTecnicaViewSet)
router.register(r'fornecedores', FornecedorViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'estoque', MovimentacaoEstoqueViewSet)
router.register(r'ativos', AtivoViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Rotas da API (O router vai incluir automaticamente o 'gerar-mensalidades')
    path('api/', include(router.urls)), 

    # Rotas de Autenticação (JWT)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
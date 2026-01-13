"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

from core.views import (
    ClienteViewSet, 
    ChamadoViewSet, 
    EquipeViewSet, 
    LancamentoFinanceiroViewSet, 
    ContatoClienteViewSet, 
    ProvedorInternetViewSet, 
    ContaEmailViewSet, 
    DocumentacaoTecnicaViewSet, 
    AtivoViewSet, 
    FornecedorViewSet, 
    ProdutoViewSet, 
    MovimentacaoEstoqueViewSet,
    OrdemServicoViewSet
)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()

# 1. Clientes e Equipe
router.register(r'clientes', ClienteViewSet)
router.register(r'equipe', EquipeViewSet)
router.register(r'contatos', ContatoClienteViewSet)
router.register(r'provedores', ProvedorInternetViewSet)
router.register(r'emails', ContaEmailViewSet)
router.register(r'documentacao', DocumentacaoTecnicaViewSet)

# 2. Operacional
router.register(r'chamados', ChamadoViewSet, basename='chamado')
router.register(r'ativos', AtivoViewSet)
router.register(r'servicos', OrdemServicoViewSet, basename='servicos')

# 3. Financeiro
router.register(r'financeiro', LancamentoFinanceiroViewSet)

# 4. Estoque (CORREÇÃO AQUI)
# Antes estava apenas 'produtos' e 'estoque', agora agrupamos:
router.register(r'fornecedores', FornecedorViewSet)
router.register(r'estoque/produtos', ProdutoViewSet, basename='produtos') 
router.register(r'estoque/movimentacoes', MovimentacaoEstoqueViewSet, basename='movimentacoes')

# OBS: Se você tiver páginas antigas acessando '/api/produtos/' direto, 
# elas vão quebrar. O ideal é atualizar o frontend para usar o novo padrão 
# OU manter a linha abaixo descomentada como "alias":
# router.register(r'produtos', ProdutoViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Rotas da API
    path('api/', include(router.urls)), 

    # Rotas de Autenticação (JWT)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
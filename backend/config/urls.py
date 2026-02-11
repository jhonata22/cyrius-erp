"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

# ==========================================================
# 1. IMPORTAÇÕES DOS APPS
# ==========================================================
from clientes.views import (
    ClienteViewSet, 
    ContatoClienteViewSet, 
    ProvedorInternetViewSet, 
    ContaEmailViewSet, 
    DocumentacaoTecnicaViewSet, 
    ContratoViewSet
)
from equipe.views import EquipeViewSet
from infra.views import AtivoViewSet
from estoque.views import (
    FornecedorViewSet, 
    ProdutoViewSet, 
    MovimentacaoEstoqueViewSet
)
from servicos.views import (
    OrdemServicoViewSet, 
    ItemServicoViewSet, 
    AnexoServicoViewSet,
    NotificacaoViewSet
)
from chamados.views import ChamadoViewSet
from financeiro.views import LancamentoFinanceiroViewSet

# [NOVO] Importação do Core (Empresas)
from core.views import EmpresaViewSet 

# Autenticação JWT
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# ==========================================================
# 2. CONFIGURAÇÃO DO ROTEADOR
# ==========================================================
router = DefaultRouter()

# --- CORE (Multi-Empresa) ---
# Isso gera a rota: /api/core/empresas/
router.register(r'core/empresas', EmpresaViewSet, basename='empresa')

# --- Clientes e Equipe ---
router.register(r'clientes', ClienteViewSet)
router.register(r'equipe', EquipeViewSet)
router.register(r'contatos', ContatoClienteViewSet)
router.register(r'provedores', ProvedorInternetViewSet)
router.register(r'emails', ContaEmailViewSet)
router.register(r'documentacao', DocumentacaoTecnicaViewSet)

# --- Operacional (Chamados e Infra) ---
router.register(r'chamados', ChamadoViewSet, basename='chamado')
router.register(r'ativos', AtivoViewSet)

# --- Serviços (OS) ---
router.register(r'servicos', OrdemServicoViewSet, basename='servicos')
router.register(r'itens-servico', ItemServicoViewSet)
router.register(r'anexos-servico', AnexoServicoViewSet)
router.register(r'notificacoes', NotificacaoViewSet, basename='notificacao')

# --- Financeiro ---
# Ajustei para 'lancamentos' para bater com o padrão REST e com o Service que criamos
# Rota final: /api/lancamentos/
router.register(r'lancamentos', LancamentoFinanceiroViewSet, basename='lancamento-financeiro')

# --- Estoque e Contratos ---
router.register(r'fornecedores', FornecedorViewSet)
router.register(r'estoque/produtos', ProdutoViewSet, basename='produtos') 
router.register(r'estoque/movimentacoes', MovimentacaoEstoqueViewSet, basename='movimentacoes')
router.register(r'contratos', ContratoViewSet)

# ==========================================================
# 3. LISTA DE URLS
# ==========================================================
urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Rotas da API
    path('api/', include(router.urls)), 

    # Rotas de Autenticação (JWT)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Configuração de Arquivos de Mídia (Uploads)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
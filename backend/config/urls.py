"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static
from core import views as core_views

# 1. ADICIONE O IMPORT AQUI
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
    OrdemServicoViewSet,
    ContratoViewSet,
    ItemServicoViewSet # <--- IMPORT NOVO
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

# 2.1 Itens da OS (Para edição/exclusão individual)
router.register(r'itens-servico', ItemServicoViewSet) # <--- ROTA NOVA

# 3. Financeiro
router.register(r'financeiro', LancamentoFinanceiroViewSet)

router.register(r'fornecedores', FornecedorViewSet)
router.register(r'estoque/produtos', ProdutoViewSet, basename='produtos') 
router.register(r'estoque/movimentacoes', MovimentacaoEstoqueViewSet, basename='movimentacoes')
router.register(r'contratos', ContratoViewSet)
router.register(r'notificacoes', core_views.NotificacaoViewSet, basename='notificacao')

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
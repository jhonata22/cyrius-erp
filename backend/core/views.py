from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count
from rest_framework.decorators import action
from django.utils import timezone
from django.db import models



# Serviços (Camada de Negócio)
from core.services.estoque import processar_movimentacao_estoque
from core.services.chamado import finalizar_chamado
from core.services import financeiro as financeiro_service

from .models import (
    Cliente, ContatoCliente, ProvedorInternet, ContaEmail, DocumentacaoTecnica,
    Equipe, Chamado, ChamadoTecnico, LancamentoFinanceiro,
    Ativo, Fornecedor, Produto, MovimentacaoEstoque, FechamentoFinanceiro
)

from .serializers import (
    ClienteSerializer, ContatoClienteSerializer, ProvedorInternetSerializer,
    ContaEmailSerializer, DocumentacaoTecnicaSerializer,
    EquipeSerializer, ChamadoSerializer, ChamadoTecnicoSerializer,
    LancamentoFinanceiroSerializer, AtivoSerializer,
    FornecedorSerializer, ProdutoSerializer, MovimentacaoEstoqueSerializer
)

from .permissions import IsGestor

# --- MIXIN PARA OTIMIZAÇÃO (Evita N+1 Queries) ---
class OptimizedQuerySetMixin:
    """
    Otimiza as consultas automaticamente.
    Se o modelo possuir um campo chamado 'cliente', 
    ele já faz o JOIN no banco de dados automaticamente.
    """
    def get_queryset(self):
        qs = super().get_queryset()
        # O modelo está acessível através de qs.model
        if hasattr(qs.model, 'cliente'):
            return qs.select_related('cliente')
        return qs
# =====================================================
# 1. CLIENTES & DOCUMENTAÇÃO
# =====================================================

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]

class ContatoClienteViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = ContatoCliente.objects.all()
    serializer_class = ContatoClienteSerializer
    permission_classes = [IsAuthenticated]

class ProvedorInternetViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = ProvedorInternet.objects.all()
    serializer_class = ProvedorInternetSerializer
    permission_classes = [IsAuthenticated]

class ContaEmailViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = ContaEmail.objects.all()
    serializer_class = ContaEmailSerializer
    permission_classes = [IsAuthenticated]

class DocumentacaoTecnicaViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = DocumentacaoTecnica.objects.all()
    serializer_class = DocumentacaoTecnicaSerializer
    permission_classes = [IsAuthenticated]

# =====================================================
# 2. ATIVOS E EQUIPE
# =====================================================

class AtivoViewSet(OptimizedQuerySetMixin, viewsets.ModelViewSet):
    queryset = Ativo.objects.all()
    serializer_class = AtivoSerializer
    permission_classes = [IsAuthenticated]

class EquipeViewSet(viewsets.ModelViewSet):
    queryset = Equipe.objects.all()
    serializer_class = EquipeSerializer
    permission_classes = [IsAuthenticated]
    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Rota /api/equipe/me/ - Retorna os dados e estatísticas do técnico logado.
        """
        user = request.user
        try:
            membro = user.equipe
        except AttributeError:
            return Response({"erro": "Usuário não vinculado à equipe."}, status=404)

        if request.method == 'GET':
            # Cálculo de chamados do mês atual
            mes_atual = timezone.now().month
            stats = Chamado.objects.filter(
                chamadotecnico__tecnico=membro,
                created_at__month=mes_atual
            ).aggregate(
                total_mes=Count('id'),
                finalizados=Count('id', filter=models.Q(status='FINALIZADO')),
                em_aberto=Count('id', filter=models.Q(status__in=['ABERTO', 'EM_ANDAMENTO']))
            )

            serializer = self.get_serializer(membro)
            return Response({
                **serializer.data,
                "estatisticas_mes": stats
            })

        elif request.method == 'PATCH':
            # Permite atualizar nome e senha
            password = request.data.get('password')
            if password:
                user.set_password(password)
                user.save()
            
            serializer = self.get_serializer(membro, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)    

# =====================================================
# 3. CHAMADOS (Refatorado)
# =====================================================

class ChamadoViewSet(viewsets.ModelViewSet):
    serializer_class = ChamadoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or (hasattr(user, 'equipe') and user.equipe.cargo in ['GESTOR', 'SOCIO']):
            return Chamado.objects.all().order_by('-created_at')
        
        return Chamado.objects.filter(
            chamadotecnico__tecnico=user.equipe
        ).distinct().order_by('-created_at')

    def perform_create(self, serializer):
        with transaction.atomic():
            chamado = serializer.save()
            tecnicos = self.request.data.get('tecnicos', [])
            if tecnicos:
                tecnicos_ids = tecnicos if isinstance(tecnicos, list) else [tecnicos]
                for tec_id in tecnicos_ids:
                    Equipe.objects.filter(id=tec_id).exists() and ChamadoTecnico.objects.create(
                        chamado=chamado, tecnico_id=tec_id
                    )

    def perform_update(self, serializer):
        chamado = serializer.save()
        if chamado.status == 'FINALIZADO':
            finalizar_chamado(chamado)

# =====================================================
# 4. FINANCEIRO (Utilizando Services)
# =====================================================

class LancamentoFinanceiroViewSet(viewsets.ModelViewSet):
    queryset = LancamentoFinanceiro.objects.all().select_related('cliente')
    serializer_class = LancamentoFinanceiroSerializer
    permission_classes = [IsGestor]

    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        mes = request.query_params.get('mes')
        ano = request.query_params.get('ano')
        data = financeiro_service.calcular_estatisticas_financeiras(mes, ano)
        return Response(data)

    @action(detail=False, methods=['post'], url_path='fechar-mes')
    def fechar_mes(self, request):
        ano, mes = request.data.get('ano'), request.data.get('mes')
        f, criado = FechamentoFinanceiro.objects.get_or_create(
            ano=ano, mes=mes, defaults={'fechado_por': request.user}
        )
        return Response({"msg": "Mês fechado"} if criado else {"erro": "Já fechado"}, status=200 if criado else 400)

    @action(detail=False, methods=['post'], url_path='gerar-mensalidades')
    def gerar_mensalidades(self, request):
        qtd = financeiro_service.gerar_faturas_mensalidade(request.user)
        return Response({"faturas_geradas": qtd})

# =====================================================
# 5. ESTOQUE
# =====================================================

class FornecedorViewSet(viewsets.ModelViewSet):
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer
    permission_classes = [IsAuthenticated]

class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.com_estoque_calculado().order_by('nome')
    serializer_class = ProdutoSerializer
    permission_classes = [IsAuthenticated]

class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    queryset = MovimentacaoEstoque.objects.all().select_related('produto', 'cliente').order_by('-data_movimento')

    serializer_class = MovimentacaoEstoqueSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        dados = serializer.validated_data
        processar_movimentacao_estoque(usuario=self.request.user, **dados)
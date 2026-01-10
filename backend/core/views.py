from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from django.db.models import Sum, Q
from django.utils import timezone
from django.db import transaction

import datetime
import calendar

from core.services.financeiro import mes_esta_fechado

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


# =====================================================
# 1. CLIENTES & DOCUMENTAÇÃO
# =====================================================

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]


class ContatoClienteViewSet(viewsets.ModelViewSet):
    queryset = ContatoCliente.objects.all()
    serializer_class = ContatoClienteSerializer
    permission_classes = [IsAuthenticated]


class ProvedorInternetViewSet(viewsets.ModelViewSet):
    queryset = ProvedorInternet.objects.all()
    serializer_class = ProvedorInternetSerializer
    permission_classes = [IsAuthenticated]


class ContaEmailViewSet(viewsets.ModelViewSet):
    queryset = ContaEmail.objects.all()
    serializer_class = ContaEmailSerializer
    permission_classes = [IsAuthenticated]


class DocumentacaoTecnicaViewSet(viewsets.ModelViewSet):
    queryset = DocumentacaoTecnica.objects.all()
    serializer_class = DocumentacaoTecnicaSerializer
    permission_classes = [IsAuthenticated]


# =====================================================
# 2. ATIVOS
# =====================================================

class AtivoViewSet(viewsets.ModelViewSet):
    queryset = Ativo.objects.all()
    serializer_class = AtivoSerializer
    permission_classes = [IsAuthenticated]


# =====================================================
# 3. EQUIPE
# =====================================================

class EquipeViewSet(viewsets.ModelViewSet):
    queryset = Equipe.objects.all()
    serializer_class = EquipeSerializer
    permission_classes = [IsAuthenticated]


# =====================================================
# 4. CHAMADOS
# =====================================================

class ChamadoViewSet(viewsets.ModelViewSet):
    serializer_class = ChamadoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            return Chamado.objects.all().order_by('-created_at')

        try:
            if hasattr(user, 'equipe') and user.equipe.cargo in ['GESTOR', 'SOCIO']:
                return Chamado.objects.all().order_by('-created_at')

            return Chamado.objects.filter(
                chamadotecnico__tecnico=user.equipe
            ).order_by('-created_at')

        except AttributeError:
            return Chamado.objects.none()

    def perform_create(self, serializer):
        with transaction.atomic():
            chamado = serializer.save()
            tecnicos = self.request.data.get('tecnicos')

            if tecnicos:
                tecnicos_ids = tecnicos if isinstance(tecnicos, list) else [tecnicos]

                for tecnico_id in tecnicos_ids:
                    try:
                        tecnico = Equipe.objects.get(id=tecnico_id)
                        ChamadoTecnico.objects.create(
                            chamado=chamado,
                            tecnico=tecnico,
                            horas_trabalhadas=0
                        )
                    except Equipe.DoesNotExist:
                        pass


# =====================================================
# 5. FINANCEIRO
# =====================================================

class LancamentoFinanceiroViewSet(viewsets.ModelViewSet):
    queryset = LancamentoFinanceiro.objects.all().order_by('-data_vencimento')
    serializer_class = LancamentoFinanceiroSerializer
    permission_classes = [IsGestor]

    # ---------------------------
    # ESTATÍSTICAS GERAIS
    # ---------------------------
    @action(detail=False, methods=['get'], url_path='estatisticas')
    def estatisticas(self, request):
        hoje = timezone.now().date()

        stats = LancamentoFinanceiro.objects.aggregate(
            receita_real=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', status='PAGO')),
            despesa_real=Sum('valor', filter=Q(tipo_lancamento='SAIDA', status='PAGO')),
            inadimplencia=Sum(
                'valor',
                filter=Q(
                    tipo_lancamento='ENTRADA',
                    status__in=['PENDENTE', 'VENCIDO'],
                    data_vencimento__lt=hoje
                )
            ),
            vendas_hardware=Sum('valor', filter=Q(categoria='VENDA', status='PAGO'))
        )

        contratos_ativos = LancamentoFinanceiro.objects.filter(
            categoria='CONTRATO',
            status='PENDENTE'
        ).values('cliente').distinct().count()

        receita = stats['receita_real'] or 0
        despesa = stats['despesa_real'] or 0

        return Response({
            "receitaTotal": float(receita),
            "despesaTotal": float(despesa),
            "saldo": float(receita - despesa),
            "inadimplencia": float(stats['inadimplencia'] or 0),
            "vendasHardware": float(stats['vendas_hardware'] or 0),
            "contratosAtivos": contratos_ativos
        })

    # ---------------------------
    # ESTATÍSTICAS MENSAIS
    # ---------------------------
    @action(detail=False, methods=['get'], url_path='estatisticas-mensais')
    def estatisticas_mensais(self, request):
        try:
            mes = int(request.query_params.get('mes'))
            ano = int(request.query_params.get('ano'))
        except (TypeError, ValueError):
            return Response(
                {"erro": "Parâmetros 'mes' e 'ano' são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST
            )

        hoje = timezone.now().date()

        base_queryset = LancamentoFinanceiro.objects.filter(
            data_vencimento__month=mes,
            data_vencimento__year=ano
        )

        stats = base_queryset.aggregate(
            receita_real=Sum('valor', filter=Q(tipo_lancamento='ENTRADA', status='PAGO')),
            despesa_real=Sum('valor', filter=Q(tipo_lancamento='SAIDA', status='PAGO')),
            inadimplencia=Sum(
                'valor',
                filter=Q(
                    tipo_lancamento='ENTRADA',
                    status__in=['PENDENTE', 'VENCIDO'],
                    data_vencimento__lt=hoje
                )
            ),
            vendas_hardware=Sum('valor', filter=Q(categoria='VENDA', status='PAGO'))
        )

        contratos_ativos = base_queryset.filter(
            categoria='CONTRATO',
            status='PENDENTE'
        ).values('cliente').distinct().count()

        receita = stats['receita_real'] or 0
        despesa = stats['despesa_real'] or 0

        return Response({
            "mes": mes,
            "ano": ano,
            "receitaTotal": float(receita),
            "despesaTotal": float(despesa),
            "saldo": float(receita - despesa),
            "inadimplencia": float(stats['inadimplencia'] or 0),
            "vendasHardware": float(stats['vendas_hardware'] or 0),
            "contratosAtivos": contratos_ativos
        })

    # ---------------------------
    # FECHAR MÊS
    # ---------------------------
    @action(detail=False, methods=['post'], url_path='fechar-mes')
    def fechar_mes(self, request):
        try:
            ano = int(request.data.get('ano'))
            mes = int(request.data.get('mes'))
        except (TypeError, ValueError):
            return Response(
                {"erro": "Ano e mês são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST
            )

        fechamento, criado = FechamentoFinanceiro.objects.get_or_create(
            ano=ano,
            mes=mes,
            defaults={"fechado_por": request.user}
        )

        if not criado:
            return Response(
                {"erro": "Este mês já está fechado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {"mensagem": f"Mês {mes:02d}/{ano} fechado com sucesso."},
            status=status.HTTP_200_OK
        )

    # ---------------------------
    # GERAR MENSALIDADES
    # ---------------------------
    @action(detail=False, methods=['post'], url_path='gerar-mensalidades')
    def gerar_mensalidades(self, request):
        agora = timezone.now()
        mes_atual = agora.month
        ano_atual = agora.year

        clientes_ativos = Cliente.objects.filter(
            ativo=True,
            tipo_cliente='CONTRATO',
            valor_contrato_mensal__gt=0
        )

        gerados = 0
        erros = []

        for cliente in clientes_ativos:
            existe = LancamentoFinanceiro.objects.filter(
                cliente=cliente,
                categoria='CONTRATO',
                data_vencimento__month=mes_atual,
                data_vencimento__year=ano_atual
            ).exists()

            if existe:
                continue

            try:
                try:
                    vencimento = datetime.date(
                        ano_atual, mes_atual, cliente.dia_vencimento
                    )
                except ValueError:
                    ultimo_dia = calendar.monthrange(ano_atual, mes_atual)[1]
                    vencimento = datetime.date(ano_atual, mes_atual, ultimo_dia)

                LancamentoFinanceiro.objects.create(
                    descricao=f"Mensalidade Contrato - {mes_atual:02d}/{ano_atual}",
                    valor=cliente.valor_contrato_mensal,
                    tipo_lancamento='ENTRADA',
                    categoria='CONTRATO',
                    status='PENDENTE',
                    data_vencimento=vencimento,
                    cliente=cliente
                )

                gerados += 1

            except Exception as e:
                erros.append(f"{cliente.razao_social}: {str(e)}")

        return Response({
            "mensagem": "Processamento concluído.",
            "faturas_geradas": gerados,
            "erros": erros
        })


# =====================================================
# 6. ESTOQUE
# =====================================================

class FornecedorViewSet(viewsets.ModelViewSet):
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer
    permission_classes = [IsAuthenticated]


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all().order_by('nome')
    serializer_class = ProdutoSerializer
    permission_classes = [IsAuthenticated]


class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    queryset = MovimentacaoEstoque.objects.all().order_by('-data_movimento')
    serializer_class = MovimentacaoEstoqueSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        cliente_id = self.request.data.get('cliente')
        fornecedor_id = self.request.data.get('fornecedor')

        extra = {'usuario': self.request.user}

        if not cliente_id or cliente_id in ["", "null"]:
            extra['cliente'] = None

        if not fornecedor_id or fornecedor_id in ["", "null"]:
            extra['fornecedor'] = None

        serializer.save(**extra)
